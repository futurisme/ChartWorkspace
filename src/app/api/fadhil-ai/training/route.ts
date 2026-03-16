import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type RunPayload = {
  runId: string;
  strategy: string;
  battlegroundVersion: string;
  trainingModelVersion: string;
  datasetSize: number;
  epochs: number;
  learningRate: number;
  trainingLoss: number;
  validationLoss: number;
  qualityScore: number;
  modelAWeights: Record<string, number>;
  modelBWeights: Record<string, number>;
  logs: Array<{ epoch: number; trainingLoss: number; validationLoss: number; drift: number; capturedA?: number; capturedB?: number }>;
  compressedResults: string;
};

const MAX_AGE_MS = 1000 * 60 * 60 * 24;
const ACTIVE_BATTLEGROUND_VERSION = 'bg-v2-pawn-duel';
const ACTIVE_MODEL_VERSION = 'dual-pawn-v2';

function validatePayload(payload: RunPayload): string | null {
  if (!payload.runId || payload.runId.length < 10) return 'invalid runId';
  if (!payload.strategy || payload.strategy.length < 6) return 'invalid strategy';
  if (payload.battlegroundVersion !== ACTIVE_BATTLEGROUND_VERSION) return 'outdated battleground version';
  if (payload.trainingModelVersion !== ACTIVE_MODEL_VERSION) return 'outdated training model version';
  if (!Number.isFinite(payload.datasetSize) || payload.datasetSize < 200) return 'dataset too small';
  if (!Number.isFinite(payload.epochs) || payload.epochs < 80 || payload.epochs > 5000) return 'epochs out of range';
  if (!Number.isFinite(payload.learningRate) || payload.learningRate <= 0 || payload.learningRate > 1) return 'learningRate out of range';
  if (!Number.isFinite(payload.trainingLoss) || payload.trainingLoss <= 0 || payload.trainingLoss > 1) return 'trainingLoss invalid';
  if (!Number.isFinite(payload.validationLoss) || payload.validationLoss <= 0 || payload.validationLoss > 1) return 'validationLoss invalid';
  if (payload.validationLoss > 0.1) return 'validation loss too high';
  if (!Number.isFinite(payload.qualityScore) || payload.qualityScore < 80) return 'quality score too low';
  if (!Array.isArray(payload.logs) || payload.logs.length < 8) return 'logs are insufficient';
  if (!payload.compressedResults || payload.compressedResults.length < 12) return 'compressed results missing';
  return null;
}

function sanitizeLogs(logs: RunPayload['logs']) {
  return logs
    .filter((log) =>
      Number.isFinite(log.epoch)
      && Number.isFinite(log.trainingLoss)
      && Number.isFinite(log.validationLoss)
      && Number.isFinite(log.drift),
    )
    .slice(-260);
}

export async function GET() {
  try {
    const runs = await prisma.aiTrainingRun.findMany({
      where: {
        status: 'accepted',
        battlegroundVersion: ACTIVE_BATTLEGROUND_VERSION,
        trainingModelVersion: ACTIVE_MODEL_VERSION,
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        runId: true,
        strategy: true,
        battlegroundVersion: true,
        trainingModelVersion: true,
        datasetSize: true,
        epochs: true,
        learningRate: true,
        trainingLoss: true,
        validationLoss: true,
        qualityScore: true,
        modelAWeights: true,
        modelBWeights: true,
        logs: true,
        compressedResults: true,
        createdAt: true,
      },
    });

    const freshRuns = runs.filter((run) => Date.now() - new Date(run.createdAt).getTime() <= MAX_AGE_MS && run.qualityScore >= 80);

    return NextResponse.json(
      {
        ok: true,
        refreshed: true,
        activeVersions: { battlegroundVersion: ACTIVE_BATTLEGROUND_VERSION, trainingModelVersion: ACTIVE_MODEL_VERSION },
        total: freshRuns.length,
        runs: freshRuns,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        refreshed: false,
        total: 0,
        runs: [],
        error: `database read failed: ${message}`,
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RunPayload;
    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json({ ok: false, saved: false, reason: validationError }, { status: 400 });
    }

    const sanitizedLogs = sanitizeLogs(payload.logs);
    if (sanitizedLogs.length < 8) {
      return NextResponse.json({ ok: false, saved: false, reason: 'invalid logs after sanitization' }, { status: 400 });
    }

    const saved = await prisma.aiTrainingRun.upsert({
      where: { runId: payload.runId },
      update: {
        strategy: payload.strategy,
        battlegroundVersion: payload.battlegroundVersion,
        trainingModelVersion: payload.trainingModelVersion,
        datasetSize: payload.datasetSize,
        epochs: payload.epochs,
        learningRate: payload.learningRate,
        trainingLoss: payload.trainingLoss,
        validationLoss: payload.validationLoss,
        qualityScore: payload.qualityScore,
        modelAWeights: payload.modelAWeights,
        modelBWeights: payload.modelBWeights,
        logs: sanitizedLogs,
        compressedResults: payload.compressedResults,
        status: 'accepted',
      },
      create: {
        runId: payload.runId,
        strategy: payload.strategy,
        battlegroundVersion: payload.battlegroundVersion,
        trainingModelVersion: payload.trainingModelVersion,
        datasetSize: payload.datasetSize,
        epochs: payload.epochs,
        learningRate: payload.learningRate,
        trainingLoss: payload.trainingLoss,
        validationLoss: payload.validationLoss,
        qualityScore: payload.qualityScore,
        modelAWeights: payload.modelAWeights,
        modelBWeights: payload.modelBWeights,
        logs: sanitizedLogs,
        compressedResults: payload.compressedResults,
        status: 'accepted',
      },
      select: {
        runId: true,
        qualityScore: true,
        validationLoss: true,
        createdAt: true,
      },
    });

    await prisma.aiTrainingRun.deleteMany({
      where: {
        OR: [
          { status: { not: 'accepted' } },
          { qualityScore: { lt: 80 } },
          { validationLoss: { gt: 0.1 } },
          { createdAt: { lt: new Date(Date.now() - MAX_AGE_MS * 5) } },
          { battlegroundVersion: { not: ACTIVE_BATTLEGROUND_VERSION } },
          { trainingModelVersion: { not: ACTIVE_MODEL_VERSION } },
        ],
      },
    });

    return NextResponse.json({ ok: true, saved: true, run: saved }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, saved: false, reason: `database write failed: ${message}` }, { status: 500 });
  }
}

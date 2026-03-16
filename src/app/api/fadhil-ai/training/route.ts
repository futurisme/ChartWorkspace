import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type RunPayload = {
  runId: string;
  strategy: string;
  datasetSize: number;
  epochs: number;
  learningRate: number;
  trainingLoss: number;
  validationLoss: number;
  qualityScore: number;
  modelAWeights: Record<string, number>;
  modelBWeights: Record<string, number>;
  logs: Array<{ epoch: number; trainingLoss: number; validationLoss: number; drift: number }>;
};

const MAX_AGE_MS = 1000 * 60 * 60 * 24;

function validatePayload(payload: RunPayload): string | null {
  if (!payload.runId || payload.runId.length < 10) return 'invalid runId';
  if (!payload.strategy || payload.strategy.length < 6) return 'invalid strategy';
  if (!Number.isFinite(payload.datasetSize) || payload.datasetSize < 200) return 'dataset too small';
  if (!Number.isFinite(payload.epochs) || payload.epochs < 50 || payload.epochs > 5000) return 'epochs out of range';
  if (!Number.isFinite(payload.learningRate) || payload.learningRate <= 0 || payload.learningRate > 1) return 'learningRate out of range';
  if (!Number.isFinite(payload.trainingLoss) || payload.trainingLoss <= 0 || payload.trainingLoss > 1) return 'trainingLoss invalid';
  if (!Number.isFinite(payload.validationLoss) || payload.validationLoss <= 0 || payload.validationLoss > 1) return 'validationLoss invalid';
  if (payload.validationLoss > 0.12) return 'validation loss too high';
  if (!Number.isFinite(payload.qualityScore) || payload.qualityScore < 75) return 'quality score too low';
  if (!Array.isArray(payload.logs) || payload.logs.length < 6) return 'logs are insufficient';
  return null;
}

function sanitizeLogs(logs: RunPayload['logs']) {
  return logs
    .filter((log) => Number.isFinite(log.epoch) && Number.isFinite(log.trainingLoss) && Number.isFinite(log.validationLoss) && Number.isFinite(log.drift))
    .slice(-220);
}

export async function GET() {
  try {
    const runs = await prisma.aiTrainingRun.findMany({
      where: {
        status: 'accepted',
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        runId: true,
        strategy: true,
        datasetSize: true,
        epochs: true,
        learningRate: true,
        trainingLoss: true,
        validationLoss: true,
        qualityScore: true,
        modelAWeights: true,
        modelBWeights: true,
        logs: true,
        createdAt: true,
      },
    });

    const freshRuns = runs.filter((run) => Date.now() - new Date(run.createdAt).getTime() <= MAX_AGE_MS && run.qualityScore >= 75);

    return NextResponse.json(
      {
        ok: true,
        refreshed: true,
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
    if (sanitizedLogs.length < 6) {
      return NextResponse.json({ ok: false, saved: false, reason: 'invalid logs after sanitization' }, { status: 400 });
    }

    const saved = await prisma.aiTrainingRun.upsert({
      where: { runId: payload.runId },
      update: {
        strategy: payload.strategy,
        datasetSize: payload.datasetSize,
        epochs: payload.epochs,
        learningRate: payload.learningRate,
        trainingLoss: payload.trainingLoss,
        validationLoss: payload.validationLoss,
        qualityScore: payload.qualityScore,
        modelAWeights: payload.modelAWeights,
        modelBWeights: payload.modelBWeights,
        logs: sanitizedLogs,
        status: 'accepted',
      },
      create: {
        runId: payload.runId,
        strategy: payload.strategy,
        datasetSize: payload.datasetSize,
        epochs: payload.epochs,
        learningRate: payload.learningRate,
        trainingLoss: payload.trainingLoss,
        validationLoss: payload.validationLoss,
        qualityScore: payload.qualityScore,
        modelAWeights: payload.modelAWeights,
        modelBWeights: payload.modelBWeights,
        logs: sanitizedLogs,
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
          { qualityScore: { lt: 75 } },
          { createdAt: { lt: new Date(Date.now() - MAX_AGE_MS * 7) } },
        ],
      },
    });

    return NextResponse.json({ ok: true, saved: true, run: saved }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, saved: false, reason: `database write failed: ${message}` }, { status: 500 });
  }
}

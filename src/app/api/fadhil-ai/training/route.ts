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
  logs: Array<{ epoch: number; trainingLoss: number; validationLoss: number; drift: number; capturedA?: number; capturedB?: number; stuckRisk?: number }>;
  compressedResults: string;
  compressionMode?: string;
  compressionParams?: { quantization: number; radix: number; deltaEncoding: boolean; chunkSize?: number; imageCodec?: string; imageQuality?: number };
  baselineDataset?: { samples: number; source: string; targetParameters?: number; activeParameters?: number };
  learningMemory?: { positivePatterns: number; negativePatterns: number };
};

const MAX_AGE_MS = 1000 * 60 * 60 * 24;
const ACTIVE_BATTLEGROUND_VERSION = 'bg-v4-shooter-arena';
const ACTIVE_MODEL_VERSION = 'shooter-1v1-v1';

let cachedRuns: { at: number; runs: unknown[] } | null = null;

function validatePayload(payload: RunPayload): string | null {
  if (!payload.runId || payload.runId.length < 10) return 'invalid runId';
  if (!payload.strategy || payload.strategy.length < 6) return 'invalid strategy';
  if (payload.battlegroundVersion !== ACTIVE_BATTLEGROUND_VERSION) return 'outdated battleground version';
  if (payload.trainingModelVersion !== ACTIVE_MODEL_VERSION) return 'outdated training model version';
  if (!Number.isFinite(payload.datasetSize) || payload.datasetSize < 3000) return 'dataset too small';
  if (!Number.isFinite(payload.epochs) || payload.epochs < 1 || payload.epochs > 5000) return 'epochs out of range';
  if (!Number.isFinite(payload.learningRate) || payload.learningRate <= 0 || payload.learningRate > 1) return 'learningRate out of range';
  if (!Number.isFinite(payload.trainingLoss) || payload.trainingLoss <= 0 || payload.trainingLoss > 1) return 'trainingLoss invalid';
  if (!Number.isFinite(payload.validationLoss) || payload.validationLoss <= 0 || payload.validationLoss > 1) return 'validationLoss invalid';
  if (payload.validationLoss > 0.45) return 'validation loss too high';
  if (!Number.isFinite(payload.qualityScore) || payload.qualityScore < 20) return 'quality score too low';
  if (!Array.isArray(payload.logs) || payload.logs.length < 8) return 'logs are insufficient';
  if (!payload.compressedResults || payload.compressedResults.length < 12) return 'compressed results missing';
  if (payload.compressionMode && payload.compressionMode.length < 4) return 'compression mode invalid';
  if (payload.compressionParams && (!Number.isFinite(payload.compressionParams.quantization) || payload.compressionParams.quantization < 1000)) return 'compression params invalid';
  if (payload.baselineDataset) {
    const { samples, targetParameters } = payload.baselineDataset;
    if (!Number.isFinite(samples) || samples < 3000) return 'baseline dataset too small';
    if (!Number.isFinite(targetParameters) || (targetParameters ?? 0) < 80000) return 'target parameters too small';
  }
  if (payload.learningMemory) {
    if (!Number.isFinite(payload.learningMemory.positivePatterns) || payload.learningMemory.positivePatterns < 0) return 'learning memory invalid';
    if (!Number.isFinite(payload.learningMemory.negativePatterns) || payload.learningMemory.negativePatterns < 0) return 'learning memory invalid';
  }
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
    if (cachedRuns && Date.now() - cachedRuns.at < 12_000) {
      return NextResponse.json({
        ok: true,
        refreshed: false,
        activeVersions: { battlegroundVersion: ACTIVE_BATTLEGROUND_VERSION, trainingModelVersion: ACTIVE_MODEL_VERSION },
        total: cachedRuns.runs.length,
        runs: cachedRuns.runs,
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

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

    const freshRuns = runs.filter((run) => Date.now() - new Date(run.createdAt).getTime() <= MAX_AGE_MS && run.qualityScore >= 50);
    cachedRuns = { at: Date.now(), runs: freshRuns };

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
          { qualityScore: { lt: 20 } },
          { validationLoss: { gt: 0.45 } },
          { createdAt: { lt: new Date(Date.now() - MAX_AGE_MS * 5) } },
          { battlegroundVersion: { not: ACTIVE_BATTLEGROUND_VERSION } },
          { trainingModelVersion: { not: ACTIVE_MODEL_VERSION } },
        ],
      },
    });

    cachedRuns = null;
    return NextResponse.json({ ok: true, saved: true, run: saved }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('too many clients')) {
      return NextResponse.json({ ok: false, saved: false, reason: `database write failed: ${message}`, retryAfterMs: 60000 }, { status: 503 });
    }
    return NextResponse.json({ ok: false, saved: false, reason: `database write failed: ${message}` }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const runId = new URL(request.url).searchParams.get('runId');
    if (!runId) return NextResponse.json({ ok: false, deleted: false, reason: 'runId required' }, { status: 400 });

    const deleted = await prisma.aiTrainingRun.deleteMany({ where: { runId } });
    cachedRuns = null;
    return NextResponse.json({ ok: true, deleted: deleted.count > 0, count: deleted.count }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, deleted: false, reason: `database delete failed: ${message}` }, { status: 500 });
  }
}

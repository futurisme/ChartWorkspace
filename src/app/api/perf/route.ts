import { NextResponse } from 'next/server';
import { ingestPerfMetric, PerfPayload, PerfServiceError } from '@/features/perf/server/perf-ingest-service';

const PERF_INGEST_ENABLED = Boolean(process.env.DATABASE_URL);

export async function POST(request: Request) {
  if (!PERF_INGEST_ENABLED) {
    return NextResponse.json({ ok: true, skipped: 'perf ingest disabled (no DATABASE_URL)' });
  }

  try {
    const body = (await request.json()) as PerfPayload;
    await ingestPerfMetric(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (error instanceof PerfServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to ingest perf metric', error);
    return NextResponse.json({ error: 'Failed to ingest metric' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { ingestPerfMetric, PerfPayload, PerfServiceError } from '@/features/perf/server/perf-ingest-service';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PerfPayload;
    await ingestPerfMetric(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PerfServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to ingest perf metric', error);
    return NextResponse.json({ error: 'Failed to ingest metric' }, { status: 500 });
  }
}

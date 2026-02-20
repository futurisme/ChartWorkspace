import { NextResponse } from 'next/server';
import { ingestPerfMetric, PerfPayload, PerfServiceError } from '@/features/perf/server/perf-ingest-service';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (!rawBody.trim()) {
      return NextResponse.json({ error: 'Empty perf payload' }, { status: 400 });
    }

    const body = JSON.parse(rawBody) as PerfPayload;
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

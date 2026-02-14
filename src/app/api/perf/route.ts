import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type PerfPayload = {
  metricName?: string;
  metricId?: string;
  value?: number;
  rating?: string;
  navigationType?: string;
  route?: string;
  routeType?: string;
  pageUrl?: string;
  metadata?: Prisma.InputJsonValue;
  recordedAt?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PerfPayload;

    if (!body.metricName || typeof body.value !== 'number' || !body.route) {
      return NextResponse.json({ error: 'Invalid perf payload' }, { status: 400 });
    }

    await prisma.perfMetric.create({
      data: {
        metricName: body.metricName,
        metricId: body.metricId ?? null,
        value: body.value,
        rating: body.rating ?? null,
        navigationType: body.navigationType ?? null,
        route: body.route,
        routeType: body.routeType ?? (body.route.startsWith('/editor') ? 'editor' : 'non-editor'),
        pageUrl: body.pageUrl ?? null,
        metadata: body.metadata ?? Prisma.JsonNull,
        recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to ingest perf metric', error);
    return NextResponse.json({ error: 'Failed to ingest metric' }, { status: 500 });
  }
}

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type PerfPayload = {
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

export class PerfServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function ingestPerfMetric(payload: PerfPayload) {
  if (!payload.metricName || typeof payload.value !== 'number' || !payload.route) {
    throw new PerfServiceError('Invalid perf payload', 400);
  }

  await prisma.perfMetric.create({
    data: {
      metricName: payload.metricName,
      metricId: payload.metricId ?? null,
      value: payload.value,
      rating: payload.rating ?? null,
      navigationType: payload.navigationType ?? null,
      route: payload.route,
      routeType: payload.routeType ?? (payload.route.startsWith('/editor') ? 'editor' : 'non-editor'),
      pageUrl: payload.pageUrl ?? null,
      metadata: payload.metadata ?? Prisma.JsonNull,
      recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : new Date(),
    },
  });
}

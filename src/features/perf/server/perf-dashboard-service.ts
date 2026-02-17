import { prisma } from '@/lib/prisma';

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;

export function parseDashboardDays(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DAYS;
  }

  return Math.min(parsed, MAX_DAYS);
}

export async function getPerfDashboardSummary(days: number) {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const grouped = await prisma.perfMetric.groupBy({
    by: ['routeType', 'metricName'],
    where: { recordedAt: { gte: from } },
    _avg: { value: true },
    _count: {
      _all: true,
      rating: true,
    },
  });

  const poorGrouped = await prisma.perfMetric.groupBy({
    by: ['routeType', 'metricName'],
    where: {
      recordedAt: { gte: from },
      rating: 'poor',
    },
    _count: {
      _all: true,
    },
  });

  const poorByKey = new Map(
    poorGrouped.map((item) => [`${item.routeType ?? 'unknown'}::${item.metricName}`, item._count._all])
  );

  const summary = grouped
    .map((item) => {
      const routeType = item.routeType ?? 'unknown';
      const key = `${routeType}::${item.metricName}`;
      const samples = item._count._all;
      const poorCount = poorByKey.get(key) ?? 0;

      return {
        routeType,
        metricName: item.metricName,
        samples,
        averageValue: item._avg.value ?? 0,
        poorRate: samples === 0 ? 0 : poorCount / samples,
      };
    })
    .sort((a, b) => b.samples - a.samples);

  return {
    rangeDays: days,
    totalSamples: summary.reduce((acc, item) => acc + item.samples, 0),
    summary,
  };
}

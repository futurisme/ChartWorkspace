import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Number(url.searchParams.get('days') ?? '7');
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const metrics = await prisma.perfMetric.findMany({
    where: { recordedAt: { gte: from } },
    select: {
      metricName: true,
      routeType: true,
      value: true,
      rating: true,
      recordedAt: true,
    },
    orderBy: { recordedAt: 'desc' },
  });

  const grouped = metrics.reduce<Record<string, { samples: number; averageValue: number; poorCount: number }>>((acc, metric) => {
    const key = `${metric.routeType}::${metric.metricName}`;
    const item = acc[key] ?? { samples: 0, averageValue: 0, poorCount: 0 };
    item.samples += 1;
    item.averageValue += metric.value;
    if (metric.rating === 'poor') {
      item.poorCount += 1;
    }
    acc[key] = item;
    return acc;
  }, {});

  const summary = Object.entries(grouped).map(([key, value]) => {
    const [routeType, metricName] = key.split('::');
    return {
      routeType,
      metricName,
      samples: value.samples,
      averageValue: value.samples === 0 ? 0 : value.averageValue / value.samples,
      poorRate: value.samples === 0 ? 0 : value.poorCount / value.samples,
    };
  });

  return NextResponse.json({
    rangeDays: days,
    totalSamples: metrics.length,
    summary,
  });
}

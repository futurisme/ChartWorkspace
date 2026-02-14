import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const threshold = Number(process.env.PERF_REGRESSION_THRESHOLD ?? '0.1');

const trackedMetrics = ['LCP', 'CLS', 'INP', 'TTFB', 'LONG_TASK'];

function startOfWindow(daysAgoStart, daysAgoEnd) {
  const now = new Date();
  const start = new Date(now.getTime() - daysAgoStart * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() - daysAgoEnd * 24 * 60 * 60 * 1000);
  return { start, end };
}

async function averageForWindow(metricName, routeType, window) {
  const rows = await prisma.perfMetric.findMany({
    where: {
      metricName,
      routeType,
      recordedAt: {
        gte: window.end,
        lt: window.start,
      },
    },
    select: { value: true },
  });

  if (rows.length === 0) {
    return null;
  }

  return rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
}

async function main() {
  const currentWeek = startOfWindow(0, 7);
  const previousWeek = startOfWindow(7, 14);
  const routeTypes = ['editor', 'non-editor'];
  const regressions = [];

  for (const routeType of routeTypes) {
    for (const metricName of trackedMetrics) {
      const [current, previous] = await Promise.all([
        averageForWindow(metricName, routeType, currentWeek),
        averageForWindow(metricName, routeType, previousWeek),
      ]);

      if (current === null || previous === null || previous === 0) {
        continue;
      }

      const changeRatio = (current - previous) / previous;
      if (changeRatio > threshold) {
        regressions.push({ routeType, metricName, current, previous, changeRatio });
      }
    }
  }

  if (regressions.length > 0) {
    console.error('Week-over-week web performance regression detected:');
    for (const regression of regressions) {
      console.error(
        `${regression.routeType} ${regression.metricName}: previous=${regression.previous.toFixed(2)} current=${regression.current.toFixed(2)} delta=${(regression.changeRatio * 100).toFixed(1)}%`
      );
    }
    process.exit(1);
  }

  console.log('No week-over-week regressions above threshold.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

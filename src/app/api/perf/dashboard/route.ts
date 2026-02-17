import { NextResponse } from 'next/server';
import { getPerfDashboardSummary, parseDashboardDays } from '@/features/perf/server/perf-dashboard-service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = parseDashboardDays(url.searchParams.get('days'));
  const summary = await getPerfDashboardSummary(days);

  return NextResponse.json(summary);
}

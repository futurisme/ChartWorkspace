'use client';

import { usePathname } from 'next/navigation';
import { PerformanceMetrics } from '@/components/performance-metrics';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';

const ISOLATED_GAME_ROUTE = '/game';

export function GlobalRuntime() {
  const pathname = usePathname();

  if (pathname === ISOLATED_GAME_ROUTE || pathname.startsWith(`${ISOLATED_GAME_ROUTE}/`)) {
    return null;
  }

  return (
    <>
      <ServiceWorkerRegistration />
      <PerformanceMetrics />
    </>
  );
}

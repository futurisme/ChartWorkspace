'use client';

import { useEffect } from 'react';
import { onCLS, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

type NetworkInformation = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

type DeviceMemoryNavigator = Navigator & {
  connection?: NetworkInformation;
  deviceMemory?: number;
};

const LONG_TASK_THRESHOLD_MS = 50;

function classifyRoute(pathname: string) {
  return pathname.startsWith('/editor') ? 'editor' : 'non-editor';
}

function sendPerfMetric(metric: Metric | { name: 'LONG_TASK'; value: number; id: string; rating: 'good' | 'needs-improvement' | 'poor'; navigationType: string; attribution?: Record<string, unknown> }) {
  const connection = (navigator as DeviceMemoryNavigator).connection;
  const payload = {
    metricName: metric.name,
    metricId: metric.id,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    route: window.location.pathname,
    routeType: classifyRoute(window.location.pathname),
    pageUrl: window.location.href,
    metadata: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      deviceMemoryGb: (navigator as DeviceMemoryNavigator).deviceMemory,
      connection: connection
        ? {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData,
          }
        : undefined,
      attribution: 'attribution' in metric ? metric.attribution : undefined,
    },
    recordedAt: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  if (typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/perf', blob);
    return;
  }

  void fetch('/api/perf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  });
}

export function PerformanceMetrics() {
  useEffect(() => {
    onLCP(sendPerfMetric);
    onCLS(sendPerfMetric);
    onINP(sendPerfMetric);
    onTTFB(sendPerfMetric);

    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.duration < LONG_TASK_THRESHOLD_MS) {
          continue;
        }

        sendPerfMetric({
          name: 'LONG_TASK',
          id: `${entry.startTime}-${entry.duration}`,
          value: entry.duration,
          rating: entry.duration > 200 ? 'poor' : entry.duration > 100 ? 'needs-improvement' : 'good',
          navigationType: 'navigate',
          attribution: {
            startTime: entry.startTime,
            entryType: entry.entryType,
          },
        });
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    return () => observer.disconnect();
  }, []);

  return null;
}

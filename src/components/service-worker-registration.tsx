'use client';

import { useEffect } from 'react';

const SW_KILL_SWITCH_ENABLED = process.env.NEXT_PUBLIC_DISABLE_SW === '1';

async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheKeys = await window.caches.keys();
    await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
  }
}

function isSecureContextForSw() {
  if (window.location.protocol === 'https:') {
    return true;
  }

  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (SW_KILL_SWITCH_ENABLED) {
      void unregisterServiceWorkers();
      return;
    }

    if (!isSecureContextForSw()) {
      return;
    }

    void navigator.serviceWorker.register('/sw.js');
  }, []);

  return null;
}

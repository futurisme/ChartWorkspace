const SW_VERSION = 'v2';
const CACHE_PREFIX = 'chartworkspace';
const STATIC_CACHE = `${CACHE_PREFIX}-static-${SW_VERSION}`;
const MAP_METADATA_CACHE = `${CACHE_PREFIX}-map-metadata-${SW_VERSION}`;
const MANAGED_CACHES = [STATIC_CACHE, MAP_METADATA_CACHE];

const ALLOWED_STATIC_PATHS = [
  '/_next/static/',
  '/fonts/',
  '/favicon',
  '/icons/',
  '/icon',
  '/apple-touch-icon',
  '/manifest',
];

const isCacheableResponse = (response) => {
  if (!response || !response.ok || response.type !== 'basic') {
    return false;
  }

  const cacheControl = response.headers.get('Cache-Control')?.toLowerCase() ?? '';
  return !cacheControl.includes('no-store') && !cacheControl.includes('private');
};

const isStaticAssetRequest = (requestUrl) => {
  const { pathname } = requestUrl;
  return ALLOWED_STATIC_PATHS.some((pathPrefix) => pathname.startsWith(pathPrefix));
};

const isMapMetadataRequest = (request) => {
  if (request.method !== 'GET') {
    return false;
  }

  const requestUrl = new URL(request.url);
  return requestUrl.origin === self.location.origin && /^\/api\/maps(?:\/[^/]+)?$/.test(requestUrl.pathname);
};

const isSaveOrUpdateRequest = (request) => {
  if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
    return false;
  }

  const requestUrl = new URL(request.url);
  return requestUrl.origin === self.location.origin && (requestUrl.pathname === '/api/maps/save' || requestUrl.pathname === '/api/maps');
};

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(`${CACHE_PREFIX}-`) && !MANAGED_CACHES.includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
    if (isSaveOrUpdateRequest(request)) {
      // Network-first: never serve writes from cache and never cache write responses.
      event.respondWith(fetch(request));
    }
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (isStaticAssetRequest(requestUrl)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
          return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (isCacheableResponse(networkResponse)) {
          await cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      })()
    );
    return;
  }

  if (isMapMetadataRequest(request)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(MAP_METADATA_CACHE);
        const cachedResponse = await cache.match(request);

        const networkPromise = fetch(request)
          .then(async (response) => {
            if (isCacheableResponse(response)) {
              await cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => null);

        if (cachedResponse) {
          event.waitUntil(networkPromise);
          return cachedResponse;
        }

        const networkResponse = await networkPromise;
        if (networkResponse) {
          return networkResponse;
        }

        return new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      })()
    );
  }
});

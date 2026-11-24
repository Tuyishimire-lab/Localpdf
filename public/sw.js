const CACHE_VERSION = 'v3';
const STATIC_CACHE = `localpdf-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `localpdf-runtime-${CACHE_VERSION}`;
const PAGES_CACHE = `localpdf-pages-${CACHE_VERSION}`;
const EXPECTED_CACHES = new Set([STATIC_CACHE, RUNTIME_CACHE, PAGES_CACHE]);

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/pdf/pdf.worker.min.mjs',
  '/wasm/qpdf.wasm',
  '/tesseract/worker.min.js',
  '/tesseract/lang-data/eng.traineddata.gz',
];

const IMMUTABLE_PREFIXES = [
  '/_next/static/',
  '/wasm/',
  '/pdf/',
  '/tesseract/',
  '/fonts/',
  '/icons/',
];

function offlineResponse(isNavigate) {
  if (isNavigate) {
    return new Response(
      '<!doctype html><html><head><meta charset="utf-8"><title>LocalPDF Offline</title></head><body style="font-family:sans-serif;background:#070714;color:#f8fafc;display:grid;place-items:center;min-height:100vh;text-align:center;padding:2rem"><div><h1>You are offline</h1><p>This page was not cached yet. Visit the home page to use cached PDF tools offline.</p><a href="/" style="color:#ff4757">Return to LocalPDF</a></div></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

// Install Event - Resilient precache of shell + local PDF/WASM/OCR runtimes
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old versioned caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!EXPECTED_CACHES.has(key)) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

const IS_LOCALHOST =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '[::1]';

// Fetch Event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/webpack-hmr') || url.pathname.startsWith('/__nextjs_')) return;
  if (IS_LOCALHOST && url.pathname.startsWith('/_next/')) return;

  // 1. Network-First for HTML page navigations (prevents deploy chunk skew)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const cachedHome = await caches.match('/');
          if (cachedHome) return cachedHome;
          return offlineResponse(true);
        })
    );
    return;
  }

  // 2. Cache-First for immutable chunks, WASM, workers, fonts, icons
  if (IMMUTABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => offlineResponse(false));
      })
    );
    return;
  }

  // 3. Stale-While-Revalidate for remaining same-origin GETs
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || offlineResponse(false));

      return cached || networkFetch;
    })
  );
});

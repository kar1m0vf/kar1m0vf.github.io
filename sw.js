const CACHE_VERSION = 'portfolio-v13';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './about.html',
  './projects.html',
  './contact.html',
  './manifest.webmanifest',
  './robots.txt',
  './sitemap.xml',
  './assets/css/base.css',
  './assets/css/home.css',
  './assets/css/about.css',
  './assets/css/projects.css',
  './assets/css/shared-effects.css',
  './assets/css/shared-responsive.css',
  './assets/js/main.js',
  './assets/js/site-config.js',
  './assets/js/ambient-particles-worker.js',
  './assets/js/modules/command-palette.js',
  './assets/js/modules/contact-form.js',
  './assets/js/modules/quality-evidence.js',
  './assets/data/quality-evidence.json',
  './assets/icons/favicon.ico',
  './assets/icons/favicon-16x16.png',
  './assets/icons/favicon-32x32.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon.svg',
  './assets/icons/og-image.png',
  './assets/icons/pwa-192.png',
  './assets/icons/pwa-512.png',
  './assets/icons/pwa-192.svg',
  './assets/icons/pwa-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

const isNavigationRequest = (request) => {
  if (request.mode === 'navigate') {
    return true;
  }
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
};

const staleWhileRevalidate = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkFetch.catch(() => {});
    return cached;
  }

  const response = await networkFetch;
  if (response) {
    return response;
  }

  throw new Error('Network and cache both failed');
};

const networkFirst = async (request) => {
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const staticCache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      runtimeCache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = (await runtimeCache.match(request)) || (await staticCache.match(request));
    if (cached) {
      return cached;
    }
    const fallback = await staticCache.match('./index.html');
    if (fallback) {
      return fallback;
    }
    throw error;
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);
  const sameOrigin = requestUrl.origin === self.location.origin;

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (!sameOrigin) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  const staticDestinations = new Set(['script', 'style', 'worker', 'font', 'image', 'manifest']);
  if (staticDestinations.has(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

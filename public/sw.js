// LOT 10 — the SW must work under a GitHub Pages sub-path. The scope is the
// directory that serves the SW (e.g. https://<acct>.github.io/<repo>/), so we
// derive the base path at runtime instead of assuming domain root. The precache
// step (scripts/precache-sw.mjs) injects each hashed asset already base-prefixed.
const BASE = (self.registration?.scope || '/').replace(/\/?$/, '/');
const CACHE_NAME = 'sporttrack-cache-v7';
const ASSETS_TO_CACHE = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}favicon.png`,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`,
  /*__PRECACHE_ASSETS__*/
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Vite dev endpoints (transformed source, optimized deps, virtual modules)
  // must NEVER be served from the app cache: a stale cached transform that
  // outlives its dependencies produced a duplicated React instance and the
  // "Invalid hook call" black screen. When online they always hit the network.
  const isDevEndpoint =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/node_modules/.vite/') ||
      url.pathname.includes('/@id/') ||
      url.pathname.includes('/@fs/') ||
      /\?import$/.test(url.search) ||
      url.pathname.startsWith('/src/'));

  // Navigation requests: Stale-While-Revalidate (fast loads, offline shell).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || caches.match(`${BASE}index.html`));
        if (cachedResponse) {
          // Serve the cached shell immediately, refresh it in the background.
          networkFetch.catch(() => {});
          return cachedResponse;
        }
        return networkFetch;
      })
    );
    return;
  }

  // Non-navigation GETs (JS/CSS chunks, icons, ...): Network-First with cache
  // fallback. Hashed builds make the network always authoritative, so we never
  // serve a stale module while the app runs; the cache only covers offline.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          !isDevEndpoint
        ) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

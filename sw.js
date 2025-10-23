const CACHE_NAME = 'sac-rapido-cache-v2';
const FALLBACK_URL = './index.html';
const PRECACHE_URLS = [
  './',
  FALLBACK_URL,
  './styles.css',
  './app.js',
  './firebase-config.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            (response.type === 'basic' || response.type === 'cors')
          ) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              })
              .catch(() => {});
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate' || event.request.destination === 'document') {
            return caches.match(FALLBACK_URL);
          }
          return caches.match(event.request);
        });
    })
  );
});

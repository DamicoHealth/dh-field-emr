// ==========================================
// DH Field EMR — Service Worker (Offline-First)
// ==========================================
const CACHE_NAME = 'dh-emr-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/pwa-responsive.css',
  '/pwa-sync.js',
  '/demo-shim.js',
  '/demo-data.js',
  '/helpers.js',
  '/state.js',
  '/labs.js',
  '/med-builder.js',
  '/dx-presets.js',
  '/rx-presets.js',
  '/records.js',
  '/encounter.js',
  '/analytics.js',
  '/formulary.js',
  '/config.js',
  '/csv-export.js',
  '/form-generator.js',
  '/scheduling.js',
  '/sync-ui.js',
  '/admin.js',
  '/setup-wizard.js',
  '/idb-storage.js',
  '/pwa-touch.js',
  '/app.js',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Install — cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching all assets');
      return cache.addAll(ASSETS);
    }).then(() => {
      // Activate immediately, don't wait for old SW to finish
      return self.skipWaiting();
    })
  );
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            })
      );
    }).then(() => {
      // Take control of all open tabs immediately
      return self.clients.claim();
    })
  );
});

// Fetch — cache-first, network fallback, background update
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version immediately
      if (cachedResponse) {
        // Background update: fetch fresh copy and update cache
        event.waitUntil(
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {
            // Network unavailable — that's fine, we served from cache
          })
        );
        return cachedResponse;
      }

      // Not in cache — try network
      return fetch(event.request).then((networkResponse) => {
        // Cache successful responses for future offline use
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Both cache and network failed — return offline fallback for HTML
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

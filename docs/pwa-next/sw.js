// ==========================================
// DH Field EMR — Service Worker (Offline-First)
// ==========================================
// Bump cache version on every release so existing PWAs pick up fixes.
const CACHE_NAME = 'dh-emr-v8-2.2.1-role-fix-build20260529175700';
const BASE = self.registration.scope;
const ASSET_NAMES = [
  "",
  "admin.js",
  "analytics.js",
  "app.js",
  "config.js",
  "csv-export.js",
  "dx-presets.js",
  "encounter.js",
  "form-builder.js",
  "form-generator.js",
  "form-schema.js",
  "formulary.js",
  "helpers.js",
  "icon-192.png",
  "icon-512.png",
  "icon.svg",
  "idb-storage.js",
  "index.html",
  "labs.js",
  "manifest.json",
  "med-builder.js",
  "platform.js",
  "pwa-responsive.css",
  "pwa-sync.js",
  "pwa-touch.js",
  "records.js",
  "rx-presets.js",
  "scheduling.js",
  "setup-wizard.js",
  "state.js",
  "styles.css",
  "sync-ui.js"
];
const ASSETS = ASSET_NAMES.map(n => BASE + n);

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
        // Both cache and network failed — return offline fallback for HTML.
        // Use the scope-prefixed URL so this works on GitHub Pages
        // (e.g. /dh-emr-app/index.html), and guard against a null accept header.
        const accept = event.request.headers.get('accept') || '';
        if (accept.includes('text/html')) {
          return caches.match(BASE + 'index.html');
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

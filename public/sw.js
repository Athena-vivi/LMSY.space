// Dynamic cache name with build timestamp
const CACHE_NAME = `lmsy-v${Date.now()}`;

// Assets to cache immediately on install
const urlsToCache = [
  '/',
  '/profiles',
  '/gallery',
  '/projects',
  '/schedule',
  '/manifest.json',
  '/lmsy-logo.png',
  '/lmsy-main-visual.png',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version:', CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(urlsToCache);
    })
  );

  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Fetch event - network first, cache fallback strategy
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Open cache and store the response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            console.log('[SW] Serving from cache:', event.request.url);
            return response;
          }

          // If page not in cache, return offline page or error
          if (event.request.destination === 'document') {
            return caches.match('/');
          }

          throw new Error('Network request failed and no cache available');
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new version:', CACHE_NAME);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches (caches that don't match the current CACHE_NAME)
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control of all pages immediately
  return self.clients.claim();
});

// Message handler for manual updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const CACHE_NAME = 'musyfi-v2';
const AUDIO_CACHE = 'musyfi-audio-v2';

// Install
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch — serve cached audio when offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache audio files
  if (url.pathname.startsWith('/audio/') || event.request.destination === 'audio') {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }).catch(() => new Response('Audio unavailable offline', { status: 503 }))
    );
    return;
  }
});

// Background sync for import processing
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

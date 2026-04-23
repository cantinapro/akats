/* A-Kats Service Worker
   - Caches the shell for offline use
   - Network-first for API calls, cache-first for static assets
*/
const CACHE = 'akats-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache Supabase calls — always go live
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) {
    return; // browser handles it
  }

  // Cache-first for everything else (Tailwind, fonts, our files)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((resp) => {
        // Don't cache non-GET or errors
        if (e.request.method !== 'GET' || !resp || resp.status !== 200) return resp;
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return resp;
      }).catch(() => cached);
    })
  );
});

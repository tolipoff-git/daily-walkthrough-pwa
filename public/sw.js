const CACHE_NAME = 'ehs-pwa-__CACHE_STAMP__';
const STATIC_ASSETS = /* BUILD_ASSETS */ [];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('ehs-pwa-') && k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/photo/')) return;
  if (event.request.mode === 'navigate') {
    // Always serve the shell belonging to the controlling worker; HTML must
    // never reference a newer bundle absent from this offline cache.
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const shell = await cache.match('/index.html', { ignoreVary: true });
      return shell ? new Response(shell.body, { status: 200, headers: shell.headers }) : fetch(event.request);
    }));
  } else if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => (await cache.match(url.pathname, { ignoreVary: true })) || fetch(event.request)));
  }
});

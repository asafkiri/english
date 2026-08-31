const CACHE_PREFIX = 'speak-english-';
const CACHE_NAME = 'speak-english-v2';
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(
        keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))
      )),
      self.clients.claim()
    ])
  );
});

self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      try{
        const response = await fetch(event.request);
        if(response && response.ok){
          try{
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, response.clone());
          }catch(cacheError){
            // A cache quota/write failure must never hide a valid network response.
          }
        }
        return response;
      }catch(e){
        const cached = await caches.match(event.request);
        if(cached) return cached;
        if(event.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }
    })()
  );
});

const CACHE_NAME = "agromarket-v1";
const urlsToCache = [
  "/",
  "/static/css/styles.css",
  "/static/js/app.js",
  "/static/icons/icon-192x192.png",
  "/static/icons/icon-512x512.png"
];

// Instalar y cachear
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activar y limpiar caché viejo
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Interceptar peticiones
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

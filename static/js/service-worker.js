const CACHE_NAME = "agromarket-cache-v2";
const urlsToCache = [
  "/",
  "/catalogo_offline",
  "/static/css/estilos_vendedor.css",
  "/static/js/app.js",
  "/static/images/icon-192.png",
  "/static/images/icon-512.png"
];

// Instalar y guardar en caché
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Interceptar peticiones
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

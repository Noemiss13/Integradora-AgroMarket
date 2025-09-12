const CACHE_NAME = "agromarket-comprador-v1";

// Páginas y recursos a cachear
const urlsToCache = [
  "/comprador/panel",
  "/comprador/productos",
  "/static/css/estilos_comprador.css",
  "/static/js/comprador.js",
  "/static/images/icon-192.png",
  "/static/images/icon-512.png"
];

// Instalar y guardar en caché
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activar el service worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker activo y listo para offline");
  event.waitUntil(self.clients.claim());
});

// Interceptar peticiones
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Actualiza cache con la última versión
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => {
        // Offline: devuelve del cache
        return caches.match(event.request)
          .then((response) => {
            if (response) return response;
            // Fallback básico si no hay en cache
            return caches.match("/comprador/panel");
          });
      })
  );
});

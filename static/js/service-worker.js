const CACHE_NAME = "agromarket-comprador-v1";

// Páginas y recursos a cachear
const urlsToCache = [
  "/comprador/panel",
  "/comprador/productos",
  "/static/css/estilos_comprador.css",
  "/static/js/comprador.js",
  "/static/images/icon-48.png",
  "/static/images/icon-72.png",
  "/static/images/icon-144.png",
  "/static/images/icon-192.png",
  "/static/images/icon-512.png",
  "/static/images/logo.png"
];

// URLs que no deben permitir acciones offline
const OFFLINE_RESTRICTED = [
  "/auth/register",
  "/auth/login",
  "/vendedor/agregar_producto",
  "/vendedor/editar_producto",
  "/vendedor/editar_perfil"
];

// Instalar: cachea los recursos esenciales
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activar: toma control inmediatamente
self.addEventListener("activate", (event) => {
  console.log("Service Worker activo y listo para offline");
  event.waitUntil(self.clients.claim());
});

// Estrategia Network First con fallback cache y control offline
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
        const url = new URL(event.request.url);

        // Si la URL es restringida offline, redirige al panel
        if (OFFLINE_RESTRICTED.includes(url.pathname)) {
          return caches.match("/comprador/panel");
        }

        // Intenta devolver recurso cacheado
        return caches.match(event.request)
          .then((response) => {
            if (response) return response;

            // Fallback final al panel si no hay nada en cache
            return caches.match("/comprador/panel");
          });
      })
  );
});


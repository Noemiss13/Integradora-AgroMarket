// ===== Service Worker - AgroMarket PWA =====

const CACHE_NAME = "agromarket-v1";

// Recursos para cachear por tipo de usuario
const urlsToCacheComprador = [
  "/comprador/panel",
  "/comprador/productos",
  "/static/css/estilos_comprador.css",
  "/static/js/comprador.js",
  "/static/images/logo.png",
  "/static/images/icon-48.png",
  "/static/images/icon-72.png",
  "/static/images/icon-144.png",
  "/static/images/icon-192.png",
  "/static/images/icon-512.png"
];

const urlsToCacheVendedor = [
  "/vendedor/panel",
  "/vendedor/productos",
  "/static/css/estilos_vendedor.css",
  "/static/js/vendedor.js",
  "/static/images/logo.png",
  "/static/images/icon-48.png",
  "/static/images/icon-72.png",
  "/static/images/icon-144.png",
  "/static/images/icon-192.png",
  "/static/images/icon-512.png"
];

// URLs que no deben permitir acciones offline
const OFFLINE_RESTRICTED = [
  "/auth/register",
  "/auth/login",
  "/vendedor/agregar_producto",
  "/vendedor/editar_producto",
  "/vendedor/editar_perfil"
];

// ===== Instalación: cachear recursos esenciales =====
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open("comprador-cache").then((cache) => cache.addAll(urlsToCacheComprador)),
      caches.open("vendedor-cache").then((cache) => cache.addAll(urlsToCacheVendedor))
    ])
  );
  self.skipWaiting();
});

// ===== Activación =====
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker activo y listo para offline");
  event.waitUntil(self.clients.claim());
});

// ===== Estrategia Network First con fallback cache =====
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Control de rutas restringidas offline
  if (OFFLINE_RESTRICTED.includes(url.pathname)) {
    if (url.pathname.startsWith("/vendedor")) {
      return event.respondWith(caches.match("/vendedor/panel"));
    } else if (url.pathname.startsWith("/comprador")) {
      return event.respondWith(caches.match("/comprador/panel"));
    }
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Actualiza cache
        const responseClone = response.clone();

        if (url.pathname.startsWith("/vendedor")) {
          caches.open("vendedor-cache").then((cache) => cache.put(event.request, responseClone));
        } else if (url.pathname.startsWith("/comprador")) {
          caches.open("comprador-cache").then((cache) => cache.put(event.request, responseClone));
        }

        return response;
      })
      .catch(() => {
        // Devuelve recurso cacheado según tipo de URL
        if (url.pathname.startsWith("/vendedor")) {
          return caches.match(event.request).then((res) => res || caches.match("/vendedor/panel"));
        } else if (url.pathname.startsWith("/comprador")) {
          return caches.match(event.request).then((res) => res || caches.match("/comprador/panel"));
        }
        // Fallback general
        return caches.match("/comprador/panel");
      })
  );
});

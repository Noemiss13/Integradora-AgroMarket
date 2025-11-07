// ===== Service Worker - AgroMarket PWA =====

const CACHE_COMPRADOR = "agromarket-comprador-v1";
const CACHE_VENDEDOR = "agromarket-vendedor-v1";

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
  "/static/images/icon-512.png",
  "/static/catalogo_offline.html",
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

// URLs restringidas offline
const OFFLINE_RESTRICTED = [
  "/auth/register",
  "/auth/login",
  "/vendedor/agregar_producto",
  "/vendedor/editar_producto",
  "/vendedor/editar_perfil"
];

// ===== Instalación =====
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_COMPRADOR).then((cache) => cache.addAll(urlsToCacheComprador)),
      caches.open(CACHE_VENDEDOR).then((cache) => cache.addAll(urlsToCacheVendedor))
    ])
  );
  self.skipWaiting();
});

// ===== Activación y limpieza =====
self.addEventListener("activate", (event) => {
  const allowedCaches = [CACHE_COMPRADOR, CACHE_VENDEDOR];
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (!allowedCaches.includes(name)) {
            return caches.delete(name);
          }
        })
      )
    )
  );
  console.log("✅ Service Worker activo y listo para offline");
  self.clients.claim();
});

// ===== Fetch: Network First con fallback =====
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bloquear acciones offline
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
        const clone = response.clone();
        if (url.pathname.startsWith("/vendedor")) {
          caches.open(CACHE_VENDEDOR).then((cache) => cache.put(event.request, clone));
        } else if (url.pathname.startsWith("/comprador")) {
          caches.open(CACHE_COMPRADOR).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        if (url.pathname.startsWith("/vendedor")) {
          return caches.match(event.request).then((res) => res || caches.match("/vendedor/panel"));
        } else if (url.pathname.startsWith("/comprador")) {
          return caches.match(event.request).then((res) => res || caches.match("/comprador/panel"));
        }
        return caches.match("/comprador/panel");
      })
  );
});

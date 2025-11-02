// Importar scripts de Firebase (debe estar disponible desde el HTML)
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// Configuración de Firebase (mismo que en firebase-config.js)
const firebaseConfig = {
  apiKey: "AIzaSyDZWmY0ggZthOKv17yHH57pkXsie_U2YnI",
  authDomain: "agromarket-625b2.firebaseapp.com",
  projectId: "agromarket-625b2",
  storageBucket: "agromarket-625b2.firebasestorage.app",
  messagingSenderId: "18163605615",
  appId: "1:18163605615:web:6910d608e280b028d6ad9a",
  measurementId: "G-CVL9DRNMG1"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener instancia de messaging
const messaging = firebase.messaging();

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

// Manejar notificaciones push cuando la app está en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('📩 Notificación recibida en background:', payload);
  
  const notificationTitle = payload.notification?.title || 'AgroMarket';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva notificación',
    icon: '/static/images/icon-192.png',
    badge: '/static/images/icon-48.png',
    data: payload.data || {},
    tag: payload.data?.tag || 'agromarket-notification',
    requireInteraction: false,
    silent: false
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clic en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notificación clickeada:', event);
  event.notification.close();

  // Abrir o enfocar la ventana de la app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si hay una ventana abierta, enfócarla
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/comprador/mis_pedidos';
        return clients.openWindow(url);
      }
    })
  );
});


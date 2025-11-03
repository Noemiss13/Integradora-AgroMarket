// Firebase Cloud Messaging (FCM) - Notificaciones Push
// Este archivo maneja las notificaciones push de Firebase

let messaging = null;
let fcmToken = null;

/**
 * Inicializar Firebase Cloud Messaging
 */
async function inicializarFCM() {
    try {
        // Verificar que Firebase esté inicializado
        if (typeof firebase === 'undefined' || !firebase.messaging) {
            console.warn('⚠️ Firebase Messaging no está disponible');
            return false;
        }

        // Obtener la instancia de messaging
        messaging = firebase.messaging();

        // Solicitar permiso para notificaciones
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('✅ Permiso para notificaciones concedido');
            
            // Obtener el token FCM
            const vapidKey = 'BCVA3zlfMHUV-HteVnkGT_fX14Ctq0d_phPT52yfq-QSUiPfQeLIReku5M8ha9DZTuvrpXaG4LUZ1aRhotUN1ak';
            
            // Obtener service worker registration
            const registration = await navigator.serviceWorker.ready;
            
            fcmToken = await messaging.getToken({
                vapidKey: vapidKey,
                serviceWorkerRegistration: registration
            });

            if (fcmToken) {
                console.log('✅ Token FCM obtenido:', fcmToken);
                
                // Guardar el token en Firestore para el usuario actual
                await guardarTokenFCM(fcmToken);
                
                // Configurar listener para recibir mensajes cuando la app está en primer plano
                messaging.onMessage((payload) => {
                    console.log('📩 Mensaje recibido en primer plano:', payload);
                    mostrarNotificacionLocal(payload);
                });

                return true;
            } else {
                console.warn('⚠️ No se pudo obtener el token FCM');
                return false;
            }
        } else {
            console.warn('⚠️ Permiso para notificaciones denegado');
            return false;
        }
    } catch (error) {
        console.error('❌ Error inicializando FCM:', error);
        return false;
    }
}

/**
 * Guardar el token FCM en Firestore para el usuario actual
 */
async function guardarTokenFCM(token) {
    try {
        const user = firebase.auth().currentUser;
        if (!user || !window.db) {
            return;
        }

        // Guardar token en el documento del usuario
        await window.db.collection('usuarios').doc(user.uid).set({
            fcm_token: token,
            fcm_token_actualizado: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('✅ Token FCM guardado en Firestore');
    } catch (error) {
        console.error('❌ Error guardando token FCM:', error);
    }
}

/**
 * Mostrar notificación local cuando la app está en primer plano
 */
function mostrarNotificacionLocal(payload) {
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

    // Mostrar notificación usando la API del navegador
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(notificationTitle, notificationOptions);
        
        // Manejar clic en la notificación
        notification.onclick = (event) => {
            event.preventDefault();
            const url = payload.data?.url || '/comprador/mis_pedidos';
            window.focus();
            window.location.href = url;
            notification.close();
        };

        // Cerrar notificación después de 5 segundos
        setTimeout(() => {
            notification.close();
        }, 5000);
    }
}

/**
 * Enviar notificación push cuando se completa una compra
 */
async function enviarNotificacionCompra(compraId, total, productos) {
    try {
        const user = firebase.auth().currentUser;
        if (!user || !window.db) {
            return;
        }

        // Obtener el token FCM del usuario
        const userDoc = await window.db.collection('usuarios').doc(user.uid).get();
        const userData = userDoc.data();
        const token = userData?.fcm_token;

        if (!token) {
            console.warn('⚠️ Usuario no tiene token FCM, no se puede enviar notificación push');
            return;
        }

        // Construir mensaje
        const mensaje = productos.length === 1 
            ? `Compra exitosa: ${productos[0].nombre} - $${total.toFixed(2)}`
            : `Compra exitosa: ${productos.length} productos - $${total.toFixed(2)}`;

        // Enviar notificación usando Firebase Admin SDK (desde el backend)
        // Por ahora, solo mostramos una notificación local
        // En producción, esto debería hacerse desde el backend de Flask usando el SDK de Admin de Firebase
        
        console.log('📩 Notificación de compra preparada (requiere backend para enviar)');
    } catch (error) {
        console.error('❌ Error enviando notificación de compra:', error);
    }
}

// Exportar funciones para uso global
window.inicializarFCM = inicializarFCM;
window.enviarNotificacionCompra = enviarNotificacionCompra;
window.guardarTokenFCM = guardarTokenFCM;

// Inicializar FCM cuando el DOM esté listo y el usuario esté autenticado
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Esperar un poco para asegurar que Firebase esté completamente inicializado
            setTimeout(() => {
                inicializarFCM();
            }, 1000);
        }
    });
}


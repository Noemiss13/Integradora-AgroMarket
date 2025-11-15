/**
 * Script para manejar las notificaciones de mensajes en el navbar
 * Escucha los mensajes no leídos en tiempo real y actualiza el badge
 */

(function() {
    let auth = null;
    let db = null;
    let unsubscribeHandlers = [];
    let totalUnreadCount = 0;
    let notificationBadge = null;

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    async function initialize() {
        // Buscar el badge de notificaciones (puede haber múltiples en diferentes páginas)
        const badges = document.querySelectorAll('#notification-badge');
        if (badges.length === 0) {
            console.log('ℹ️ Badge de notificaciones no encontrado en esta página');
            return;
        }
        // Usar el primer badge encontrado
        notificationBadge = badges[0];
        console.log('✅ Badge de notificaciones encontrado');

        try {
            await initializeFirebase();
            if (!auth || !db) {
                console.warn('⚠️ Firebase no está disponible');
                return;
            }

            // Escuchar cambios de autenticación
            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('✅ Usuario autenticado:', user.uid);
                    suscribirseANotificaciones(user.uid);
                } else {
                    console.log('ℹ️ Usuario no autenticado');
                    limpiarSuscripciones();
                    actualizarBadge(0);
                }
            });
        } catch (error) {
            console.error('❌ Error inicializando notificaciones del navbar:', error);
        }
    }

    async function initializeFirebase() {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK no está disponible');
        }

        if (firebase.apps.length === 0) {
            if (!window.firebaseConfig) {
                throw new Error('No se encontró la configuración de Firebase');
            }
            firebase.initializeApp(window.firebaseConfig);
        }

        auth = firebase.auth();
        db = firebase.firestore();

        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            ignoreUndefinedProperties: true,
        });
    }

    function suscribirseANotificaciones(userId) {
        limpiarSuscripciones();
        
        try {
            // Buscar todos los chats donde el usuario es participante
            const queries = [
                db.collection('chats').where('participants', 'array-contains', userId),
                db.collection('chats').where('comprador_id', '==', userId),
                db.collection('chats').where('vendedor_id', '==', userId),
            ];

            queries.forEach((query, index) => {
                const unsubscribe = query.onSnapshot(
                    (snapshot) => {
                        console.log(`📡 Cambio detectado en query ${index + 1}`);
                        snapshot.docChanges().forEach((change) => {
                            if (change.type === 'modified' || change.type === 'added') {
                                const chatData = change.doc.data();
                                const unread = chatData.unreadCounts?.[userId] || 0;
                                console.log(`📬 Chat ${change.doc.id} modificado - Mensajes no leídos: ${unread}`);
                            }
                        });
                        // Recalcular después de un pequeño delay para asegurar que los datos estén actualizados
                        setTimeout(() => {
                            calcularTotalMensajesNoLeidos(userId);
                        }, 100);
                    },
                    (error) => {
                        console.error(`❌ Error escuchando chats para notificaciones (query ${index + 1}):`, error);
                    }
                );
                unsubscribeHandlers.push(unsubscribe);
            });

            // Calcular inicialmente
            console.log('🔄 Calculando mensajes no leídos inicialmente...');
            calcularTotalMensajesNoLeidos(userId);
            
            // Recalcular periódicamente para asegurar que esté actualizado (cada 30 segundos)
            setInterval(() => {
                console.log('🔄 Recalculando mensajes no leídos (verificación periódica)...');
                calcularTotalMensajesNoLeidos(userId);
            }, 30000);
        } catch (error) {
            console.error('❌ Error configurando suscripción a notificaciones:', error);
        }
    }

    async function calcularTotalMensajesNoLeidos(userId) {
        try {
            console.log('🔍 Calculando mensajes no leídos para usuario:', userId);
            const chatsRef = db.collection('chats');
            
            // Obtener todos los chats donde el usuario es participante
            const queries = [
                chatsRef.where('participants', 'array-contains', userId).get(),
                chatsRef.where('comprador_id', '==', userId).get(),
                chatsRef.where('vendedor_id', '==', userId).get(),
            ];

            const snapshots = await Promise.all(queries);
            const chatsMap = new Map();

            // Consolidar todos los chats únicos
            snapshots.forEach((snapshot) => {
                snapshot.forEach((doc) => {
                    if (!chatsMap.has(doc.id)) {
                        chatsMap.set(doc.id, { id: doc.id, ref: doc.ref, data: doc.data() });
                    }
                });
            });

            console.log(`📊 Total de chats encontrados: ${chatsMap.size}`);

            // Calcular total de mensajes no leídos y verificar contadores
            let total = 0;
            const detallesChats = [];
            const chatsConProblemas = [];

            for (const [chatId, chatInfo] of chatsMap) {
                const chatData = chatInfo.data;
                
                // Verificar que unreadCounts exista y sea un objeto
                if (!chatData.unreadCounts || typeof chatData.unreadCounts !== 'object') {
                    console.warn(`⚠️ Chat ${chatId} no tiene unreadCounts válido`);
                    // Si no existe, crearlo con 0
                    if (chatInfo.ref) {
                        try {
                            await chatInfo.ref.set({
                                unreadCounts: {
                                    [userId]: 0
                                }
                            }, { merge: true });
                            console.log(`✅ Creado unreadCounts para chat ${chatId}`);
                        } catch (e) {
                            console.warn(`⚠️ No se pudo crear unreadCounts para ${chatId}:`, e);
                        }
                    }
                    continue;
                }
                
                // Obtener el contador para este usuario específico
                let unreadCount = typeof chatData.unreadCounts[userId] === 'number' 
                    ? Math.max(0, chatData.unreadCounts[userId]) // Asegurar que no sea negativo
                    : 0;
                
                // Verificar si el contador parece incorrecto (muy alto o negativo)
                if (unreadCount > 50) {
                    console.warn(`⚠️ Chat ${chatId} tiene contador sospechoso: ${unreadCount}`);
                    chatsConProblemas.push({ chatId, unreadCount, ref: chatInfo.ref });
                    
                    // Verificar contando mensajes reales
                    try {
                        const mensajesRef = chatInfo.ref.collection('messages');
                        const mensajesSnapshot = await mensajesRef
                            .where('senderId', '!=', userId)
                            .orderBy('senderId')
                            .orderBy('created_at', 'desc')
                            .limit(100)
                            .get();
                        
                        // Contar mensajes que el usuario no ha leído
                        // Esto es una verificación aproximada
                        const mensajesNoLeidos = mensajesSnapshot.docs.filter(doc => {
                            const msgData = doc.data();
                            const readBy = msgData.readBy || [];
                            return !readBy.includes(userId);
                        }).length;
                        
                        console.log(`📊 Chat ${chatId}: Contador dice ${unreadCount}, mensajes reales no leídos: ${mensajesNoLeidos}`);
                        
                        // Si hay gran discrepancia, corregir el contador
                        if (Math.abs(unreadCount - mensajesNoLeidos) > 5) {
                            console.log(`🔧 Corrigiendo contador en chat ${chatId}: ${unreadCount} -> ${mensajesNoLeidos}`);
                            await chatInfo.ref.set({
                                [`unreadCounts.${userId}`]: mensajesNoLeidos
                            }, { merge: true });
                            unreadCount = mensajesNoLeidos;
                        }
                    } catch (error) {
                        console.warn(`⚠️ No se pudo verificar mensajes en chat ${chatId}:`, error);
                    }
                }
                
                if (unreadCount > 0) {
                    total += unreadCount;
                    detallesChats.push({
                        chatId: chatId,
                        unread: unreadCount,
                        vendedor: chatData.vendedor_nombre || 'N/A',
                        comprador: chatData.comprador_nombre || 'N/A',
                        unreadCounts: chatData.unreadCounts // Para depuración
                    });
                }
            }

            console.log(`📬 Mensajes no leídos totales: ${total}`);
            if (detallesChats.length > 0) {
                console.log('📋 Detalles de chats con mensajes no leídos:', detallesChats);
            } else {
                console.log('ℹ️ No hay chats con mensajes no leídos');
            }

            // Solo actualizar si el total cambió
            if (totalUnreadCount !== total) {
                console.log(`🔄 Contador cambió: ${totalUnreadCount} -> ${total}`);
                totalUnreadCount = total;
                actualizarBadge(total);
            } else {
                console.log(`ℹ️ Contador sin cambios: ${total}`);
            }
            
            // Log adicional para depuración
            if (total > 0) {
                console.log(`✅ Badge mostrando ${total} mensajes no leídos`);
            } else {
                console.log('✅ No hay mensajes no leídos - badge oculto');
            }
        } catch (error) {
            console.error('❌ Error calculando mensajes no leídos:', error);
            console.error('Stack:', error.stack);
        }
    }

    function actualizarBadge(count) {
        if (!notificationBadge) {
            console.warn('⚠️ Badge de notificaciones no encontrado');
            return;
        }

        const countNum = Number(count) || 0;
        console.log(`🔄 Actualizando badge con ${countNum} mensajes`);

        if (countNum === 0 || countNum === null || countNum === undefined || isNaN(countNum)) {
            notificationBadge.classList.add('hidden');
            notificationBadge.textContent = '';
            console.log('✅ Badge ocultado (sin mensajes)');
        } else {
            notificationBadge.classList.remove('hidden');
            
            // Mostrar número o "99+" si es mayor
            if (countNum > 99) {
                notificationBadge.textContent = '99+';
                notificationBadge.classList.add('count-large');
            } else {
                notificationBadge.textContent = countNum.toString();
                if (countNum <= 9) {
                    notificationBadge.classList.remove('count-large');
                } else {
                    notificationBadge.classList.add('count-large');
                }
            }
            console.log(`✅ Badge mostrado con número: ${notificationBadge.textContent}`);
        }
    }

    function limpiarSuscripciones() {
        unsubscribeHandlers.forEach((unsubscribe) => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        unsubscribeHandlers = [];
    }

    // Limpiar al cerrar la página
    window.addEventListener('beforeunload', () => {
        limpiarSuscripciones();
    });

    // Función de depuración: mostrar estado actual
    window.debugNotifications = function() {
        console.log('🔍 Estado de notificaciones:');
        console.log('- Badge encontrado:', !!notificationBadge);
        console.log('- Total mensajes no leídos:', totalUnreadCount);
        console.log('- Usuario actual:', auth?.currentUser?.uid || 'No autenticado');
        console.log('- Suscripciones activas:', unsubscribeHandlers.length);
        
        if (auth?.currentUser) {
            calcularTotalMensajesNoLeidos(auth.currentUser.uid);
        }
    };

    // Exponer función para forzar actualización
    window.actualizarNotificaciones = function() {
        if (auth?.currentUser) {
            console.log('🔄 Forzando actualización de notificaciones...');
            calcularTotalMensajesNoLeidos(auth.currentUser.uid);
        } else {
            console.warn('⚠️ No hay usuario autenticado para actualizar notificaciones');
        }
    };

    // Función para limpiar contadores incorrectos (solo para depuración)
    window.limpiarContadoresNotificaciones = async function() {
        if (!auth?.currentUser || !db) {
            console.warn('⚠️ No se puede limpiar: usuario no autenticado o Firebase no disponible');
            return;
        }

        const userId = auth.currentUser.uid;
        console.log('🧹 Limpiando contadores de notificaciones para usuario:', userId);

        try {
            const chatsRef = db.collection('chats');
            const queries = [
                chatsRef.where('participants', 'array-contains', userId).get(),
                chatsRef.where('comprador_id', '==', userId).get(),
                chatsRef.where('vendedor_id', '==', userId).get(),
            ];

            const snapshots = await Promise.all(queries);
            const chatsMap = new Map();

            snapshots.forEach((snapshot) => {
                snapshot.forEach((doc) => {
                    if (!chatsMap.has(doc.id)) {
                        chatsMap.set(doc.id, { id: doc.id, ref: doc.ref, data: doc.data() });
                    }
                });
            });

            let actualizados = 0;
            for (const [chatId, chat] of chatsMap) {
                const chatData = chat.data;
                if (chatData.unreadCounts && typeof chatData.unreadCounts[userId] === 'number') {
                    const currentCount = chatData.unreadCounts[userId];
                    // Si el contador es mayor a 0, resetearlo a 0
                    if (currentCount > 0) {
                        console.log(`🔧 Reseteando contador en chat ${chatId}: ${currentCount} -> 0`);
                        await chat.ref.set({
                            [`unreadCounts.${userId}`]: 0
                        }, { merge: true });
                        actualizados++;
                    }
                } else if (!chatData.unreadCounts) {
                    // Si no existe unreadCounts, crearlo con 0
                    console.log(`🔧 Creando unreadCounts para chat ${chatId}`);
                    await chat.ref.set({
                        unreadCounts: {
                            [userId]: 0
                        }
                    }, { merge: true });
                    actualizados++;
                }
            }

            console.log(`✅ ${actualizados} contadores corregidos/reseteados`);
            // Recalcular después de limpiar
            setTimeout(() => {
                calcularTotalMensajesNoLeidos(userId);
            }, 500);
        } catch (error) {
            console.error('❌ Error limpiando contadores:', error);
        }
    };

    // Función para resetear TODOS los contadores a 0 (útil cuando hay datos incorrectos)
    window.resetearTodosLosContadores = async function() {
        if (!auth?.currentUser || !db) {
            console.warn('⚠️ No se puede resetear: usuario no autenticado o Firebase no disponible');
            return;
        }

        const userId = auth.currentUser.uid;
        const confirmar = confirm('¿Estás seguro de que quieres resetear TODOS los contadores de mensajes no leídos a 0? Esto puede ocultar mensajes que realmente no has leído.');
        
        if (!confirmar) {
            console.log('❌ Operación cancelada por el usuario');
            return;
        }

        console.log('🔄 Reseteando TODOS los contadores a 0 para usuario:', userId);

        try {
            const chatsRef = db.collection('chats');
            const queries = [
                chatsRef.where('participants', 'array-contains', userId).get(),
                chatsRef.where('comprador_id', '==', userId).get(),
                chatsRef.where('vendedor_id', '==', userId).get(),
            ];

            const snapshots = await Promise.all(queries);
            const chatsMap = new Map();

            snapshots.forEach((snapshot) => {
                snapshot.forEach((doc) => {
                    if (!chatsMap.has(doc.id)) {
                        chatsMap.set(doc.id, doc.ref);
                    }
                });
            });

            let actualizados = 0;
            const batch = db.batch();
            let batchCount = 0;
            const BATCH_LIMIT = 500;

            for (const [chatId, chatRef] of chatsMap) {
                batch.set(chatRef, {
                    [`unreadCounts.${userId}`]: 0
                }, { merge: true });
                batchCount++;
                actualizados++;

                // Firestore tiene un límite de 500 operaciones por batch
                if (batchCount >= BATCH_LIMIT) {
                    await batch.commit();
                    batchCount = 0;
                    console.log(`✅ Batch de ${BATCH_LIMIT} chats actualizado`);
                }
            }

            // Commit del batch restante
            if (batchCount > 0) {
                await batch.commit();
            }

            console.log(`✅ ${actualizados} contadores reseteados a 0`);
            alert(`✅ Se resetearon ${actualizados} contadores. El badge debería actualizarse en unos segundos.`);
            
            // Recalcular después de resetear
            setTimeout(() => {
                calcularTotalMensajesNoLeidos(userId);
            }, 1000);
        } catch (error) {
            console.error('❌ Error reseteando contadores:', error);
            alert('❌ Error al resetear los contadores. Revisa la consola para más detalles.');
        }
    };
})();


// Firebase Instant - Login ultra-rápido sin consultas lentas
// Versión optimizada para máximo rendimiento

const firebaseConfig = {
  apiKey: "AIzaSyDZWmY0ggZthOKv17yHH57pkXsie_U2YnI",
  authDomain: "agromarket-625b2.firebaseapp.com",
  projectId: "agromarket-625b2",
  storageBucket: "agromarket-625b2.firebasestorage.app",
  messagingSenderId: "18163605615",
  appId: "1:18163605615:web:6910d608e280b028d6ad9a",
  measurementId: "G-CVL9DRNMG1"
};

// Variables globales
let firebaseApp = null;
let auth = null;
let db = null;
let isInitialized = false;
let userData = null;
let userDataLoaded = false;

// Cache de datos del usuario
const userCache = new Map();

// Función de inicialización ultra-rápida
function initializeFirebaseInstant() {
    if (isInitialized) {
        return Promise.resolve({ auth, db });
    }
    
    return new Promise((resolve, reject) => {
        console.log('⚡ Inicializando Firebase instantáneo...');
        const startTime = performance.now();
        
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK no está cargado');
            }
            
            if (firebase.apps.length > 0) {
                firebaseApp = firebase.app();
                auth = firebase.auth();
                db = firebase.firestore();
                isInitialized = true;
                
                const endTime = performance.now();
                console.log(`⚡ Firebase reutilizado en ${(endTime - startTime).toFixed(2)}ms`);
                resolve({ auth, db });
                return;
            }
            
            firebaseApp = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            
            // Configuraciones de rendimiento máximo
            db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                ignoreUndefinedProperties: true
            });
            
            isInitialized = true;
            
            const endTime = performance.now();
            console.log(`⚡ Firebase inicializado en ${(endTime - startTime).toFixed(2)}ms`);
            resolve({ auth, db });
            
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
            reject(error);
        }
    });
}

// Login instantáneo - SIN consultas a Firestore
async function loginInstant(email, password) {
    const startTime = performance.now();
    console.log('⚡ LOGIN INSTANTÁNEO iniciado...');
    
    try {
        // Inicializar Firebase
        const { auth: firebaseAuth } = await initializeFirebaseInstant();
        
        // Login con Firebase Auth únicamente
        const result = await firebaseAuth.signInWithEmailAndPassword(email, password);
        
        // Crear datos instantáneos SIN consultar Firestore
        userData = {
            uid: result.user.uid,
            email: result.user.email,
            nombre: result.user.displayName || result.user.email.split('@')[0],
            roles: ['comprador'], // Por defecto
            rol_activo: 'comprador', // Por defecto
            fecha_registro: new Date().toISOString(),
            activo: true
        };
        
        console.log('⚡ Datos instantáneos creados (SIN consulta a Firestore):', userData);
        
        // Guardar en caché
        userCache.set(result.user.uid, userData);
        userDataLoaded = true;
        
        const endTime = performance.now();
        console.log(`⚡ LOGIN INSTANTÁNEO completado en ${(endTime - startTime).toFixed(2)}ms`);
        
        // Redirigir INMEDIATAMENTE
        redirectInstant(userData);
        
        return { user: result.user, userData };
        
    } catch (error) {
        console.error('❌ Error en login instantáneo:', error);
        throw error;
    }
}

// Redirección instantánea - SIEMPRE a comprador por defecto
function redirectInstant(userData) {
    const startTime = performance.now();
    console.log('⚡ REDIRECCIÓN INSTANTÁNEA...');
    
    // SIEMPRE redirigir a comprador por defecto para máxima velocidad
    const redirectUrl = '/comprador/panel';
    
    const endTime = performance.now();
    console.log(`⚡ Redirigiendo a ${redirectUrl} en ${(endTime - startTime).toFixed(2)}ms`);
    console.log('🎯 Redirección directa a comprador (máxima velocidad)');
    
    window.location.href = redirectUrl;
}

// Cargar datos del usuario en background (sin bloquear)
async function loadUserDataInBackground(uid) {
    try {
        console.log('🔄 Cargando datos del usuario en background...');
        const { db: firestore } = await initializeFirebaseInstant();
        
        const userDoc = await firestore.collection('usuarios').doc(uid).get();
        
        if (userDoc.exists) {
            const userDataFromFirestore = userDoc.data();
            
            // Actualizar datos locales
            userData = {
                ...userData,
                ...userDataFromFirestore,
                uid: uid
            };
            
            // Actualizar caché
            userCache.set(uid, userData);
            
            console.log('✅ Datos del usuario actualizados en background');
            
            // Notificar a la página actual si es necesario
            if (window.updateUserData) {
                window.updateUserData(userData);
            }
        } else {
            // Crear usuario en Firestore en background
            await firestore.collection('usuarios').doc(uid).set({
                nombre: userData.nombre,
                email: userData.email,
                roles: userData.roles,
                rol_activo: userData.rol_activo,
                fecha_registro: firebase.firestore.FieldValue.serverTimestamp(),
                activo: true
            });
            console.log('✅ Usuario creado en Firestore en background');
        }
        
    } catch (error) {
        console.log('⚠️ Error cargando datos en background:', error);
        // No es crítico, los datos locales ya están disponibles
    }
}

// Obtener datos del usuario instantáneamente
function getUserDataInstant() {
    if (userDataLoaded && userData) {
        return userData;
    }
    
    // Intentar obtener de caché
    if (auth && auth.currentUser) {
        const cachedData = userCache.get(auth.currentUser.uid);
        if (cachedData) {
            return cachedData;
        }
    }
    
    // Datos por defecto
    return {
        uid: 'unknown',
        email: 'usuario@ejemplo.com',
        nombre: 'Usuario',
        roles: ['comprador'],
        rol_activo: 'comprador',
        fecha_registro: new Date().toISOString(),
        activo: true
    };
}

// Cargar roles instantáneamente
function loadRolesInstant() {
    const userData = getUserDataInstant();
    const roles = userData.roles || ['comprador'];
    
    console.log('⚡ Roles cargados instantáneamente:', roles);
    return roles;
}

// Función para mostrar mensajes instantáneos
function showMessageInstant(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        transform: translateX(100%);
    `;
    
    switch (type) {
        case 'success':
            messageDiv.style.backgroundColor = '#28a745';
            break;
        case 'error':
            messageDiv.style.backgroundColor = '#dc3545';
            break;
        case 'warning':
            messageDiv.style.backgroundColor = '#ffc107';
            messageDiv.style.color = '#000';
            break;
        default:
            messageDiv.style.backgroundColor = '#007bff';
    }
    
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    // Animación de entrada
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

// Función para actualizar datos del usuario en la página
function updateUserDataInPage(userData) {
    console.log('🔄 Actualizando datos del usuario en la página...');
    
    // Actualizar nombre en navbar
    const nombreNavbar = document.getElementById('usuario-nombre');
    if (nombreNavbar) {
        nombreNavbar.textContent = userData.nombre || 'Usuario';
    }
    
    // Actualizar email en perfil
    const emailPerfil = document.getElementById('perfil-email');
    if (emailPerfil) {
        emailPerfil.textContent = userData.email || '';
    }
    
    // Actualizar roles si existe la función
    if (window.cargarRoles) {
        window.cargarRoles();
    }
    
    console.log('✅ Datos del usuario actualizados en la página');
}

// Exportar funciones globalmente
window.firebaseConfig = firebaseConfig;
window.initializeFirebaseInstant = initializeFirebaseInstant;
window.loginInstant = loginInstant;
window.redirectInstant = redirectInstant;
window.loadUserDataInBackground = loadUserDataInBackground;
window.getUserDataInstant = getUserDataInstant;
window.loadRolesInstant = loadRolesInstant;
window.showMessageInstant = showMessageInstant;
window.updateUserData = updateUserDataInPage;

// Inicializar automáticamente
if (typeof firebase !== 'undefined') {
    initializeFirebaseInstant().catch(error => {
        console.error('❌ Error en inicialización automática:', error);
    });
}

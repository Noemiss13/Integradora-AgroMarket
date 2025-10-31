// Firebase Fixed - Versión corregida para evitar errores de configuración
// Configuración de Firebase para AgroMarket

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

// Función para inicializar Firebase de manera segura
function initializeFirebaseSafely() {
    if (isInitialized) {
        return Promise.resolve({ auth, db });
    }
    
    return new Promise((resolve, reject) => {
        console.log('🔄 Inicializando Firebase de manera segura...');
        const startTime = performance.now();
        
        try {
            // Verificar que Firebase esté disponible
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK no está cargado');
            }
            
            // Verificar si ya está inicializado
            if (firebase.apps.length > 0) {
                console.log('✅ Firebase ya está inicializado');
                firebaseApp = firebase.app();
                auth = firebase.auth();
                db = firebase.firestore();
                isInitialized = true;
                
                const endTime = performance.now();
                console.log(`✅ Firebase reutilizado en ${(endTime - startTime).toFixed(2)}ms`);
                resolve({ auth, db });
                return;
            }
            
            // Verificar configuración
            if (!firebaseConfig || !firebaseConfig.apiKey) {
                throw new Error('Configuración de Firebase incompleta');
            }
            
            // Inicializar Firebase
            firebaseApp = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            
            // Configurar Firestore
            db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                ignoreUndefinedProperties: true
            });
            
            isInitialized = true;
            
            const endTime = performance.now();
            console.log(`✅ Firebase inicializado en ${(endTime - startTime).toFixed(2)}ms`);
            resolve({ auth, db });
            
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
            isInitialized = false;
            reject(error);
        }
    });
}

// Función para login optimizada
async function loginFixed(email, password) {
    const startTime = performance.now();
    console.log('🚀 Login iniciado...');
    
    try {
        // Inicializar Firebase
        const { auth: firebaseAuth } = await initializeFirebaseSafely();
        
        // Realizar login
        const result = await firebaseAuth.signInWithEmailAndPassword(email, password);
        
        const endTime = performance.now();
        console.log(`✅ Login completado en ${(endTime - startTime).toFixed(2)}ms`);
        
        return result;
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        throw error;
    }
}

// Función para redirección optimizada
async function redirectFixed(user) {
    const startTime = performance.now();
    console.log('🚀 Redirección iniciada...');
    
    try {
        const { db: firestore } = await initializeFirebaseSafely();
        
        // Redirección por defecto
        let redirectUrl = '/comprador/panel';
        
        // Intentar obtener datos del usuario con timeout
        const userDocPromise = firestore.collection('usuarios').doc(user.uid).get();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 2000)
        );
        
        try {
            const userDoc = await Promise.race([userDocPromise, timeoutPromise]);
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const roles = userData.roles || [userData.rol] || ['comprador'];
                
                if (roles.length === 1) {
                    redirectUrl = roles[0] === 'vendedor' ? '/vendedor/panel' : '/comprador/panel';
                } else if (roles.length > 1) {
                    redirectUrl = '/auth/seleccionar_rol';
                }
            }
        } catch (timeoutError) {
            console.log('⏰ Timeout verificando rol, usando redirección por defecto');
        }
        
        const endTime = performance.now();
        console.log(`✅ Redirección completada en ${(endTime - startTime).toFixed(2)}ms`);
        
        window.location.href = redirectUrl;
        
    } catch (error) {
        console.error('❌ Error en redirección:', error);
        window.location.href = '/comprador/panel';
    }
}

// Función para mostrar mensajes
function showMessageFixed(message, type = 'info') {
    // Crear elemento de mensaje
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
    `;
    
    // Colores según el tipo
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
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

// Exportar funciones globalmente
window.firebaseConfig = firebaseConfig;
window.initializeFirebaseSafely = initializeFirebaseSafely;
window.loginFixed = loginFixed;
window.redirectFixed = redirectFixed;
window.showMessageFixed = showMessageFixed;

// Inicializar automáticamente si Firebase está disponible
if (typeof firebase !== 'undefined') {
    initializeFirebaseSafely().catch(error => {
        console.error('❌ Error en inicialización automática:', error);
    });
}

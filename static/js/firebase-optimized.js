// Firebase Optimizado para AgroMarket
// Versión optimizada que evita duplicaciones y mejora el rendimiento

// Configuración de Firebase
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
let initPromise = null;

// Función de inicialización optimizada
function initializeFirebase() {
    if (isInitialized) {
        return Promise.resolve({ auth, db });
    }
    
    if (initPromise) {
        return initPromise;
    }
    
    initPromise = new Promise((resolve, reject) => {
        console.log('🔄 Inicializando Firebase (optimizado)...');
        const startTime = performance.now();
        
        try {
            // Verificar si Firebase está disponible
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
            
            // Inicializar Firebase
            firebaseApp = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            
            // Configuraciones de rendimiento
            db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                ignoreUndefinedProperties: true
            });
            
            auth.useDeviceLanguage();
            
            isInitialized = true;
            
            const endTime = performance.now();
            console.log(`✅ Firebase inicializado en ${(endTime - startTime).toFixed(2)}ms`);
            resolve({ auth, db });
            
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
            isInitialized = false;
            initPromise = null;
            reject(error);
        }
    });
    
    return initPromise;
}

// Función para obtener instancias de Firebase
async function getFirebase() {
    if (!isInitialized) {
        await initializeFirebase();
    }
    return { auth, db };
}

// Función para login optimizada
async function loginOptimized(email, password) {
    const startTime = performance.now();
    console.log('🚀 Login optimizado iniciado');
    
    try {
        // Inicializar Firebase
        const { auth: firebaseAuth } = await getFirebase();
        
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
async function redirectOptimized(user) {
    const startTime = performance.now();
    console.log('🚀 Redirección optimizada iniciada');
    
    try {
        const { db: firestore } = await getFirebase();
        
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

// Función para cargar roles optimizada
async function loadRolesOptimized() {
    const startTime = performance.now();
    console.log('🔄 Cargando roles optimizado...');
    
    try {
        const { db: firestore, auth: firebaseAuth } = await getFirebase();
        
        if (!firebaseAuth.currentUser) {
            throw new Error('Usuario no autenticado');
        }
        
        const userDoc = await firestore.collection('usuarios').doc(firebaseAuth.currentUser.uid).get();
        
        let roles = ['comprador']; // Por defecto
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            roles = userData.roles || [userData.rol] || ['comprador'];
        }
        
        const endTime = performance.now();
        console.log(`✅ Roles cargados en ${(endTime - startTime).toFixed(2)}ms`);
        
        return roles;
        
    } catch (error) {
        console.error('❌ Error cargando roles:', error);
        return ['comprador']; // Fallback
    }
}

// Exportar funciones
window.firebaseConfig = firebaseConfig;
window.initializeFirebase = initializeFirebase;
window.getFirebase = getFirebase;
window.loginOptimized = loginOptimized;
window.redirectOptimized = redirectOptimized;
window.loadRolesOptimized = loadRolesOptimized;

// Inicializar automáticamente si Firebase está disponible
if (typeof firebase !== 'undefined') {
    initializeFirebase().catch(error => {
        console.error('❌ Error en inicialización automática:', error);
    });
}

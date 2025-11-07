(() => {
const firebaseConfig = window.firebaseConfig;

if (!firebaseConfig) {
    console.error('❌ No se encontró la configuración de Firebase. Asegúrate de cargar firebase-instant.js antes de los scripts de productos');
}

let firebaseInitPromise = null;

function ensureFirebase() {
    if (firebaseInitPromise) {
        return firebaseInitPromise;
    }

    firebaseInitPromise = new Promise((resolve, reject) => {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK no está cargado');
            }

            let appRecienInicializada = false;
            if (firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
                appRecienInicializada = true;
            }

            const auth = firebase.auth();
            const db = firebase.firestore();
            const storage = firebase.storage();

            if (appRecienInicializada && db && db.settings) {
                db.settings({
                    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                    ignoreUndefinedProperties: true
                });
            }

            resolve({ auth, db, storage });
        } catch (error) {
            reject(error);
        }
    });

    return firebaseInitPromise;
}

function mostrarMensaje(mensaje, tipo = 'info') {
    if (!mensaje) return;

    const existingMessage = document.getElementById('message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const configPorTipo = {
        success: { fondo: '#4CAF50', texto: '#fff', icono: 'fa-check-circle' },
        error: { fondo: '#f44336', texto: '#fff', icono: 'fa-exclamation-circle' },
        warning: { fondo: '#ffc107', texto: '#000', icono: 'fa-exclamation-triangle' },
        info: { fondo: '#2196F3', texto: '#fff', icono: 'fa-info-circle' }
    };

    const config = configPorTipo[tipo] || configPorTipo.info;

    const wrapper = document.createElement('div');
    wrapper.id = 'message';
    wrapper.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: -400px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 18px;
            border-radius: 8px;
            background: ${config.fondo};
            color: ${config.texto};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-weight: 600;
            letter-spacing: 0.2px;
            z-index: 1100;
            transition: right 0.3s ease-in-out, opacity 0.3s ease-in-out;
            opacity: 0.95;
            max-width: 360px;
        ">
            <i class="fas ${config.icono}" style="font-size: 18px;"></i>
            <span>${mensaje}</span>
        </div>
    `;

    document.body.appendChild(wrapper);

    const toast = wrapper.firstElementChild;
    requestAnimationFrame(() => {
        toast.style.right = '20px';
    });

    setTimeout(() => {
        toast.style.right = '-400px';
        toast.style.opacity = '0';
        setTimeout(() => {
            wrapper.remove();
        }, 300);
    }, 3200);
}

function actualizarSaludoUsuario(user) {
    try {
        const saludoElement = document.querySelector('.saludo-usuario strong');
        if (saludoElement) {
            saludoElement.textContent = user.displayName || user.email || 'Usuario';
        }
    } catch (error) {
        console.warn('No fue posible actualizar el saludo del usuario:', error);
    }
}

window.ProductosCommon = {
    ensureFirebase,
    mostrarMensaje,
    actualizarSaludoUsuario
};

})();


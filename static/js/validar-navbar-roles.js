/**
 * Script para validar y mostrar/ocultar enlaces del navbar según los roles activos del usuario
 * Se usa en todos los templates con navbar para controlar acceso a paneles
 */

async function validarNavbarRoles() {
    try {
        // Verificar que Firebase esté disponible
        if (typeof firebase === 'undefined' || !firebase.auth) {
            console.log('⚠️ Firebase no disponible');
            return;
        }

        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('⚠️ Usuario no autenticado');
            ocultarTodosLosPaneles();
            return;
        }

        // Obtener roles del usuario desde Firestore
        let db = null;
        try {
            // Intentar con Firebase v8/v9 (non-compat)
            if (typeof firebase !== 'undefined') {
                if (firebase.firestore) {
                    db = firebase.firestore();
                } else if (window.db) {
                    db = window.db;
                }
            }
        } catch (e) {
            console.log('⚠️ Error obteniendo Firestore:', e);
        }

        if (!db) {
            console.log('⚠️ Firestore no disponible');
            return;
        }

        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        if (!userDoc.exists) {
            console.log('⚠️ Usuario sin datos en Firestore');
            ocultarTodosLosPaneles();
            return;
        }

        const userData = userDoc.data();
        const roles = userData.roles || [];
        
        console.log('🎭 Roles del usuario (raw):', roles);
        console.log('🎭 Tipo de roles:', Array.isArray(roles) ? 'array' : typeof roles);

        // Normalizar roles: convertir a array y a minúsculas
        let rolesArray = [];
        if (Array.isArray(roles)) {
            rolesArray = roles.map(r => String(r).toLowerCase().trim()).filter(r => r);
        } else if (roles && typeof roles === 'string') {
            rolesArray = [roles.toLowerCase().trim()];
        }
        
        console.log('🎭 Roles normalizados:', rolesArray);

        // Verificar roles (normalizados)
        const tieneComprador = rolesArray.includes('comprador');
        const tieneVendedor = rolesArray.includes('vendedor');
        
        console.log('🎭 Tiene comprador:', tieneComprador);
        console.log('🎭 Tiene vendedor:', tieneVendedor);

        // Detectar en qué sección estamos (comprador o vendedor) por la URL actual
        const currentPath = window.location.pathname;
        const esVistaComprador = currentPath.includes('/comprador/');
        const esVistaVendedor = currentPath.includes('/vendedor/');
        
        console.log('📍 Vista actual:', { currentPath, esVistaComprador, esVistaVendedor });

        // SIEMPRE ocultar TODOS los paneles si estamos en vistas de comprador o vendedor
        const esVistaPanel = esVistaComprador || esVistaVendedor;

        // Obtener los elementos del navbar
        const navPanelComprador = document.getElementById('nav-panel-comprador');
        const navPanelVendedor = document.getElementById('nav-panel-vendedor');

        // En vistas de panel, OCULTAR SIEMPRE todos los enlaces de panel
        if (esVistaPanel) {
            if (navPanelComprador) {
                navPanelComprador.style.display = 'none';
                console.log('❌ Ocultando Panel Comprador (estamos en vista de panel)');
            }
            if (navPanelVendedor) {
                navPanelVendedor.style.display = 'none';
                console.log('❌ Ocultando Panel Vendedor (estamos en vista de panel)');
            }
            return; // Salir temprano, no mostrar nada en vistas de panel
        }

        // Si NO estamos en vistas de panel, mostrar según roles (solo en otras vistas como perfil)
        if (navPanelComprador) {
            if (tieneComprador) {
                navPanelComprador.style.display = 'inline-block';
                console.log('✅ Mostrando Panel Comprador en navbar');
            } else {
                navPanelComprador.style.display = 'none';
                console.log('❌ Ocultando Panel Comprador (sin rol)');
            }
        }

        if (navPanelVendedor) {
            if (tieneVendedor) {
                navPanelVendedor.style.display = 'inline-block';
                console.log('✅ Mostrando Panel Vendedor en navbar');
            } else {
                navPanelVendedor.style.display = 'none';
                console.log('❌ Ocultando Panel Vendedor (sin rol)');
            }
        }

    } catch (error) {
        console.error('❌ Error validando roles del navbar:', error);
    }
}

function ocultarTodosLosPaneles() {
    const navPanelComprador = document.getElementById('nav-panel-comprador');
    const navPanelVendedor = document.getElementById('nav-panel-vendedor');
    
    if (navPanelComprador) navPanelComprador.style.display = 'none';
    if (navPanelVendedor) navPanelVendedor.style.display = 'none';
}

// Inicializar cuando Firebase esté listo
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Esperar un poco para que Firestore esté disponible
            setTimeout(() => {
                validarNavbarRoles();
            }, 500);
        } else {
            ocultarTodosLosPaneles();
        }
    });
}

// También ejecutar cuando el DOM esté listo (por si Firebase ya cargó)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => validarNavbarRoles(), 1000);
    });
} else {
    setTimeout(() => validarNavbarRoles(), 1000);
}


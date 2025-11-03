/**
 * Función para validar y actualizar la visibilidad del navbar según los roles del usuario
 * Esta función lee los roles del usuario desde Firestore y muestra/oculta los enlaces del navbar
 */
async function validarNavbarRoles() {
    try {
        // Obtener elementos del navbar
        const navPanelComprador = document.getElementById('nav-panel-comprador');
        const navPanelVendedor = document.getElementById('nav-panel-vendedor');
        
        if (!navPanelComprador && !navPanelVendedor) {
            console.log('⚠️ Navbar elements not found, skipping validation');
            return;
        }

        // Obtener usuario actual
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('⚠️ Usuario no autenticado, ocultando paneles');
            if (navPanelComprador) navPanelComprador.style.display = 'none';
            if (navPanelVendedor) navPanelVendedor.style.display = 'none';
            return;
        }

        // Leer datos del usuario desde Firestore
        const userDoc = await firebase.firestore().collection('usuarios').doc(user.uid).get();
        
        if (!userDoc.exists) {
            console.log('⚠️ Usuario sin datos en Firestore, ocultando paneles');
            if (navPanelComprador) navPanelComprador.style.display = 'none';
            if (navPanelVendedor) navPanelVendedor.style.display = 'none';
            return;
        }

        const userData = userDoc.data();
        const roles = userData.roles || [];
        
        console.log('🔄 Validando navbar - Roles del usuario:', roles);

        // Mostrar/ocultar Panel Comprador
        if (navPanelComprador) {
            if (roles.includes('comprador')) {
                navPanelComprador.style.display = 'inline-block';
                console.log('✅ Mostrando Panel Comprador');
            } else {
                navPanelComprador.style.display = 'none';
                console.log('❌ Ocultando Panel Comprador');
            }
        }

        // Mostrar/ocultar Panel Vendedor
        if (navPanelVendedor) {
            if (roles.includes('vendedor')) {
                navPanelVendedor.style.display = 'inline-block';
                console.log('✅ Mostrando Panel Vendedor');
            } else {
                navPanelVendedor.style.display = 'none';
                console.log('❌ Ocultando Panel Vendedor');
            }
        }

    } catch (error) {
        console.error('❌ Error validando navbar:', error);
    }
}

// Validar el navbar cuando el usuario cambia de estado de autenticación
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('👤 Usuario autenticado, validando navbar...');
            validarNavbarRoles();
        } else {
            console.log('👤 Usuario deslogueado, ocultando paneles');
            const navPanelComprador = document.getElementById('nav-panel-comprador');
            const navPanelVendedor = document.getElementById('nav-panel-vendedor');
            if (navPanelComprador) navPanelComprador.style.display = 'none';
            if (navPanelVendedor) navPanelVendedor.style.display = 'none';
        }
    });
}

// Validar el navbar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Página cargada, validando navbar...');
    setTimeout(() => {
        validarNavbarRoles();
    }, 1000); // Esperar 1 segundo a que Firebase esté listo
});


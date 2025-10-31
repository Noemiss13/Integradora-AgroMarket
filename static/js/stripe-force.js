// Stripe Force - Versión que fuerza la creación
console.log('💪 Stripe Force iniciado');

// Función para forzar Stripe
function forceStripe() {
    console.log('💪 Forzando creación de Stripe...');
    
    // Verificar Stripe
    if (typeof Stripe === 'undefined') {
        alert('❌ Stripe no está disponible');
        return;
    }
    
    // Limpiar contenedor
    const container = document.getElementById('card-element');
    if (!container) {
        alert('❌ Contenedor card-element no encontrado');
        return;
    }
    
    container.innerHTML = '';
    console.log('✅ Contenedor limpiado');
    
    try {
        // Crear Stripe
        const stripe = Stripe('pk_test_51S4nWTKFtQrWkPCD3FRrULpKifZ43LK9m3RcNn9TFpbzYqNU36uInxGyKRuuV78HtuC5drNe0qeZWei34yKGiYeF00M9L6swJq');
        const elements = stripe.elements();
        
        // Crear card element
        const cardElement = elements.create('card');
        
        // Montar
        cardElement.mount('#card-element');
        
        console.log('✅ Stripe montado forzadamente');
        
        // Verificar después de un momento
        setTimeout(() => {
            const iframe = document.querySelector('#card-element iframe');
            if (iframe) {
                alert('🎉 ¡ÉXITO! Stripe iframe encontrado');
            } else {
                alert('❌ Stripe iframe NO encontrado');
            }
        }, 2000);
        
    } catch (error) {
        alert('❌ Error: ' + error.message);
        console.error('Error:', error);
    }
}

// Función global
function testStripeDirect() {
    forceStripe();
}

// Auto-ejecutar cuando se selecciona tarjeta
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado');
    
    const tarjetaRadio = document.getElementById('metodo_tarjeta');
    if (tarjetaRadio) {
        tarjetaRadio.addEventListener('change', function() {
            if (this.checked) {
                console.log('💳 Tarjeta seleccionada');
                
                // Mostrar contenedor
                const container = document.getElementById('stripe-card-container');
                if (container) {
                    container.style.display = 'block';
                }
                
                // Forzar Stripe después de mostrar
                setTimeout(forceStripe, 500);
            }
        });
    }
});

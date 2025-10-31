// Stripe Direct - Versión que funciona directamente
console.log('🔥 Stripe Direct iniciado');

// Función para crear Stripe directamente
function createStripeDirect() {
    console.log('🚀 Creando Stripe directo...');
    
    // Verificar Stripe
    if (typeof Stripe === 'undefined') {
        console.error('❌ Stripe no disponible');
        return;
    }
    
    // Inicializar
    const stripe = Stripe('pk_test_51S4nWTKFtQrWkPCD3FRrULpKifZ43LK9m3RcNn9TFpbzYqNU36uInxGyKRuuV78HtuC5drNe0qeZWei34yKGiYeF00M9L6swJq');
    const elements = stripe.elements();
    
    // Crear card element
    const cardElement = elements.create('card');
    
    // Montar directamente
    const container = document.getElementById('card-element');
    if (container) {
        container.innerHTML = '';
        cardElement.mount('#card-element');
        console.log('✅ Stripe montado directamente');
        return true;
    }
    
    return false;
}

// Función global para probar
function testStripeDirect() {
    console.log('🧪 Probando Stripe directo...');
    
    if (createStripeDirect()) {
        alert('✅ ¡Stripe funcionando!');
    } else {
        alert('❌ Error al crear Stripe');
    }
}

// Auto-inicializar cuando se selecciona tarjeta
document.addEventListener('DOMContentLoaded', function() {
    const tarjetaRadio = document.getElementById('metodo_tarjeta');
    if (tarjetaRadio) {
        tarjetaRadio.addEventListener('change', function() {
            if (this.checked) {
                console.log('💳 Tarjeta seleccionada - creando Stripe...');
                
                // Mostrar contenedor
                const container = document.getElementById('stripe-card-container');
                if (container) {
                    container.style.display = 'block';
                }
                
                // Crear Stripe después de un pequeño delay
                setTimeout(() => {
                    createStripeDirect();
                }, 300);
            }
        });
    }
});

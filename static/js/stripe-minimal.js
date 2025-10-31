// Stripe Payments - Versión Mínima y Directa
console.log('Script Stripe cargado');

// Función para inicializar cuando se selecciona tarjeta
function initStripeCard() {
    console.log('Inicializando Stripe Card...');
    
    // Verificar que Stripe esté disponible
    if (typeof Stripe === 'undefined') {
        console.error('❌ Stripe no está disponible');
        return;
    }
    
    console.log('✅ Stripe disponible');
    
    // Inicializar Stripe
    const stripe = Stripe('pk_test_51S4nWTKFtQrWkPCD3FRrULpKifZ43LK9m3RcNn9TFpbzYqNU36uInxGyKRuuV78HtuC5drNe0qeZWei34yKGiYeF00M9L6swJq');
    console.log('✅ Stripe inicializado');
    
    // Crear elementos
    const elements = stripe.elements();
    console.log('✅ Elements creado');
    
    // Crear elemento de tarjeta
    const cardElement = elements.create('card');
    console.log('✅ Card element creado');
    
    // Montar en el contenedor
    const container = document.getElementById('card-element');
    if (container) {
        console.log('✅ Contenedor encontrado');
        cardElement.mount('#card-element');
        console.log('✅ Card element montado');
        
        // Verificar que se montó
        setTimeout(() => {
            const mounted = document.querySelector('#card-element iframe');
            if (mounted) {
                console.log('✅ Stripe iframe encontrado - ÉXITO!');
            } else {
                console.error('❌ Stripe iframe NO encontrado');
            }
        }, 1000);
        
    } else {
        console.error('❌ Contenedor #card-element no encontrado');
    }
}

// Esperar a que la página cargue
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado');
    
    // Buscar botones de método de pago
    const tarjetaRadio = document.getElementById('metodo_tarjeta');
    if (tarjetaRadio) {
        console.log('Radio button de tarjeta encontrado');
        tarjetaRadio.addEventListener('change', function() {
            if (this.checked) {
                console.log('Tarjeta seleccionada');
                
                // Mostrar contenedor
                const container = document.getElementById('stripe-card-container');
                if (container) {
                    container.style.display = 'block';
                    console.log('Contenedor mostrado');
                    
                    // Inicializar Stripe después de mostrar el contenedor
                    setTimeout(initStripeCard, 100);
                }
            }
        });
    } else {
        console.error('Radio button de tarjeta NO encontrado');
    }
});

// Stripe Payments - Versión que SÍ funciona
console.log('🔧 Stripe Working Script cargado');

// Variables globales
let stripe, elements, cardElement;

// Función principal
function initStripeWorking() {
    console.log('🚀 Inicializando Stripe Working...');
    
    // Verificar que Stripe esté disponible
    if (typeof Stripe === 'undefined') {
        console.error('❌ Stripe no está disponible');
        return;
    }
    
    console.log('✅ Stripe disponible');
    
    // Inicializar Stripe
    stripe = Stripe('pk_test_51S4nWTKFtQrWkPCD3FRrULpKifZ43LK9m3RcNn9TFpbzYqNU36uInxGyKRuuV78HtuC5drNe0qeZWei34yKGiYeF00M9L6swJq');
    
    // Crear elements
    elements = stripe.elements({
        appearance: {
            theme: 'stripe',
            variables: {
                colorPrimary: '#4CAF50',
                colorBackground: '#ffffff',
                colorText: '#30313d',
                colorDanger: '#df1b41',
                fontFamily: 'system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '8px'
            }
        }
    });
    
    console.log('✅ Stripe y Elements inicializados');
    
    // Configurar listeners
    setupListeners();
}

function setupListeners() {
    console.log('🔧 Configurando listeners...');
    
    // Buscar el radio button de tarjeta
    const tarjetaRadio = document.getElementById('metodo_tarjeta');
    if (tarjetaRadio) {
        console.log('✅ Radio button de tarjeta encontrado');
        tarjetaRadio.addEventListener('change', function() {
            if (this.checked) {
                console.log('💳 Tarjeta seleccionada');
                showStripeCard();
            }
        });
    } else {
        console.error('❌ Radio button de tarjeta NO encontrado');
    }
}

function showStripeCard() {
    console.log('🎯 Mostrando Stripe Card...');
    
    // Mostrar contenedor
    const container = document.getElementById('stripe-card-container');
    if (container) {
        container.style.display = 'block';
        console.log('✅ Contenedor mostrado');
        
        // Crear y montar card element
        setTimeout(() => {
            createCardElement();
        }, 200);
    } else {
        console.error('❌ Contenedor stripe-card-container NO encontrado');
    }
}

function createCardElement() {
    console.log('🃏 Creando Card Element...');
    
    const cardContainer = document.getElementById('card-element');
    if (!cardContainer) {
        console.error('❌ Contenedor card-element NO encontrado');
        return;
    }
    
    // Limpiar contenedor
    cardContainer.innerHTML = '';
    console.log('✅ Contenedor limpiado');
    
    try {
        // Crear card element
        cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                },
                invalid: {
                    color: '#9e2146',
                },
            },
        });
        
        // Manejar eventos
        cardElement.on('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
                displayError.style.display = 'block';
            } else {
                displayError.textContent = '';
                displayError.style.display = 'none';
            }
        });
        
        // Montar elemento
        cardElement.mount('#card-element');
        console.log('✅ Card Element montado');
        
        // Verificar que se montó
        setTimeout(() => {
            const iframe = document.querySelector('#card-element iframe');
            if (iframe) {
                console.log('🎉 ¡ÉXITO! Stripe iframe encontrado');
            } else {
                console.error('❌ Stripe iframe NO encontrado');
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error creando card element:', error);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado');
    setTimeout(initStripeWorking, 500);
});

// También intentar inicializar cuando la ventana cargue
window.addEventListener('load', function() {
    console.log('🪟 Ventana cargada');
    setTimeout(initStripeWorking, 1000);
});

// Función de prueba global
function testStripe() {
    console.log('🧪 Función de prueba ejecutada');
    
    if (typeof Stripe === 'undefined') {
        alert('❌ Stripe no está disponible');
        return;
    }
    
    if (!stripe) {
        alert('❌ Stripe no está inicializado');
        return;
    }
    
    if (!elements) {
        alert('❌ Elements no está inicializado');
        return;
    }
    
    // Forzar creación del card element
    const cardContainer = document.getElementById('card-element');
    if (cardContainer) {
        cardContainer.innerHTML = '';
        
        try {
            const testCardElement = elements.create('card');
            testCardElement.mount('#card-element');
            alert('✅ Stripe funcionando correctamente!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    } else {
        alert('❌ Contenedor card-element no encontrado');
    }
}

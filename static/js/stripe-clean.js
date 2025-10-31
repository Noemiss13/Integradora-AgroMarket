// Stripe Clean - Versión simple y funcional
console.log('🧹 Stripe Clean iniciado');

let stripe, elements, cardElement;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado');
    
    // Inicializar Stripe
    stripe = Stripe('pk_test_51S4nWTKFtQrWkPCD3FRrULpKifZ43LK9m3RcNn9TFpbzYqNU36uInxGyKRuuV78HtuC5drNe0qeZWei34yKGiYeF00M9L6swJq');
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
    
    console.log('✅ Stripe inicializado');
    
    // Configurar listeners
    setupListeners();
});

function setupListeners() {
    const tarjetaRadio = document.getElementById('metodo_tarjeta');
    if (tarjetaRadio) {
        tarjetaRadio.addEventListener('change', function() {
            if (this.checked) {
                showStripeCard();
            } else {
                hideStripeCard();
            }
        });
    }
}

function showStripeCard() {
    console.log('💳 Mostrando Stripe Card...');
    
    const container = document.getElementById('stripe-card-container');
    if (container) {
        container.style.display = 'block';
        
        // Crear card element después de mostrar
        setTimeout(() => {
            createCardElement();
        }, 200);
    }
}

function hideStripeCard() {
    console.log('❌ Ocultando Stripe Card...');
    
    const container = document.getElementById('stripe-card-container');
    if (container) {
        container.style.display = 'none';
    }
    
    // Desmontar elemento
    if (cardElement) {
        try {
            cardElement.unmount();
            cardElement = null;
        } catch (error) {
            console.log('Error desmontando:', error);
        }
    }
}

function createCardElement() {
    console.log('🃏 Creando Card Element...');
    
    const container = document.getElementById('card-element');
    if (!container) {
        console.error('❌ Contenedor card-element no encontrado');
        return;
    }
    
    // Limpiar contenedor
    container.innerHTML = '';
    
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
                console.log('🎉 ¡ÉXITO! Stripe funcionando');
            } else {
                console.error('❌ Stripe iframe no encontrado');
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error creando card element:', error);
    }
}

// Función para probar
function testStripeDirect() {
    console.log('🧪 Probando Stripe...');
    
    if (cardElement) {
        alert('✅ Stripe funcionando correctamente!');
    } else {
        alert('❌ Stripe no está creado');
        createCardElement();
    }
}

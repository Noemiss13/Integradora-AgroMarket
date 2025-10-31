// Stripe Separate Fields - Campos separados y bonitos
console.log('💳 Stripe Separate Fields iniciado');

let stripe, elements, cardNumberElement, cardExpiryElement, cardCvcElement;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado - Stripe Separate');
    
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
    setupPaymentMethodListeners();
});

function setupPaymentMethodListeners() {
    const tarjetaRadio = document.getElementById('metodo_tarjeta');
    if (tarjetaRadio) {
        tarjetaRadio.addEventListener('change', function() {
            if (this.checked) {
                showStripeFields();
            } else {
                hideStripeFields();
            }
        });
    }
}

function showStripeFields() {
    console.log('💳 Mostrando campos de Stripe separados...');
    
    const container = document.getElementById('stripe-card-container');
    if (container) {
        container.style.display = 'block';
        
        // Crear campos separados
        setTimeout(() => {
            createSeparateFields();
        }, 100);
    }
}

function hideStripeFields() {
    console.log('❌ Ocultando campos de Stripe...');
    
    const container = document.getElementById('stripe-card-container');
    if (container) {
        container.style.display = 'none';
    }
    
    // Desmontar elementos
    if (cardNumberElement) {
        try {
            cardNumberElement.unmount();
            cardNumberElement = null;
        } catch (error) {
            console.log('Error desmontando cardNumber:', error);
        }
    }
    
    if (cardExpiryElement) {
        try {
            cardExpiryElement.unmount();
            cardExpiryElement = null;
        } catch (error) {
            console.log('Error desmontando cardExpiry:', error);
        }
    }
    
    if (cardCvcElement) {
        try {
            cardCvcElement.unmount();
            cardCvcElement = null;
        } catch (error) {
            console.log('Error desmontando cardCvc:', error);
        }
    }
}

function createSeparateFields() {
    console.log('🔧 Creando campos separados...');
    
    // Limpiar contenedores
    const cardNumberContainer = document.getElementById('card-number');
    const cardExpiryContainer = document.getElementById('card-expiry');
    const cardCvcContainer = document.getElementById('card-cvc');
    
    if (cardNumberContainer) cardNumberContainer.innerHTML = '';
    if (cardExpiryContainer) cardExpiryContainer.innerHTML = '';
    if (cardCvcContainer) cardCvcContainer.innerHTML = '';
    
    try {
        // Crear campo de número de tarjeta
        cardNumberElement = elements.create('cardNumber', {
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
        
        // Crear campo de fecha de vencimiento
        cardExpiryElement = elements.create('cardExpiry', {
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
        
        // Crear campo de CVC
        cardCvcElement = elements.create('cardCvc', {
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
        
        // Montar elementos
        if (cardNumberContainer) {
            cardNumberElement.mount('#card-number');
        }
        
        if (cardExpiryContainer) {
            cardExpiryElement.mount('#card-expiry');
        }
        
        if (cardCvcContainer) {
            cardCvcElement.mount('#card-cvc');
        }
        
        // Manejar errores
        cardNumberElement.on('change', function(event) {
            displayError('card-number-error', event.error);
        });
        
        cardExpiryElement.on('change', function(event) {
            displayError('card-expiry-error', event.error);
        });
        
        cardCvcElement.on('change', function(event) {
            displayError('card-cvc-error', event.error);
        });
        
        console.log('✅ Campos separados creados y montados');
        
    } catch (error) {
        console.error('❌ Error creando campos separados:', error);
    }
}

function displayError(elementId, error) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        if (error) {
            errorElement.textContent = error.message;
            errorElement.style.display = 'block';
        } else {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }
}

// Función para probar
function testStripeDirect() {
    console.log('🧪 Probando campos separados...');
    
    if (cardNumberElement && cardExpiryElement && cardCvcElement) {
        alert('✅ Campos separados funcionando correctamente!');
    } else {
        alert('❌ Campos separados no están creados');
    }
}

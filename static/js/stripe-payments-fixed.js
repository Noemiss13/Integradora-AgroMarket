// Stripe Payments Integration para AgroMarket - Versión Corregida
let stripe, elements, cardElement;

document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si estamos en la página del carrito
    if (document.querySelector('.carrito-main')) {
        initializeStripe();
        setupPaymentMethodHandlers();
    }
});

function initializeStripe() {
    try {
        // Configurar Stripe con tu clave real
        stripe = Stripe('pk_test_51S4nWTKFtQrWkPCD3FRrULpKifZ43LK9m3RcNn9TFpbzYqNU36uInxGyKRuuV78HtuC5drNe0qeZWei34yKGiYeF00M9L6swJq');
        
        // Crear elementos de Stripe
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
        
        console.log('Stripe inicializado correctamente');
        
    } catch (error) {
        console.error('Error inicializando Stripe:', error);
    }
}

function createCardElement() {
    if (!elements || cardElement) return;
    
    try {
        // Crear elemento de tarjeta
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
        
        // Manejar errores de validación
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
        
        console.log('Elemento de tarjeta creado');
        
    } catch (error) {
        console.error('Error creando elemento de tarjeta:', error);
    }
}

function mountCardElement() {
    const cardContainer = document.getElementById('card-element');
    
    if (!cardContainer) {
        console.log('Contenedor de tarjeta no encontrado');
        return;
    }
    
    if (cardContainer.hasChildNodes()) {
        console.log('Elemento ya montado');
        return;
    }
    
    if (!cardElement) {
        createCardElement();
    }
    
    if (cardElement && cardContainer) {
        try {
            cardElement.mount('#card-element');
            console.log('Elemento de tarjeta montado correctamente');
        } catch (error) {
            console.error('Error montando elemento de tarjeta:', error);
        }
    }
}

function setupPaymentMethodHandlers() {
    const form = document.querySelector('.checkout-form');
    if (!form) return;
    
    // Manejar envío del formulario
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const selectedPaymentMethod = document.querySelector('input[name="metodo_pago"]:checked');
        
        if (!selectedPaymentMethod) {
            alert('Por favor selecciona un método de pago');
            return;
        }
        
        if (selectedPaymentMethod.value === 'tarjeta') {
            // Procesar pago con Stripe
            await processStripePayment();
        } else {
            // Procesar otros métodos de pago (efectivo, transferencia)
            processOtherPayment(selectedPaymentMethod.value);
        }
    });
    
    // Manejar cambios en método de pago
    const paymentMethods = document.querySelectorAll('input[name="metodo_pago"]');
    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            const cardContainer = document.getElementById('stripe-card-container');
            const cardErrors = document.getElementById('card-errors');
            
            if (this.value === 'tarjeta') {
                if (cardContainer) cardContainer.style.display = 'block';
                if (cardErrors) cardErrors.style.display = 'block';
                // Montar elementos de Stripe cuando se selecciona tarjeta
                setTimeout(() => {
                    mountCardElement();
                }, 200);
            } else {
                if (cardContainer) cardContainer.style.display = 'none';
                if (cardErrors) cardErrors.style.display = 'none';
            }
        });
    });
}

async function processStripePayment() {
    const submitButton = document.getElementById('stripe-payment-button');
    const loadingSpinner = document.getElementById('payment-loading');
    
    try {
        // Mostrar loading
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Procesando...';
        }
        if (loadingSpinner) loadingSpinner.style.display = 'block';
        
        // Crear Payment Intent
        const response = await fetch('/comprador/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Confirmar pago
        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
            data.client_secret,
            {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: document.getElementById('nombre_titular')?.value || 'Cliente AgroMarket',
                    },
                }
            }
        );
        
        if (stripeError) {
            throw new Error(stripeError.message);
        }
        
        // Pago exitoso
        if (paymentIntent.status === 'succeeded') {
            // Limpiar carrito
            sessionStorage.removeItem('carrito');
            
            // Redirigir a página de éxito
            window.location.href = '/comprador/stripe-success';
        }
        
    } catch (error) {
        console.error('Error en el pago:', error);
        showPaymentError(error.message);
    } finally {
        // Ocultar loading
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Proceder al pago';
        }
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

function processOtherPayment(method) {
    // Para métodos que no son Stripe, usar el formulario normal
    const form = document.querySelector('.checkout-form');
    if (form) {
        form.submit();
    }
}

function showPaymentError(message) {
    const errorContainer = document.getElementById('payment-error');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    } else {
        alert('Error en el pago: ' + message);
    }
}

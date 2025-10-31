// Stripe Payments Integration para AgroMarket
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si estamos en la página del carrito
    if (document.querySelector('.carrito-main')) {
        initializeStripe();
    }
});

function initializeStripe() {
    // Configurar Stripe con tu clave real
    const stripe = Stripe('pk_test_51S4nWTKFtQrWkPCD3FRrULpKifZ43LK9m3RcNn9TFpbzYqNU36uInxGyKRuuV78HtuC5drNe0qeZWei34yKGiYeF00M9L6swJq');
    
    // Elementos del DOM
    const form = document.querySelector('.checkout-form');
    const stripeButton = document.getElementById('stripe-payment-button');
    
    if (!form || !stripeButton) return;
    
    // Crear elementos de Stripe
    const elements = stripe.elements({
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
    
    // Crear elemento de tarjeta
    const cardElement = elements.create('card', {
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
    
    // Función para montar elementos cuando se necesiten
    function mountCardElement() {
        const cardContainer = document.getElementById('card-element');
        if (cardContainer && !cardContainer.hasChildNodes()) {
            cardElement.mount('#card-element');
        }
    }
    
    // Montar inmediatamente si el contenedor existe
    mountCardElement();
    
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
            await processStripePayment(stripe, cardElement);
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
                setTimeout(mountCardElement, 100);
            } else {
                if (cardContainer) cardContainer.style.display = 'none';
                if (cardErrors) cardErrors.style.display = 'none';
            }
        });
    });
}

async function processStripePayment(stripe, cardElement) {
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
            body: JSON.stringify({
                // Datos adicionales si los necesitas
            })
        });
        
        const { client_secret, error } = await response.json();
        
        if (error) {
            throw new Error(error);
        }
        
        // Confirmar pago
        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
            client_secret,
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

// Función para formatear número de tarjeta
function formatCardNumber(input) {
    let value = input.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    if (formattedValue.length > 19) formattedValue = formattedValue.substring(0, 19);
    input.value = formattedValue;
}

// Función para formatear fecha de vencimiento
function formatExpiryDate(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    input.value = value;
}

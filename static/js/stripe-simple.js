// Stripe Payments Integration - Versión Simple
let stripe, elements, cardElement;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.carrito-main')) {
        initStripe();
    }
});

function initStripe() {
    console.log('Inicializando Stripe...');
    
    // Leer la clave desde el template
    const publishableKey = 'pk_test_51S4nWTKFtQrWkPCD3FRrULpKifZ43LK9m3RcNn9TFpbzYqNU36uInxGyKRuuV78HtuC5drNe0qeZWei34yKGiYeF00M9L6swJq';
    
    // Inicializar Stripe
    stripe = Stripe(publishableKey);
    
    // Crear elementos
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
    
    // Configurar event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Escuchar cambios en método de pago
    const paymentMethods = document.querySelectorAll('input[name="metodo_pago"]');
    
    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            console.log('Método de pago seleccionado:', this.value);
            
            if (this.value === 'tarjeta') {
                showStripeFields();
            } else {
                hideStripeFields();
            }
        });
    });
    
    // Escuchar envío del formulario
    const form = document.querySelector('.checkout-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

function showStripeFields() {
    console.log('Mostrando campos de Stripe...');
    
    const container = document.getElementById('stripe-card-container');
    const errorContainer = document.getElementById('card-errors');
    
    if (container) {
        container.style.display = 'block';
    }
    
    if (errorContainer) {
        errorContainer.style.display = 'block';
    }
    
    // Crear y montar elemento de tarjeta
    createAndMountCard();
}

function hideStripeFields() {
    console.log('Ocultando campos de Stripe...');
    
    const container = document.getElementById('stripe-card-container');
    const errorContainer = document.getElementById('card-errors');
    
    if (container) {
        container.style.display = 'none';
    }
    
    if (errorContainer) {
        errorContainer.style.display = 'none';
    }
    
    // Desmontar elemento si existe
    if (cardElement) {
        cardElement.unmount();
        cardElement = null;
    }
}

function createAndMountCard() {
    console.log('Creando elemento de tarjeta...');
    
    // Limpiar contenedor
    const cardContainer = document.getElementById('card-element');
    console.log('Contenedor encontrado:', cardContainer);
    
    if (cardContainer) {
        cardContainer.innerHTML = '';
        console.log('Contenedor limpiado');
    } else {
        console.error('No se encontró el contenedor #card-element');
        return;
    }
    
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
    
    // Manejar eventos del elemento
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
    if (cardContainer) {
        cardElement.mount('#card-element');
        console.log('Elemento de tarjeta montado correctamente');
    } else {
        console.error('No se encontró el contenedor #card-element');
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const selectedPaymentMethod = document.querySelector('input[name="metodo_pago"]:checked');
    
    if (!selectedPaymentMethod) {
        alert('Por favor selecciona un método de pago');
        return;
    }
    
    if (selectedPaymentMethod.value === 'tarjeta') {
        await processStripePayment();
    } else {
        processOtherPayment();
    }
}

async function processStripePayment() {
    console.log('Procesando pago con Stripe...');
    
    const submitButton = document.getElementById('stripe-payment-button');
    const loadingSpinner = document.getElementById('payment-loading');
    
    try {
        // Mostrar loading
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Procesando...';
        }
        if (loadingSpinner) {
            loadingSpinner.style.display = 'block';
        }
        
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
        
        console.log('Payment Intent creado:', data.client_secret);
        
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
            console.log('Pago exitoso:', paymentIntent.id);
            
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
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
    }
}

function processOtherPayment() {
    console.log('Procesando pago con método alternativo...');
    
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
        
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    } else {
        alert('Error en el pago: ' + message);
    }
}

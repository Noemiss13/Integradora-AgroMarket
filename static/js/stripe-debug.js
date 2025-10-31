// Stripe Payments Integration - Versión con Debug Completo
let stripe, elements, cardElement;

// Esperar a que todo esté cargado
window.addEventListener('load', function() {
    console.log('Página completamente cargada');
    if (document.querySelector('.carrito-main')) {
        console.log('Página de carrito detectada');
        initStripe();
    } else {
        console.log('No es página de carrito');
    }
});

function initStripe() {
    console.log('=== INICIANDO STRIPE ===');
    
    // Verificar que Stripe esté disponible
    if (typeof Stripe === 'undefined') {
        console.error('Stripe no está disponible. Verifica que el script se haya cargado.');
        return;
    }
    
    console.log('Stripe disponible:', typeof Stripe);
    
    // Leer la clave
    const publishableKey = 'pk_test_51S4nWTKFtQrWkPCD3FRrULpKifZ43LK9m3RcNn9TFpbzYqNU36uInxGyKRuuV78HtuC5drNe0qeZWei34yKGiYeF00M9L6swJq';
    console.log('Clave Stripe:', publishableKey.substring(0, 20) + '...');
    
    try {
        // Inicializar Stripe
        stripe = Stripe(publishableKey);
        console.log('Stripe inicializado:', stripe);
        
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
        
        console.log('Elements creado:', elements);
        
        // Configurar event listeners
        setupEventListeners();
        
        console.log('=== STRIPE INICIALIZADO CORRECTAMENTE ===');
        
    } catch (error) {
        console.error('Error inicializando Stripe:', error);
    }
}

function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Escuchar cambios en método de pago
    const paymentMethods = document.querySelectorAll('input[name="metodo_pago"]');
    console.log('Métodos de pago encontrados:', paymentMethods.length);
    
    paymentMethods.forEach((method, index) => {
        console.log(`Configurando método ${index}:`, method.value);
        
        method.addEventListener('change', function() {
            console.log('Método de pago cambiado a:', this.value);
            
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
        console.log('Formulario encontrado');
        form.addEventListener('submit', handleFormSubmit);
    } else {
        console.log('Formulario no encontrado');
    }
}

function showStripeFields() {
    console.log('=== MOSTRANDO CAMPOS DE STRIPE ===');
    
    const container = document.getElementById('stripe-card-container');
    const errorContainer = document.getElementById('card-errors');
    
    console.log('Contenedor encontrado:', container);
    console.log('Contenedor de errores encontrado:', errorContainer);
    
    if (container) {
        container.style.display = 'block';
        console.log('Contenedor mostrado');
    }
    
    if (errorContainer) {
        errorContainer.style.display = 'block';
        console.log('Contenedor de errores mostrado');
    }
    
    // Crear y montar elemento de tarjeta
    setTimeout(() => {
        createAndMountCard();
    }, 100);
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
        try {
            cardElement.unmount();
            cardElement = null;
            console.log('Elemento desmontado');
        } catch (error) {
            console.log('Error desmontando elemento:', error);
        }
    }
}

function createAndMountCard() {
    console.log('=== CREANDO ELEMENTO DE TARJETA ===');
    
    // Verificar que elements esté disponible
    if (!elements) {
        console.error('Elements no está disponible');
        return;
    }
    
    // Limpiar contenedor
    const cardContainer = document.getElementById('card-element');
    console.log('Contenedor de tarjeta:', cardContainer);
    
    if (!cardContainer) {
        console.error('No se encontró el contenedor #card-element');
        return;
    }
    
    // Limpiar contenido
    cardContainer.innerHTML = '';
    console.log('Contenedor limpiado');
    
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
        
        console.log('Elemento de tarjeta creado:', cardElement);
        
        // Manejar eventos del elemento
        cardElement.on('change', function(event) {
            console.log('Evento de cambio en tarjeta:', event);
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
        console.log('Elemento montado en #card-element');
        
        // Verificar que se montó correctamente
        setTimeout(() => {
            const mountedElement = document.querySelector('#card-element .StripeElement');
            console.log('Elemento montado verificado:', mountedElement);
            
            if (mountedElement) {
                console.log('✅ Elemento de Stripe montado correctamente');
            } else {
                console.error('❌ Elemento de Stripe NO se montó correctamente');
            }
        }, 500);
        
    } catch (error) {
        console.error('Error creando/montando elemento de tarjeta:', error);
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    console.log('Formulario enviado');
    
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
        console.log('Respuesta del servidor:', data);
        
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

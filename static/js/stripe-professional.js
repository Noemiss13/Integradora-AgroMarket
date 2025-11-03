// Stripe Professional - Versión limpia y funcional
console.log('💼 Stripe Professional iniciado');

let stripe, elements, cardElement;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado');
    
    // Inicializar Stripe con diseño personalizado
    stripe = Stripe('pk_test_51S4nWTKFtQrWkPCD3FRrULpKifZ43LK9m3RcNn9TFpbzYqNU36uInxGyKRuuV78HtuC5drNe0qeZWei34yKGiYeF00M9L6swJq');
    elements = stripe.elements({
        appearance: {
            theme: 'flat',
            variables: {
                colorPrimary: '#2ba656',
                colorBackground: '#ffffff',
                colorText: '#2c3e50',
                colorDanger: '#e74c3c',
                colorTextSecondary: '#6c757d',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                spacingUnit: '4px',
                borderRadius: '12px',
                fontSizeBase: '16px'
            },
            rules: {
                '.Input': {
                    backgroundColor: '#ffffff',
                    border: '2px solid #e9ecef',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '16px',
                    transition: 'all 0.3s ease'
                },
                '.Input:focus': {
                    borderColor: '#2ba656',
                    boxShadow: '0 0 0 3px rgba(43, 166, 86, 0.1)'
                },
                '.Input--invalid': {
                    borderColor: '#e74c3c',
                    color: '#e74c3c'
                },
                '.Label': {
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#2c3e50',
                    marginBottom: '8px'
                }
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
        }, 300);
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
                    color: '#333333',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    '::placeholder': {
                        color: '#999999',
                    },
                },
                invalid: {
                    color: '#e74c3c',
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

// Función para procesar el pago real
async function processStripePayment() {
    console.log('💳 Procesando pago con Stripe...');
    
    if (!cardElement) {
        alert('❌ Error: Campo de tarjeta no está disponible');
        return;
    }
    
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
        
        // Calcular total del carrito
        let totalAmount = 0;
        const totalElement = document.querySelector('.summary-line.total span:last-child');
        if (totalElement) {
            // Extraer el número del texto (ej: "$125.50" -> 125.50)
            const totalText = totalElement.textContent.replace(/[^0-9.]/g, '');
            totalAmount = parseFloat(totalText) || 0;
        }
        
        if (totalAmount <= 0) {
            throw new Error('No se pudo calcular el total del carrito');
        }
        
        console.log('💰 Total a cobrar:', totalAmount);
        
        // Crear Payment Intent con el total
        const response = await fetch('/comprador/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: Math.round(totalAmount * 100) // Convertir a centavos
            })
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
            console.log('🎉 Pago exitoso:', paymentIntent.id);
            
            // Guardar información del pago para mostrar en la página de éxito
            localStorage.setItem('totalAmount', totalAmount.toFixed(2));
            localStorage.setItem('paymentIntentId', paymentIntent.id);
            localStorage.setItem('paymentDate', new Date().toISOString());
            
            // Limpiar carrito
            sessionStorage.removeItem('carrito');
            
            // Redirigir a página de éxito
            window.location.href = '/comprador/stripe-success';
        }
        
    } catch (error) {
        console.error('❌ Error en el pago:', error);
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

// Configurar el formulario para manejar pagos
function setupFormSubmission() {
    const form = document.querySelector('.checkout-form');
    
    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const selectedPaymentMethod = document.querySelector('input[name="metodo_pago"]:checked');
            
            if (!selectedPaymentMethod) {
                alert('Por favor selecciona un método de pago');
                return;
            }
            
            if (selectedPaymentMethod.value === 'tarjeta') {
                await processStripePayment();
            } else {
                // Procesar otros métodos de pago
                processOtherPayment();
            }
        });
    }
}

function processOtherPayment() {
    console.log('Procesando pago con método alternativo...');
    
    const form = document.querySelector('.checkout-form');
    if (form) {
        form.submit();
    }
}

// Inicializar el manejo del formulario
document.addEventListener('DOMContentLoaded', function() {
    setupFormSubmission();
});

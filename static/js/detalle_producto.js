// ===========================================
// JAVASCRIPT PARA DETALLE DE PRODUCTO
// ===========================================

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    const quantityInput = document.getElementById('quantity');
    const decreaseBtn = document.getElementById('decreaseBtn');
    const increaseBtn = document.getElementById('increaseBtn');
    const maxStock = parseInt(quantityInput.getAttribute('max'));
    
    // Quantity controls
    decreaseBtn.addEventListener('click', function() {
        let currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
        }
        updateButtonStates();
    });
    
    increaseBtn.addEventListener('click', function() {
        let currentValue = parseInt(quantityInput.value);
        if (currentValue < maxStock) {
            quantityInput.value = currentValue + 1;
        }
        updateButtonStates();
    });
    
    // Validate quantity input directly (only when user types)
    quantityInput.addEventListener('input', function() {
        let value = parseInt(this.value);
        if (value > maxStock) {
            this.value = maxStock;
            showFlashMessage(`No puedes agregar más de ${maxStock} unidades. Stock disponible: ${maxStock}`, 'warning');
        } else if (value < 1) {
            this.value = 1;
        }
        updateButtonStates();
    });
    
    // Validate quantity input on blur (when user leaves the field)
    quantityInput.addEventListener('blur', function() {
        let value = parseInt(this.value);
        if (isNaN(value) || value < 1) {
            this.value = 1;
        } else if (value > maxStock) {
            this.value = maxStock;
            showFlashMessage(`No puedes agregar más de ${maxStock} unidades. Stock disponible: ${maxStock}`, 'warning');
        }
        updateButtonStates();
    });
    
    // Update button states based on current quantity
    function updateButtonStates() {
        let currentValue = parseInt(quantityInput.value);
        decreaseBtn.disabled = currentValue <= 1;
        increaseBtn.disabled = currentValue >= maxStock;
    }
    
    // Initialize button states
    updateButtonStates();
    
    // Add to cart functionality
    document.querySelector('.add-to-cart-btn').addEventListener('click', function() {
        const quantity = parseInt(quantityInput.value);
        const productId = getProductId();
        
        if (!productId) {
            showFlashMessage('Error: No se pudo obtener el ID del producto', 'danger');
            return;
        }
        
        if (quantity < 1) {
            showFlashMessage('La cantidad debe ser mayor a 0', 'warning');
            return;
        }
        
        // Crear formulario para enviar datos al backend
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/comprador/agregar_carrito/${productId}`;
        
        const cantidadInput = document.createElement('input');
        cantidadInput.type = 'hidden';
        cantidadInput.name = 'cantidad';
        cantidadInput.value = quantity;
        
        form.appendChild(cantidadInput);
        document.body.appendChild(form);
        form.submit();
    });
    
    // Buy now functionality
    document.querySelector('.buy-now-btn').addEventListener('click', function() {
        const quantity = parseInt(quantityInput.value);
        const productId = getProductId();
        
        if (!productId) {
            showFlashMessage('Error: No se pudo obtener el ID del producto', 'danger');
            return;
        }
        
        if (quantity < 1) {
            showFlashMessage('La cantidad debe ser mayor a 0', 'warning');
            return;
        }
        
        // Agregar al carrito y redirigir a checkout
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/comprador/agregar_carrito/${productId}`;
        
        const cantidadInput = document.createElement('input');
        cantidadInput.type = 'hidden';
        cantidadInput.name = 'cantidad';
        cantidadInput.value = quantity;
        
        // Campo oculto para indicar que es "comprar ahora"
        const buyNowInput = document.createElement('input');
        buyNowInput.type = 'hidden';
        buyNowInput.name = 'buy_now';
        buyNowInput.value = '1';
        
        form.appendChild(cantidadInput);
        form.appendChild(buyNowInput);
        document.body.appendChild(form);
        form.submit();
    });
    
    // Auto-dismiss flash messages
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(function(message) {
        setTimeout(function() {
            message.classList.add('slide-out');
            
            // Remove element after animation completes
            setTimeout(function() {
                message.remove();
            }, 300); // Match animation duration
        }, 4000);
        
        // Optional: Add click to dismiss
        message.addEventListener('click', function() {
            message.classList.add('slide-out');
            setTimeout(function() {
                message.remove();
            }, 300);
        });
        
        // Add cursor pointer to indicate clickable
        message.style.cursor = 'pointer';
    });
});

// Function to get product ID from data attribute
function getProductId() {
    // Try to get from data attribute on body or main element
    const mainElement = document.querySelector('main');
    if (mainElement && mainElement.dataset.productId) {
        return mainElement.dataset.productId;
    }
    
    // Fallback: try to get from URL or other sources
    const pathParts = window.location.pathname.split('/');
    const productId = pathParts[pathParts.length - 1];
    return productId;
}

// Function to show flash messages dynamically
function showFlashMessage(message, category = 'info') {
    const flashMessagesContainer = document.querySelector('.flash-messages');
    
    if (!flashMessagesContainer) {
        // Create container if it doesn't exist
        const container = document.createElement('div');
        container.className = 'flash-messages';
        document.querySelector('main').insertBefore(container, document.querySelector('main').firstChild);
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `flash-message ${category}`;
    
    // Add icon based on category
    let iconClass = 'fas fa-info-circle';
    if (category === 'success') {
        iconClass = 'fas fa-check-circle';
    } else if (category === 'danger') {
        iconClass = 'fas fa-exclamation-circle';
    } else if (category === 'warning') {
        iconClass = 'fas fa-exclamation-triangle';
    }
    
    messageDiv.innerHTML = `
        <i class="${iconClass}"></i>
        ${message}
    `;
    
    const container = document.querySelector('.flash-messages');
    container.appendChild(messageDiv);
    
    // Auto-dismiss after 4 seconds
    setTimeout(function() {
        messageDiv.classList.add('slide-out');
        setTimeout(function() {
            messageDiv.remove();
        }, 300);
    }, 4000);
    
    // Click to dismiss
    messageDiv.addEventListener('click', function() {
        messageDiv.classList.add('slide-out');
        setTimeout(function() {
            messageDiv.remove();
        }, 300);
    });
    
    messageDiv.style.cursor = 'pointer';
}

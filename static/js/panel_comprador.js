/**
 * Funciones para el panel principal del comprador
 */

// Función para agregar producto al carrito
function agregarAlCarrito(productoId) {
    // Deshabilitar el botón temporalmente
    const boton = event.target;
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Agregando...';
    
    fetch('/comprador/agregar_carrito_ajax', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            producto_id: productoId,
            cantidad: 1
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            mostrarNotificacion(data.message || 'Producto agregado al carrito', 'success');
            actualizarContadorCarrito();
        } else {
            mostrarNotificacion(data.message || 'Error al agregar el producto', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarNotificacion('Error de conexión. Intenta nuevamente.', 'error');
    })
    .finally(() => {
        // Rehabilitar el botón
        boton.disabled = false;
        boton.textContent = textoOriginal;
    });
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.textContent = mensaje;
    
    // Estilos de la notificación
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Colores según el tipo
    const colores = {
        success: '#4CAF50',
        error: '#f44336',
        info: '#2196F3'
    };
    notificacion.style.backgroundColor = colores[tipo] || colores.info;
    
    // Agregar al DOM
    document.body.appendChild(notificacion);
    
    // Animar entrada
    setTimeout(() => {
        notificacion.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notificacion.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notificacion);
        }, 300);
    }, 3000);
}

// Función para actualizar contador del carrito
function actualizarContadorCarrito() {
    // Esta función se puede implementar cuando se tenga un contador en el nav
    console.log('Contador de carrito actualizado');
}

// Función para búsqueda en tiempo real
function inicializarBusqueda() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        let timeoutId;
        searchInput.addEventListener('input', function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const query = this.value.trim();
                if (query.length > 2) {
                    buscarProductos(query);
                }
            }, 500);
        });
    }
}

// Función para buscar productos
function buscarProductos(query) {
    fetch(`/comprador/buscar?q=${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
        if (data.productos) {
            mostrarResultadosBusqueda(data.productos);
        }
    })
    .catch(error => {
        console.error('Error en búsqueda:', error);
    });
}

// Función para mostrar resultados de búsqueda
function mostrarResultadosBusqueda(productos) {
    // Implementar lógica para mostrar resultados
    console.log('Resultados de búsqueda:', productos);
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    inicializarBusqueda();
    console.log('Panel del comprador inicializado');
});

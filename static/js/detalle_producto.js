// ===========================================
// JAVASCRIPT PARA DETALLE DE PRODUCTO
// ===========================================

// Variables globales
let db;
let auth;
let productoData = null;
let productoId = null;
let currentRating = 0;
let imagenes = [];

// Inicializar Firebase
async function inicializarFirebase() {
    try {
        console.log('🔄 Inicializando Firebase...');
        
        // Esperar a que Firebase esté disponible
        let intentos = 0;
        const maxIntentos = 20;
        
        while (typeof firebase === 'undefined' && intentos < maxIntentos) {
            await new Promise(resolve => setTimeout(resolve, 250));
            intentos++;
        }
        
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK no se cargó');
        }
        
        if (!window.firebaseConfig) {
            throw new Error('Configuración de Firebase no disponible');
        }
        
        if (firebase.apps.length === 0) {
            firebase.initializeApp(window.firebaseConfig);
        }
        
        auth = firebase.auth();
        db = firebase.firestore();
        
        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            ignoreUndefinedProperties: true
        });
        
        console.log('✅ Firebase inicializado');
        return true;
    } catch (error) {
        console.error('❌ Error inicializando Firebase:', error);
        return false;
    }
}

// Obtener ID del producto desde la URL o data attribute
function obtenerProductoId() {
    const main = document.querySelector('main[data-product-id]');
    if (main && main.dataset.productId) {
        return main.dataset.productId;
    }
    
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
}

// Cargar datos del producto
async function cargarProducto() {
    try {
        productoId = obtenerProductoId();
        console.log('📦 Cargando producto:', productoId);
        
        if (!db) {
            throw new Error('Base de datos no disponible');
        }
        
        const productoDoc = await db.collection('productos').doc(productoId).get();
        
        if (!productoDoc.exists) {
            throw new Error('Producto no encontrado');
        }
        
        productoData = { id: productoDoc.id, ...productoDoc.data() };
        console.log('✅ Producto cargado:', productoData);
        
        // Cargar imágenes (si hay múltiples)
        imagenes = [];
        if (productoData.imagen) {
            imagenes.push(productoData.imagen);
        }
        // Si hay más imágenes en un array
        if (productoData.imagenes && Array.isArray(productoData.imagenes)) {
            imagenes = [...imagenes, ...productoData.imagenes];
        }
        // Eliminar duplicados
        imagenes = [...new Set(imagenes.filter(img => img && img.trim() !== ''))];
        
        if (imagenes.length === 0) {
            imagenes.push('/static/images/product-placeholder.png');
        }
        
        mostrarProducto();
        await cargarInformacionVendedor();
        await cargarComentarios();
        
        // Ocultar loading y mostrar contenido
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('productContent').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Error cargando producto:', error);
        mostrarError(error.message);
    }
}

// Mostrar datos del producto en la UI
function mostrarProducto() {
    if (!productoData) return;
    
    // Título
    document.getElementById('productTitle').textContent = productoData.nombre || 'Sin nombre';
    document.getElementById('breadcrumb-product').textContent = productoData.nombre || 'Producto';
    
    // Categoría
    const categoria = productoData.categoria || 'otros';
    document.getElementById('productCategory').textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
    document.getElementById('breadcrumb-category').textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
    
    // Precio
    const precio = productoData.precio || 0;
    document.getElementById('productPrice').textContent = `$${precio.toFixed(2)} MXN`;
    
    // Stock
    const stock = productoData.stock || 0;
    const unidad = productoData.unidad || 'kg';
    document.getElementById('productStock').textContent = stock;
    document.getElementById('productUnit').textContent = unidad;
    document.getElementById('stockInfo').textContent = `Disponible: ${stock} ${unidad}`;
    
    // Descripción
    document.getElementById('productDescription').textContent = productoData.descripcion || 'Sin descripción disponible.';
    
    // Actualizar cantidad máxima
    const quantityInput = document.getElementById('quantity');
    quantityInput.setAttribute('max', stock);
    quantityInput.value = Math.min(parseInt(quantityInput.value), stock);
    
    // Galería de imágenes
    mostrarGalería();
    
    // Actualizar estado de botones
    actualizarEstadoBotones();
}

// Mostrar galería de imágenes
function mostrarGalería() {
    if (imagenes.length === 0) return;
    
    const mainImage = document.getElementById('mainImage');
    mainImage.src = imagenes[0];
    mainImage.alt = productoData.nombre || 'Producto';
    
    // Thumbnails
    const thumbnailGallery = document.getElementById('thumbnailGallery');
    
    if (imagenes.length > 1) {
        thumbnailGallery.innerHTML = imagenes.map((img, index) => `
            <div class="thumbnail-item ${index === 0 ? 'active' : ''}" data-index="${index}">
                <img src="${img}" alt="Vista ${index + 1}" onerror="this.src='/static/images/product-placeholder.png'">
            </div>
        `).join('');
        
        // Event listeners para thumbnails
        thumbnailGallery.querySelectorAll('.thumbnail-item').forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                cambiarImagenPrincipal(index);
                
                // Actualizar active
                thumbnailGallery.querySelectorAll('.thumbnail-item').forEach(thumb => {
                    thumb.classList.remove('active');
                });
                this.classList.add('active');
            });
        });
    } else {
        thumbnailGallery.innerHTML = '';
    }
}

// Cambiar imagen principal
function cambiarImagenPrincipal(index) {
    if (index >= 0 && index < imagenes.length) {
        document.getElementById('mainImage').src = imagenes[index];
    }
}

// Cargar información del vendedor
async function cargarInformacionVendedor() {
    try {
        if (!productoData || !productoData.vendedor_id) {
            console.log('⚠️ No hay vendedor_id en el producto');
            return;
        }
        
        const vendedorDoc = await db.collection('usuarios').doc(productoData.vendedor_id).get();
        
        if (vendedorDoc.exists) {
            const vendedorData = vendedorDoc.data();
            
            // Nombre del vendedor
            const nombreVendedor = vendedorData.nombre || productoData.vendedor_nombre || 'Vendedor';
            document.getElementById('sellerName').textContent = nombreVendedor;
            
            // Email
            document.getElementById('sellerEmail').textContent = vendedorData.email || productoData.vendedor_email || 'No disponible';
            
            // Avatar inicial
            const avatar = document.getElementById('sellerAvatar');
            if (nombreVendedor) {
                avatar.textContent = nombreVendedor.charAt(0).toUpperCase();
            }
            
            // Ubicación
            if (vendedorData.ubicacion) {
                document.getElementById('sellerLocation').textContent = vendedorData.ubicacion;
            }
            
            // Fecha de registro
            if (vendedorData.fecha_registro) {
                const fecha = new Date(vendedorData.fecha_registro.toDate());
                document.getElementById('sellerSince').textContent = fecha.getFullYear();
            }
            
            // Contar productos del vendedor
            const productosSnapshot = await db.collection('productos')
                .where('vendedor_id', '==', productoData.vendedor_id)
                .where('activo', '==', true)
                .get();
            document.getElementById('sellerProducts').textContent = productosSnapshot.size;
            
        } else {
            // Usar datos del producto como fallback
            document.getElementById('sellerName').textContent = productoData.vendedor_nombre || 'Vendedor';
        }
        
    } catch (error) {
        console.error('❌ Error cargando información del vendedor:', error);
    }
}

// Cargar comentarios
async function cargarComentarios() {
    try {
        if (!productoId) return;
        
        const comentariosSnapshot = await db.collection('comentarios')
            .where('producto_id', '==', productoId)
            .where('activo', '==', true)
            .orderBy('fecha', 'desc')
            .get();
        
        const comentarios = [];
        comentariosSnapshot.forEach(doc => {
            comentarios.push({ id: doc.id, ...doc.data() });
        });
        
        mostrarComentarios(comentarios);
        
        // Verificar si el usuario puede comentar
        verificarPermisoComentar();
        
    } catch (error) {
        console.error('❌ Error cargando comentarios:', error);
    }
}

// Mostrar comentarios en la UI
function mostrarComentarios(comentarios) {
    const commentsList = document.getElementById('commentsList');
    const commentsCount = document.getElementById('commentsCount');
    
    commentsCount.textContent = comentarios.length;
    
    if (comentarios.length === 0) {
        commentsList.innerHTML = `
            <div class="no-comments">
                <i class="fas fa-comment-slash"></i>
                <p>Aún no hay comentarios. Sé el primero en opinar.</p>
            </div>
        `;
        return;
    }
    
    commentsList.innerHTML = comentarios.map(comentario => {
        const fecha = comentario.fecha ? new Date(comentario.fecha.toDate()).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Fecha no disponible';
        
        const estrellas = '★'.repeat(comentario.calificacion || 0) + '☆'.repeat(5 - (comentario.calificacion || 0));
        
        return `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${comentario.nombre_usuario || 'Usuario'}</span>
                    <span class="comment-date">${fecha}</span>
                </div>
                <div class="comment-rating">${estrellas}</div>
                <div class="comment-text">${comentario.texto || ''}</div>
            </div>
        `;
    }).join('');
}

// Verificar si el usuario puede comentar
async function verificarPermisoComentar() {
    try {
        const user = auth.currentUser;
        if (user) {
            // Verificar si ya comentó
            const comentarioExistente = await db.collection('comentarios')
                .where('producto_id', '==', productoId)
                .where('usuario_id', '==', user.uid)
                .where('activo', '==', true)
                .get();
            
            if (comentarioExistente.empty) {
                document.getElementById('commentForm').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('❌ Error verificando permiso:', error);
    }
}

// Inicializar sistema de rating
function inicializarRating() {
    const stars = document.querySelectorAll('#ratingInput .fa-star');
    stars.forEach((star, index) => {
        star.addEventListener('mouseenter', function() {
            resaltarEstrellas(index + 1);
        });
        
        star.addEventListener('click', function() {
            currentRating = index + 1;
            resaltarEstrellas(currentRating);
        });
    });
    
    document.getElementById('ratingInput').addEventListener('mouseleave', function() {
        resaltarEstrellas(currentRating);
    });
}

// Resaltar estrellas
function resaltarEstrellas(rating) {
    const stars = document.querySelectorAll('#ratingInput .fa-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Publicar comentario
async function publicarComentario() {
    try {
        const user = auth.currentUser;
        if (!user) {
            mostrarNotificacion('❌ Debes iniciar sesión para comentar', 'error');
            return;
        }
        
        if (currentRating === 0) {
            mostrarNotificacion('❌ Por favor selecciona una calificación', 'error');
            return;
        }
        
        const texto = document.getElementById('commentText').value.trim();
        if (!texto) {
            mostrarNotificacion('❌ Por favor escribe un comentario', 'error');
            return;
        }
        
        // Obtener nombre del usuario
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        const nombreUsuario = userDoc.exists ? (userDoc.data().nombre || user.displayName || user.email.split('@')[0]) : (user.displayName || user.email.split('@')[0]);
        
        // Crear comentario
        const comentario = {
            producto_id: productoId,
            usuario_id: user.uid,
            nombre_usuario: nombreUsuario,
            texto: texto,
            calificacion: currentRating,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            activo: true
        };
        
        await db.collection('comentarios').add(comentario);
        
        mostrarNotificacion('✅ Comentario publicado exitosamente', 'success');
        
        // Limpiar formulario
        document.getElementById('commentText').value = '';
        currentRating = 0;
        resaltarEstrellas(0);
        document.getElementById('commentForm').style.display = 'none';
        
        // Recargar comentarios
        await cargarComentarios();
        
    } catch (error) {
        console.error('❌ Error publicando comentario:', error);
        mostrarNotificacion('❌ Error al publicar comentario', 'error');
    }
}

// Actualizar estado de botones de cantidad
function actualizarEstadoBotones() {
    const quantityInput = document.getElementById('quantity');
    const decreaseBtn = document.getElementById('decreaseBtn');
    const increaseBtn = document.getElementById('increaseBtn');
    const stock = parseInt(quantityInput.getAttribute('max')) || 0;
    const currentValue = parseInt(quantityInput.value) || 1;
    
    decreaseBtn.disabled = currentValue <= 1;
    increaseBtn.disabled = currentValue >= stock;
    
    // Deshabilitar botones si no hay stock
    if (stock <= 0) {
        document.getElementById('addToCartBtn').disabled = true;
        document.getElementById('buyNowBtn').disabled = true;
    }
}

// Agregar al carrito
async function agregarAlCarrito() {
    try {
        const user = auth.currentUser;
        if (!user) {
            mostrarNotificacion('❌ Debes iniciar sesión para agregar al carrito', 'error');
            return;
        }
        
        const quantity = parseInt(document.getElementById('quantity').value);
        const stock = productoData.stock || 0;
        
        if (quantity < 1 || quantity > stock) {
            mostrarNotificacion('❌ Cantidad inválida', 'error');
            return;
        }
        
        // Verificar si ya existe en el carrito
        const carritoSnapshot = await db.collection('carrito')
            .where('usuario_id', '==', user.uid)
            .where('producto_id', '==', productoId)
            .get();
        
        if (!carritoSnapshot.empty) {
            // Actualizar cantidad
            const item = carritoSnapshot.docs[0];
            const nuevaCantidad = item.data().cantidad + quantity;
            
            if (nuevaCantidad > stock) {
                mostrarNotificacion('❌ No hay suficiente stock disponible', 'error');
                return;
            }
            
            await db.collection('carrito').doc(item.id).update({
                cantidad: nuevaCantidad,
                fecha_agregado: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            mostrarNotificacion(`✅ ${quantity} más agregado al carrito`, 'success');
        } else {
            // Crear nuevo item
            const itemCarrito = {
                producto_id: productoId,
                nombre: productoData.nombre,
                precio: productoData.precio,
                cantidad: quantity,
                unidad: productoData.unidad || 'kg',
                imagen: imagenes[0] || '/static/images/product-placeholder.png',
                vendedor_nombre: productoData.vendedor_nombre || 'N/A',
                vendedor_id: productoData.vendedor_id,
                fecha_agregado: firebase.firestore.FieldValue.serverTimestamp(),
                usuario_id: user.uid,
                categoria: productoData.categoria
            };
            
            await db.collection('carrito').add(itemCarrito);
            mostrarNotificacion('✅ Producto agregado al carrito', 'success');
        }
        
        // Resetear cantidad
        document.getElementById('quantity').value = 1;
        actualizarEstadoBotones();
        
    } catch (error) {
        console.error('❌ Error agregando al carrito:', error);
        mostrarNotificacion('❌ Error al agregar al carrito', 'error');
    }
}

// Comprar ahora
async function comprarAhora() {
    await agregarAlCarrito();
    // Redirigir al carrito después de un breve delay
    setTimeout(() => {
        window.location.href = '/comprador/carrito';
    }, 1000);
}

// Mostrar error
function mostrarError(mensaje) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = mensaje;
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.textContent = mensaje;
    
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#4CAF50' : tipo === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// Actualizar saludo del usuario
function actualizarSaludoUsuario() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const strongEl = document.getElementById('nav-user-name');
            if (strongEl) {
                let nombre = user.displayName;
                
                if (!nombre && db) {
                    try {
                        const doc = await db.collection('usuarios').doc(user.uid).get();
                        if (doc.exists) {
                            nombre = doc.data().nombre || null;
                        }
                    } catch (e) {
                        console.log('⚠️ Error obteniendo nombre:', e);
                    }
                }
                
                if (!nombre && user.email) {
                    nombre = user.email.split('@')[0];
                }
                
                if (nombre) strongEl.textContent = nombre;
            }
        }
    });
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM cargado, inicializando página de detalle...');
    
    // Inicializar Firebase
    const firebaseOk = await inicializarFirebase();
    if (!firebaseOk) {
        mostrarError('No se pudo conectar con la base de datos');
        return;
    }
    
    // Actualizar saludo
    actualizarSaludoUsuario();
    
    // Event listeners para cantidad
    const quantityInput = document.getElementById('quantity');
    const decreaseBtn = document.getElementById('decreaseBtn');
    const increaseBtn = document.getElementById('increaseBtn');
    
    decreaseBtn.addEventListener('click', function() {
        let value = parseInt(quantityInput.value);
        if (value > 1) {
            quantityInput.value = value - 1;
            actualizarEstadoBotones();
        }
    });
    
    increaseBtn.addEventListener('click', function() {
        let value = parseInt(quantityInput.value);
        const max = parseInt(quantityInput.getAttribute('max')) || 1;
        if (value < max) {
            quantityInput.value = value + 1;
            actualizarEstadoBotones();
        }
    });
    
    quantityInput.addEventListener('input', function() {
        let value = parseInt(this.value);
        const max = parseInt(this.getAttribute('max')) || 1;
        if (value > max) {
            this.value = max;
        } else if (value < 1 || isNaN(value)) {
            this.value = 1;
        }
        actualizarEstadoBotones();
    });
    
    // Event listeners para botones de acción
    document.getElementById('addToCartBtn').addEventListener('click', agregarAlCarrito);
    document.getElementById('buyNowBtn').addEventListener('click', comprarAhora);
    
    // Inicializar sistema de rating y comentarios
    inicializarRating();
    document.getElementById('submitCommentBtn').addEventListener('click', publicarComentario);
    
    // Cargar producto
    await cargarProducto();
});

(() => {
    'use strict';

    let db;
    let productos = [];

    const rawCategoria = (document.body?.dataset?.categoria || '').trim();
    const categoriaActual = rawCategoria && rawCategoria.toLowerCase() !== 'none' ? rawCategoria : '';

    function normalizarCategoria(cat) {
        if (!cat || cat === '') return null;
        return cat.toLowerCase()
            .replace(/-/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function obtenerNombreCategoria(cat) {
        if (!cat || cat === '') return 'Todos los productos';
        return cat.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    function actualizarBreadcrumb(categoriaFiltro) {
        const breadcrumbCategoria = document.getElementById('breadcrumb-categoria');
        const breadcrumbSeparator = document.getElementById('breadcrumb-categoria-separator');

        if (!breadcrumbCategoria || !breadcrumbSeparator) return;

        if (categoriaFiltro && categoriaFiltro !== 'todos los productos') {
            breadcrumbCategoria.textContent = obtenerNombreCategoria(categoriaFiltro);
            breadcrumbCategoria.style.display = 'inline';
            breadcrumbSeparator.style.display = 'inline';
        } else {
            breadcrumbCategoria.style.display = 'none';
            breadcrumbSeparator.style.display = 'none';
        }
    }

    async function inicializarFirebase() {
        try {
            console.log('🔄 Inicializando Firebase...');

            let intentos = 0;
            const maxIntentos = 20;

            while (typeof firebase === 'undefined' && intentos < maxIntentos) {
                console.log(`⏳ Esperando Firebase... (intento ${intentos + 1}/${maxIntentos})`);
                await new Promise((resolve) => setTimeout(resolve, 250));
                intentos += 1;
            }

            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK no se cargó después de 5 segundos');
            }

            if (!window.firebaseConfig) {
                throw new Error('Configuración de Firebase no disponible');
            }

            if (firebase.apps.length === 0) {
                firebase.initializeApp(window.firebaseConfig);
            }

            db = firebase.firestore();
            db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                ignoreUndefinedProperties: true
            });

            return true;
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
            return false;
        }
    }

    async function cargarTodosLosProductos() {
        try {
            if (!db) {
                throw new Error('Base de datos de Firestore no está disponible');
            }

            const categoriaFiltro = normalizarCategoria(categoriaActual);

            const categoriaTitulo = document.getElementById('categoria-titulo');
            if (categoriaTitulo) {
                categoriaTitulo.textContent = obtenerNombreCategoria(categoriaActual);
            }

            actualizarBreadcrumb(categoriaFiltro);

            const productosSnapshot = await db.collection('productos').get();

            if (productosSnapshot.empty) {
                mostrarProductos([]);
                return;
            }

            productos = [];

            productosSnapshot.forEach((doc) => {
                const data = doc.data();

                if (data.activo !== true || (data.stock || 0) <= 0) {
                    return;
                }

                const categoriaProducto = normalizarCategoria(data.categoria || 'otros');

                if (categoriaFiltro && categoriaFiltro !== 'todos los productos') {
                    if (categoriaProducto !== categoriaFiltro) {
                        return;
                    }
                }

                let imagenValida = null;
                if (data.imagen && typeof data.imagen === 'string' && data.imagen.trim() !== '') {
                    try {
                        new URL(data.imagen);
                        imagenValida = data.imagen;
                    } catch (error) {
                        // imagen inválida
                    }
                }

                productos.push({
                    id: doc.id,
                    nombre: data.nombre || 'Sin nombre',
                    precio: data.precio || 0,
                    categoria: data.categoria || 'otros',
                    stock: data.stock || 0,
                    unidad: data.unidad || 'kg',
                    imagen: imagenValida,
                    vendedor_nombre: data.vendedor_nombre || 'N/A',
                    descripcion: data.descripcion || '',
                    origen: data.origen || 'Local',
                    activo: data.activo || false
                });
            });

            mostrarProductos(productos);
        } catch (error) {
            console.error('Error cargando productos:', error);
            mostrarError('Error al cargar productos. Intenta recargar la página.');
        }
    }
        
        // Mostrar productos en el grid con cards pequeñas
        function mostrarProductos(productosParaMostrar) {
            try {
                const productosGrid = document.querySelector('.productos-grid-new');
                const noProducts = document.querySelector('.no-products');
            
                if (!productosParaMostrar || productosParaMostrar.length === 0) {
                    if (productosGrid) productosGrid.style.display = 'none';
                    if (noProducts) noProducts.style.display = 'block';
                    return;
                }
                
                // Mostrar productos
                if (noProducts) noProducts.style.display = 'none';
                if (productosGrid) productosGrid.style.display = 'grid';
            
            const productosHTML = productosParaMostrar.map(producto => {
                return `
                    <article class="producto-card-small" 
                         data-id="${producto.id}" 
                         data-nombre="${producto.nombre}" 
                         data-precio="${producto.precio}"
                         data-categoria="${producto.categoria}"
                         data-stock="${producto.stock}">
                    
                        <a href="/comprador/detalle_producto/${producto.id}" class="producto-link-small" style="text-decoration: none; color: inherit;">
                            <div class="producto-image-small">
                            ${producto.imagen && producto.imagen.trim() !== '' ? 
                                    `<img src="${producto.imagen}" alt="${producto.nombre}" class="producto-img-small" 
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                     <div class="producto-placeholder-small" style="display: none;">
                                     <i class="fas fa-box"></i>
                                 </div>` :
                                    `<div class="producto-placeholder-small">
                                     <i class="fas fa-box"></i>
                                 </div>`
                            }
                            </div>
                            
                            <div class="producto-info-small">
                                <h4 class="producto-nombre-small">${producto.nombre}</h4>
                            
                                <div class="producto-precio-small">
                                $${producto.precio.toFixed(2)} / ${producto.unidad}
                            </div>
                            
                                <div class="producto-stock-small">
                                    <span class="stock-label">Stock:</span>
                                    <span class="stock-value">${producto.stock} ${producto.unidad}</span>
                            </div>
                            </a>
                            
                            <div class="producto-controls-small" onclick="event.stopPropagation();">
                                <div class="cantidad-controls">
                                    <button class="cantidad-btn menos" onclick="cambiarCantidad('${producto.id}', -1)">-</button>
                                    <input type="number" class="cantidad-input" id="cantidad-${producto.id}" value="1" min="1" max="${producto.stock}">
                                    <button class="cantidad-btn mas" onclick="cambiarCantidad('${producto.id}', 1)">+</button>
                                </div>
                                
                                <button class="agregar-carrito-btn" onclick="agregarAlCarrito('${producto.id}')">
                                    <i class="fas fa-cart-plus"></i>
                                    Agregar
                                </button>
                            </div>
                </article>
                `;
            }).join('');
            
            productosGrid.innerHTML = productosHTML;
            
            // Actualizar contador de productos
            const productoCount = document.getElementById('producto-count');
            if (productoCount) {
                productoCount.textContent = `${productosParaMostrar.length} productos • Disponibles`;
            }
                
                // Actualizar estado de botones de cantidad
                setTimeout(() => {
                    actualizarTodosLosBotones();
                }, 100);
            
            } catch (error) {
                console.error('Error en mostrarProductos:', error);
            }
        }
        
        // Mostrar error
    function mostrarError(mensaje) {
        const productosGrid = document.querySelector('.productos-grid-new');
        const noProducts = document.querySelector('.no-products');

        if (productosGrid) productosGrid.style.display = 'none';
        if (noProducts) {
            noProducts.innerHTML = `<p>${mensaje}</p>`;
            noProducts.style.display = 'block';
        }
    }
        
        // Función para verificar autenticación
    function verificarAutenticacion() {
        const user = firebase.auth().currentUser;
        if (user) {
            console.log('✅ Usuario autenticado:', user.email);
            return true;
        }
        console.log('❌ Usuario no autenticado');
        return false;
    }
        
        // Función para mostrar estado de autenticación
    function mostrarEstadoAutenticacion() {
        const user = firebase.auth().currentUser;
        const navSaludo = document.querySelector('.saludo-usuario');

        if (user && navSaludo) {
            navSaludo.innerHTML = `Hola, <strong>${user.email || 'Usuario'}</strong>`;
        }
    }
        
        // Inicializar cuando se carga la página
    function manejarBusqueda(event) {
        const query = (event.target.value || '').trim().toLowerCase();
        if (query === '') {
            mostrarProductos(productos);
            return;
        }

        const productosFiltrados = productos.filter((producto) =>
            producto.nombre.toLowerCase().includes(query)
            || producto.categoria.toLowerCase().includes(query)
            || producto.vendedor_nombre.toLowerCase().includes(query)
        );

        mostrarProductos(productosFiltrados);
    }

    function registrarFiltrosSidebar() {
        document.querySelectorAll('.filter-group').forEach((group) => {
            group.querySelectorAll('.filter-btn').forEach((btn) => {
                btn.addEventListener('click', function onFilterClick() {
                    group.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        });
    }

    function registrarControles() {
        document.querySelectorAll('.control-btn').forEach((btn) => {
            btn.addEventListener('click', function onControlClick() {
                console.log('Control clickeado:', this.textContent);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const firebaseInicializado = await inicializarFirebase();

            if (firebaseInicializado) {
                verificarAutenticacion();
                mostrarEstadoAutenticacion();

                firebase.auth().onAuthStateChanged((user) => {
                    if (user) {
                        mostrarEstadoAutenticacion();
                    } else {
                        const navSaludo = document.querySelector('.saludo-usuario');
                        if (navSaludo) {
                            navSaludo.innerHTML = 'Hola, <strong>Usuario</strong>';
                        }
                    }
                });

                await cargarTodosLosProductos();
            } else {
                mostrarError('No se pudo conectar con la base de datos. Intenta recargar la página.');
            }
        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            mostrarError('Error al cargar productos. Intenta recargar la página.');
        }

        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', manejarBusqueda);
        }

        registrarFiltrosSidebar();
        registrarControles();
    });

        // Función para cambiar cantidad
        function cambiarCantidad(productoId, cambio) {
            const input = document.getElementById(`cantidad-${productoId}`);
            const producto = productos.find(p => p.id === productoId);
            
            if (!producto) return;
            
            let nuevaCantidad = parseInt(input.value) + cambio;
            
            // Validar límites
            if (nuevaCantidad < 1) nuevaCantidad = 1;
            if (nuevaCantidad > producto.stock) nuevaCantidad = producto.stock;
            
            input.value = nuevaCantidad;
            
            // Actualizar estado de botones
            actualizarBotonesCantidad(productoId);
        }
        
        // Función para actualizar estado de botones de cantidad
        function actualizarBotonesCantidad(productoId) {
            const input = document.getElementById(`cantidad-${productoId}`);
            const producto = productos.find(p => p.id === productoId);
            
            if (!producto) return;
            
            const cantidad = parseInt(input.value);
            const card = input.closest('.producto-card-small');
            const btnMenos = card.querySelector('.cantidad-btn.menos');
            const btnMas = card.querySelector('.cantidad-btn.mas');
            
            // Deshabilitar botones según límites
            btnMenos.disabled = cantidad <= 1;
            btnMas.disabled = cantidad >= producto.stock;
        }
        
        // Función para agregar al carrito
        async function agregarAlCarrito(productoId) {
            try {
                console.log('🛒 Iniciando proceso de agregar al carrito...');
                
                // Verificar que Firebase esté inicializado
                if (!db) {
                    throw new Error('Base de datos no está disponible');
                }
                
                const producto = productos.find(p => p.id === productoId);
                if (!producto) {
                    console.error('❌ Producto no encontrado:', productoId);
                    mostrarNotificacion('❌ Producto no encontrado');
                    return;
                }
                
                const cantidad = parseInt(document.getElementById(`cantidad-${productoId}`).value);
                console.log('📦 Cantidad seleccionada:', cantidad);
                
                if (cantidad < 1 || cantidad > producto.stock) {
                    mostrarNotificacion('❌ Cantidad inválida. Verifica el stock disponible.');
                    return;
                }
                
                // Obtener usuario actual
                const user = firebase.auth().currentUser;
                if (!user) {
                    console.log('❌ Usuario no autenticado');
                    mostrarNotificacion('❌ Debes estar logueado para agregar productos al carrito');
                    return;
                }
                
                console.log('👤 Usuario autenticado:', user.uid);
                
                // Verificar si el producto ya está en el carrito
                const carritoSnapshot = await db.collection('carrito')
                    .where('usuario_id', '==', user.uid)
                    .where('producto_id', '==', productoId)
                    .get();
                
                if (!carritoSnapshot.empty) {
                    // Si ya existe, actualizar la cantidad
                    const itemExistente = carritoSnapshot.docs[0];
                    const nuevaCantidad = itemExistente.data().cantidad + cantidad;
                    
                    if (nuevaCantidad > producto.stock) {
                        mostrarNotificacion('❌ No hay suficiente stock disponible');
                        return;
                    }
                    
                    await db.collection('carrito').doc(itemExistente.id).update({
                        cantidad: nuevaCantidad,
                        fecha_agregado: new Date().toISOString()
                    });
                    
                    mostrarNotificacion(`✅ ${cantidad} ${producto.unidad} más de ${producto.nombre} agregado al carrito`);
                } else {
                    // Si no existe, crear nuevo item
                    const itemCarrito = {
                        producto_id: productoId,
                        nombre: producto.nombre,
                        precio: producto.precio,
                        cantidad: cantidad,
                        unidad: producto.unidad,
                        imagen: producto.imagen,
                        vendedor_nombre: producto.vendedor_nombre,
                        fecha_agregado: new Date().toISOString(),
                        usuario_id: user.uid,
                        categoria: producto.categoria,
                        origen: producto.origen
                    };
                    
                    console.log('📝 Agregando nuevo item al carrito:', itemCarrito);
                    await db.collection('carrito').add(itemCarrito);
                    
                    mostrarNotificacion(`✅ ${cantidad} ${producto.unidad} de ${producto.nombre} agregado al carrito`);
                }
                
                // Resetear cantidad a 1
                document.getElementById(`cantidad-${productoId}`).value = 1;
                actualizarBotonesCantidad(productoId);
                
                console.log('✅ Producto agregado al carrito exitosamente');
                
            } catch (error) {
                console.error('❌ Error agregando al carrito:', error);
                console.error('❌ Detalles del error:', {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                });
                
                let mensajeError = '❌ Error al agregar al carrito. Intenta nuevamente.';
                
                if (error.code === 'permission-denied') {
                    mensajeError = '❌ No tienes permisos para agregar al carrito';
                } else if (error.code === 'unavailable') {
                    mensajeError = '❌ Servicio no disponible. Verifica tu conexión';
                }
                
                mostrarNotificacion(mensajeError);
            }
        }
        
        // Función para mostrar notificaciones
        function mostrarNotificacion(mensaje) {
            // Crear elemento de notificación
            const notificacion = document.createElement('div');
            notificacion.className = 'notificacion-carrito';
            notificacion.textContent = mensaje;
            
            // Agregar estilos
            notificacion.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--green);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: var(--shadow);
                z-index: 1000;
                font-weight: 500;
                animation: slideIn 0.3s ease;
            `;
            
            // Agregar animación CSS
            if (!document.querySelector('#notificacion-styles')) {
                const style = document.createElement('style');
                style.id = 'notificacion-styles';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(notificacion);
            
            // Remover después de 3 segundos
            setTimeout(() => {
                notificacion.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notificacion.parentNode) {
                        notificacion.parentNode.removeChild(notificacion);
                    }
                }, 300);
            }, 3000);
        }
        
        // Actualizar botones cuando se carga la página
    function actualizarTodosLosBotones() {
        productos.forEach((producto) => {
            actualizarBotonesCantidad(producto.id);
        });
    }

    window.cambiarCantidad = cambiarCantidad;
    window.agregarAlCarrito = agregarAlCarrito;
    window.ProductosComprador = {
        cambiarCantidad,
        agregarAlCarrito
    };
})();

let db, auth, currentUser;
const pedidoId = (document.body?.dataset?.pedidoId || '').trim();

        // Inicializar Firebase
        function inicializarFirebase() {
            try {
                auth = firebase.auth();
                db = firebase.firestore();

                auth.onAuthStateChanged((user) => {
                    if (user) {
                        currentUser = user;
                        cargarDetallePedido();
                    } else {
                        window.location.href = '/auth/login';
                    }
                });
            } catch (error) {
                console.error('Error inicializando Firebase:', error);
                mostrarError();
            }
        }

        // Cargar detalle del pedido
        async function cargarDetallePedido() {
            try {
                if (!db || !currentUser || !pedidoId) {
                    console.error('Datos faltantes');
                    mostrarError();
                    return;
                }

                const loadingEl = document.getElementById('loading-detalle');
                const contenidoEl = document.getElementById('contenido-pedido');
                const errorEl = document.getElementById('error-detalle');

                // Configurar listener en tiempo real para el pedido
                const pedidoRef = db.collection('compras').doc(pedidoId);
                
                // Verificar inicialmente que existe y pertenece al usuario
                const pedidoDoc = await pedidoRef.get();
                
                if (!pedidoDoc.exists) {
                    mostrarError();
                    return;
                }

                const pedidoDataInicial = pedidoDoc.data();

                // Verificar que el pedido pertenece al usuario
                if (pedidoDataInicial.usuario_id !== currentUser.uid) {
                    mostrarError();
                    return;
                }

                // Configurar listener en tiempo real
                pedidoRef.onSnapshot((snapshot) => {
                    if (!snapshot.exists) {
                        mostrarError();
                        return;
                    }

                    const pedidoData = snapshot.data();
                    
                    // Verificar que sigue perteneciendo al usuario
                    if (pedidoData.usuario_id !== currentUser.uid) {
                        mostrarError();
                        return;
                    }

                    // Actualizar solo los elementos que cambian
                    actualizarEstadoPedido(pedidoData);
                    
                    // Si hay productos guardados y el estado cambió, actualizar productos
                    if (productosGlobales.length > 0) {
                        mostrarProductos(productosGlobales);
                    }
                }, (error) => {
                    console.error('Error en listener del pedido:', error);
                });

                // Cargar datos iniciales
                const pedidoData = pedidoDataInicial;
                
                // Establecer estado global inicial
                estadoPedidoGlobal = pedidoData.estado_pedido || 'preparando';

                // Manejar fecha
                let fechaCompra = null;
                if (pedidoData.fecha_compra) {
                    fechaCompra = pedidoData.fecha_compra.toDate ? pedidoData.fecha_compra.toDate() : new Date(pedidoData.fecha_compra);
                } else if (pedidoData.fecha_creacion) {
                    fechaCompra = new Date(pedidoData.fecha_creacion);
                } else {
                    fechaCompra = new Date();
                }

                // Obtener nombres de vendedores
                const productos = pedidoData.productos || [];
                const productosConVendedor = await Promise.all(productos.map(async (producto) => {
                    let vendedorNombre = producto.vendedor_nombre || 'Vendedor';
                    
                    if (!producto.vendedor_nombre && producto.vendedor_id) {
                        try {
                            const vendedorDoc = await db.collection('usuarios').doc(producto.vendedor_id).get();
                            if (vendedorDoc.exists) {
                                const vendedorData = vendedorDoc.data();
                                vendedorNombre = vendedorData.nombre || 
                                               vendedorData.nombre_tienda || 
                                               vendedorData.email?.split('@')[0] || 
                                               'Vendedor';
                            }
                        } catch (error) {
                            console.warn('Error obteniendo nombre del vendedor:', error);
                        }
                    }
                    
                    return {
                        ...producto,
                        vendedor_nombre: vendedorNombre
                    };
                }));

                // Generar número de pedido amigable (formato: PED-YYMMDD-XXXX)
                function generarNumeroPedido(id, fecha) {
                    // Formatear fecha como YYMMDD
                    const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
                    const año = String(fechaObj.getFullYear()).slice(-2);
                    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                    const dia = String(fechaObj.getDate()).padStart(2, '0');
                    const fechaFormato = `${año}${mes}${dia}`;
                    
                    // Tomar los primeros 4 caracteres del ID para mantener unicidad
                    const idPart = id.substring(0, 4).toUpperCase();
                    
                    return `PED-${fechaFormato}-${idPart}`;
                }
                
                // Actualizar UI
                document.getElementById('pedido-numero').textContent = generarNumeroPedido(pedidoId, fechaCompra);
                document.getElementById('pedido-fecha').textContent = fechaCompra.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                // Detalles de pago
                const metodoPago = pedidoData.metodo_pago || 'N/A';
                const metodoLabels = {
                    'tarjeta': 'Tarjeta de débito / crédito',
                    'efectivo': 'Efectivo',
                    'transferencia': 'Transferencia bancaria'
                };
                const metodoIconos = {
                    'tarjeta': 'fa-credit-card',
                    'efectivo': 'fa-money-bill',
                    'transferencia': 'fa-university'
                };

                document.getElementById('pago-metodo').textContent = metodoLabels[metodoPago] || metodoPago;
                document.getElementById('pago-icono').className = `fas ${metodoIconos[metodoPago] || 'fa-credit-card'}`;
                document.getElementById('pago-total').textContent = `$${pedidoData.total?.toFixed(2) || '0.00'}`;

                // Mostrar botón de devolución si el pago fue con tarjeta y tiene payment_intent_id
                const devolucionSection = document.getElementById('devolucion-section');
                const btnDevolucion = document.getElementById('btn-solicitar-devolucion-detalle');
                const detallesPagoExpandidos = document.getElementById('detalles-pago-expandidos');
                
                if (metodoPago === 'tarjeta' && pedidoData.payment_intent_id) {
                    devolucionSection.style.display = 'block';
                    detallesPagoExpandidos.style.display = 'none'; // Ocultar hasta que se expanda
                    btnDevolucion.onclick = () => abrirModalDevolucion(
                        pedidoId,
                        pedidoData.total,
                        pedidoData.payment_intent_id,
                        pedidoData.usuario_email || currentUser.email,
                        pedidoData.usuario_nombre || currentUser.displayName || 'Cliente'
                    );
                    
                    // Guardar payment_intent_id para usar cuando se expanda
                    window.currentPaymentIntentId = pedidoData.payment_intent_id;
                } else {
                    devolucionSection.style.display = 'none';
                    detallesPagoExpandidos.style.display = 'none';
                    document.getElementById('link-ver-detalles').style.display = 'none';
                }

                // Estado de entrega - usar función auxiliar
                actualizarEstadoPedido(pedidoData);

                // Información de envío
                document.getElementById('envio-recibe').textContent = pedidoData.usuario_nombre || currentUser.displayName || 'Usuario';
                const direccionEntrega = pedidoData.direccion_entrega || {};
                const ciudad = direccionEntrega.ciudad || direccionEntrega.formatted || 'No especificada';
                const telefono = direccionEntrega.telefono || 'No especificado';
                document.getElementById('envio-ciudad').textContent = ciudad;
                document.getElementById('envio-telefono').textContent = telefono;

                // Guardar productos globalmente y mostrarlos
                productosGlobales = productosConVendedor;
                mostrarProductos(productosConVendedor);

                // Guardar datos para la factura PDF
                guardarDatosFactura(pedidoData, generarNumeroPedido(pedidoId, fechaCompra), fechaCompra, productosConVendedor, direccionEntrega);

                // Ocultar loading y mostrar contenido
                loadingEl.style.display = 'none';
                contenidoEl.style.display = 'block';

            } catch (error) {
                console.error('Error cargando detalle del pedido:', error);
                mostrarError();
            }
        }

        // Variables para comentario de vendedor
        let currentRatingVendedor = 0;
        let vendedorIdActual = null;
        let productoIdActual = null;

        // Actualizar estado del pedido (mensaje, icono y progreso)
        function actualizarEstadoPedido(pedidoData) {
            const estadoPedido = pedidoData.estado_pedido || 'preparando';
            estadoPedidoGlobal = estadoPedido; // Actualizar estado global
            const estadoInfo = {
                'preparando': {
                    mensaje: 'Se está preparando tu pedido',
                    icono: 'fa-clock'
                },
                'enviado': {
                    mensaje: 'Tu pedido está en camino',
                    icono: 'fa-truck'
                },
                'recibido': {
                    mensaje: 'Se entregó en tu domicilio',
                    icono: 'fa-check-circle'
                }
            };

            const estadoActual = estadoInfo[estadoPedido] || estadoInfo['preparando'];
            document.getElementById('estado-mensaje-texto').textContent = estadoActual.mensaje;
            document.getElementById('estado-icono').className = `fas ${estadoActual.icono}`;

            // Actualizar barra de progreso
            actualizarProgreso(estadoPedido);
        }

        // Actualizar barra de progreso
        function actualizarProgreso(estado) {
            // Resetear todas las clases
            const confirmando = document.getElementById('progreso-confirmando');
            const preparando = document.getElementById('progreso-preparando');
            const enviado = document.getElementById('progreso-enviado');
            const recibido = document.getElementById('progreso-recibido');
            
            // Resetear líneas
            const linea1 = document.getElementById('linea-confirmando-preparando');
            const linea2 = document.getElementById('linea-preparando-enviado');
            const linea3 = document.getElementById('linea-enviado-recibido');
            
            // Resetear estados
            confirmando.classList.remove('completado');
            preparando.classList.remove('completado');
            enviado.classList.remove('completado');
            recibido.classList.remove('completado');
            
            // Resetear líneas
            if (linea1) linea1.style.background = '#ddd';
            if (linea2) linea2.style.background = '#ddd';
            if (linea3) linea3.style.background = '#ddd';

            // Confirmando siempre está completado (pedido creado)
            confirmando.classList.add('completado');
            if (linea1) linea1.style.background = '#28a745';

            // Preparando está completado cuando el estado es al menos 'preparando'
            if (estado === 'preparando' || estado === 'enviado' || estado === 'recibido') {
                preparando.classList.add('completado');
                if (linea2) linea2.style.background = '#28a745';
            }

            // Enviado está completado cuando el estado es 'enviado' o 'recibido'
            if (estado === 'enviado' || estado === 'recibido') {
                enviado.classList.add('completado');
                if (linea3) linea3.style.background = '#28a745';
            }

            // Recibido solo está completado cuando el estado es 'recibido'
            if (estado === 'recibido') {
                recibido.classList.add('completado');
            }
        }

        // Variables globales
        let estadoPedidoGlobal = 'preparando';
        let productosGlobales = [];

        // Mostrar productos
        function mostrarProductos(productos) {
            const container = document.getElementById('productos-lista-detalle');
            if (!container) return;

            container.innerHTML = productos.map(producto => {
                const puedeComentar = estadoPedidoGlobal === 'recibido';
                return `
                <div class="producto-item-detalle-wrapper">
                    <div class="producto-item-detalle" onclick="window.location.href='/comprador/detalle_producto/${producto.producto_id}'">
                        <img src="${producto.imagen || '/static/images/product-placeholder.png'}" 
                             alt="${producto.nombre}"
                             onerror="this.src='/static/images/product-placeholder.png'">
                        <div class="producto-item-info-detalle">
                            <h4 class="producto-nombre-detalle">${producto.nombre}</h4>
                            <span class="producto-vendedor-detalle">Vendido por ${producto.vendedor_nombre}</span>
                            <span class="producto-precio-detalle">$${producto.precio_unitario?.toFixed(2) || '0.00'} × ${producto.cantidad} ${producto.unidad}</span>
                        </div>
                    </div>
                    ${puedeComentar ? `
                    <button class="btn-comentar-vendedor" 
                            onclick="event.stopPropagation(); abrirModalComentarVendedor('${producto.vendedor_id}', '${producto.vendedor_nombre}', '${producto.producto_id}', '${producto.nombre}')">
                        <i class="fas fa-star"></i>
                        Calificar vendedor
                    </button>
                    ` : ''}
                </div>
            `;
            }).join('');
        }

        // Copiar número de pedido
        function copiarNumeroPedido() {
            const numero = document.getElementById('pedido-numero').textContent;
            navigator.clipboard.writeText(numero).then(() => {
                const btn = event.target.closest('.btn-copiar');
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.style.background = '#28a745';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.background = '#2e8b57';
                }, 2000);
            }).catch(err => {
                console.error('Error copiando:', err);
                alert('No se pudo copiar el número de pedido');
            });
        }

        // Mostrar error
        function mostrarError() {
            document.getElementById('loading-detalle').style.display = 'none';
            document.getElementById('error-detalle').style.display = 'block';
        }

        // Toggle detalles de pago
        async function toggleDetallesPago() {
            const detallesSection = document.getElementById('detalles-pago-expandidos');
            const icon = document.getElementById('icon-ver-detalles');
            const loadingDiv = document.getElementById('detalles-pago-loading');
            const contentDiv = document.getElementById('detalles-pago-content');
            const errorDiv = document.getElementById('detalles-pago-error');
            
            if (detallesSection.style.display === 'none') {
                // Expandir
                detallesSection.style.display = 'block';
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
                
                // Si ya se cargaron antes, solo mostrar
                if (contentDiv.style.display === 'block') {
                    return;
                }
                
                // Cargar detalles desde Stripe
                loadingDiv.style.display = 'block';
                contentDiv.style.display = 'none';
                errorDiv.style.display = 'none';
                
                const paymentIntentId = window.currentPaymentIntentId;
                if (!paymentIntentId) {
                    errorDiv.style.display = 'block';
                    loadingDiv.style.display = 'none';
                    return;
                }
                
                try {
                    const response = await fetch(`/comprador/obtener-detalles-pago/${paymentIntentId}`);
                    const data = await response.json();
                    
                    if (!response.ok || !data.success) {
                        throw new Error(data.error || 'Error al cargar detalles');
                    }
                    
                    // Mostrar información de la tarjeta
                    if (data.card) {
                        const card = data.card;
                        document.getElementById('tarjeta-brand').textContent = card.brand || 'Tarjeta';
                        document.getElementById('tarjeta-number').textContent = `•••• •••• •••• ${card.last4}`;
                        
                        // Formatear fecha de vencimiento
                        const expMonth = String(card.exp_month).padStart(2, '0');
                        const expYear = String(card.exp_year).slice(-2);
                        document.getElementById('tarjeta-exp').textContent = `${expMonth}/${expYear}`;
                    } else {
                        document.getElementById('tarjeta-brand').textContent = 'Tarjeta';
                        document.getElementById('tarjeta-number').textContent = 'No disponible';
                        document.getElementById('tarjeta-exp').textContent = 'N/A';
                    }
                    
                    loadingDiv.style.display = 'none';
                    contentDiv.style.display = 'block';
                    
                } catch (error) {
                    console.error('Error cargando detalles del pago:', error);
                    loadingDiv.style.display = 'none';
                    errorDiv.style.display = 'block';
                }
            } else {
                // Colapsar
                detallesSection.style.display = 'none';
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            }
        }

        // ===== FUNCIONES PARA DEVOLUCIONES =====
        // Reutilizar las mismas funciones del archivo mis_pedidos.html
        function abrirModalDevolucion(compraId, montoTotal, paymentIntentId, emailCliente, nombreCliente) {
            const modal = document.getElementById('modal-devolucion');
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                document.getElementById('devolucion-compra-id').value = compraId;
                document.getElementById('devolucion-payment-intent-id').value = paymentIntentId;
                document.getElementById('devolucion-email').value = emailCliente;
                document.getElementById('devolucion-nombre').value = nombreCliente;
                document.getElementById('devolucion-monto-total').textContent = `$${montoTotal.toFixed(2)}`;
                document.getElementById('devolucion-monto').max = montoTotal;
                document.getElementById('devolucion-tipo').value = 'completa';
                document.getElementById('devolucion-monto-group').style.display = 'none';
            } else {
                crearModalDevolucion(compraId, montoTotal, paymentIntentId, emailCliente, nombreCliente);
            }
        }

        function crearModalDevolucion(compraId, montoTotal, paymentIntentId, emailCliente, nombreCliente) {
            const modal = document.createElement('div');
            modal.id = 'modal-devolucion';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-devolucion-content">
                    <div class="modal-devolucion-header">
                        <h2><i class="fas fa-undo"></i> Solicitar Devolución</h2>
                        <button class="btn-cerrar-modal" onclick="cerrarModalDevolucion()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="form-devolucion" onsubmit="procesarDevolucion(event)">
                        <input type="hidden" id="devolucion-compra-id" value="${compraId}">
                        <input type="hidden" id="devolucion-payment-intent-id" value="${paymentIntentId}">
                        <input type="hidden" id="devolucion-email" value="${emailCliente}">
                        <input type="hidden" id="devolucion-nombre" value="${nombreCliente}">
                        
                        <div class="form-group">
                            <label>Monto total del pedido:</label>
                            <div class="monto-total-display">
                                <span id="devolucion-monto-total">$${montoTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Tipo de devolución:</label>
                            <select id="devolucion-tipo" class="form-control" onchange="toggleMontoDevolucion()">
                                <option value="completa">Devolución Completa</option>
                                <option value="parcial">Devolución Parcial</option>
                            </select>
                        </div>

                        <div class="form-group" id="devolucion-monto-group" style="display: none;">
                            <label>Monto a devolver (MXN):</label>
                            <input type="number" 
                                   id="devolucion-monto" 
                                   class="form-control" 
                                   min="0.01" 
                                   max="${montoTotal}" 
                                   step="0.01"
                                   placeholder="0.00">
                            <small class="form-text">Monto máximo: $${montoTotal.toFixed(2)}</small>
                        </div>

                        <div class="form-group">
                            <label>Motivo de la devolución:</label>
                            <textarea id="devolucion-motivo" 
                                      class="form-control" 
                                      rows="4" 
                                      placeholder="Describe el motivo de la devolución..."
                                      required></textarea>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-cancelar" onclick="cerrarModalDevolucion()">
                                Cancelar
                            </button>
                            <button type="submit" class="btn-procesar-devolucion" id="btn-procesar-devolucion">
                                <i class="fas fa-check"></i> Procesar Devolución
                            </button>
                        </div>

                        <div id="devolucion-error" class="alert alert-error" style="display: none;"></div>
                        <div id="devolucion-success" class="alert alert-success" style="display: none;"></div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function toggleMontoDevolucion() {
            const tipo = document.getElementById('devolucion-tipo').value;
            const montoGroup = document.getElementById('devolucion-monto-group');
            if (tipo === 'parcial') {
                montoGroup.style.display = 'block';
                document.getElementById('devolucion-monto').required = true;
            } else {
                montoGroup.style.display = 'none';
                document.getElementById('devolucion-monto').required = false;
            }
        }

        function cerrarModalDevolucion() {
            const modal = document.getElementById('modal-devolucion');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        }

        async function procesarDevolucion(event) {
            event.preventDefault();
            
            const btnSubmit = document.getElementById('btn-procesar-devolucion');
            const errorDiv = document.getElementById('devolucion-error');
            const successDiv = document.getElementById('devolucion-success');
            
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
            
            const compraId = document.getElementById('devolucion-compra-id').value;
            const paymentIntentId = document.getElementById('devolucion-payment-intent-id').value;
            const emailCliente = document.getElementById('devolucion-email').value;
            const nombreCliente = document.getElementById('devolucion-nombre').value;
            const tipo = document.getElementById('devolucion-tipo').value;
            const motivo = document.getElementById('devolucion-motivo').value;
            const montoTotal = parseFloat(document.getElementById('devolucion-monto-total').textContent.replace('$', ''));
            
            let montoDevolucion = null;
            if (tipo === 'parcial') {
                montoDevolucion = parseFloat(document.getElementById('devolucion-monto').value);
                if (!montoDevolucion || montoDevolucion <= 0) {
                    errorDiv.textContent = 'Por favor, ingresa un monto válido para la devolución parcial.';
                    errorDiv.style.display = 'block';
                    return;
                }
                if (montoDevolucion > montoTotal) {
                    errorDiv.textContent = 'El monto de devolución no puede exceder el monto total.';
                    errorDiv.style.display = 'block';
                    return;
                }
                montoDevolucion = Math.round(montoDevolucion * 100);
            }
            
            if (!motivo || motivo.trim() === '') {
                errorDiv.textContent = 'Por favor, describe el motivo de la devolución.';
                errorDiv.style.display = 'block';
                return;
            }
            
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
            
            try {
                const response = await fetch('/comprador/procesar-devolucion', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        compra_id: compraId,
                        payment_intent_id: paymentIntentId,
                        monto_devolucion: montoDevolucion,
                        motivo: motivo,
                        parcial: tipo === 'parcial'
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Error al procesar la devolución');
                }
                
                if (db && auth && auth.currentUser) {
                    await db.collection('devoluciones').add({
                        compra_id: compraId,
                        payment_intent_id: paymentIntentId,
                        refund_id: data.refund_id,
                        monto_original: data.devolucion.monto_original,
                        monto_devolucion: data.devolucion.monto_devolucion,
                        tipo: data.devolucion.tipo,
                        estado: data.status,
                        motivo: motivo,
                        usuario_id: auth.currentUser.uid,
                        fecha_solicitud: new Date().toISOString(),
                        fecha_procesamiento: new Date().toISOString()
                    });
                }
                
                try {
                    await fetch('/comprador/enviar-notificacion-devolucion', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email_cliente: emailCliente,
                            nombre_cliente: nombreCliente,
                            compra_id: compraId,
                            monto_devolucion: data.monto_devolucion,
                            moneda: data.moneda,
                            tipo: data.devolucion.tipo,
                            motivo: motivo,
                            refund_id: data.refund_id
                        })
                    });
                } catch (emailError) {
                    console.error('Error enviando email:', emailError);
                }
                
                successDiv.innerHTML = `
                    <i class="fas fa-check-circle"></i> 
                    <strong>¡Devolución procesada exitosamente!</strong><br>
                    ID de devolución: ${data.refund_id}<br>
                    El reembolso aparecerá en tu tarjeta en 5-10 días hábiles.
                `;
                successDiv.style.display = 'block';
                
                setTimeout(() => {
                    cerrarModalDevolucion();
                    cargarDetallePedido();
                }, 3000);
                
            } catch (error) {
                console.error('Error procesando devolución:', error);
                errorDiv.textContent = error.message || 'Error al procesar la devolución. Por favor, intenta nuevamente.';
                errorDiv.style.display = 'block';
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fas fa-check"></i> Procesar Devolución';
            }
        }

        document.addEventListener('click', function(event) {
            const modal = document.getElementById('modal-devolucion');
            if (modal && event.target === modal) {
                cerrarModalDevolucion();
            }
        });

        // ===== FUNCIÓN PARA GENERAR FACTURA PDF =====
        let datosFactura = null;

        // Guardar datos del pedido cuando se cargan
        function guardarDatosFactura(pedidoData, numeroPedido, fechaCompra, productosConVendedor, direccionEntrega) {
            datosFactura = {
                numeroPedido: numeroPedido,
                fechaCompra: fechaCompra,
                pedidoData: pedidoData,
                productos: productosConVendedor,
                direccionEntrega: direccionEntrega
            };
        }

        async function generarFacturaPDF() {
            if (!datosFactura) {
                alert('Error: No se encontraron datos del pedido. Por favor, recarga la página.');
                return;
            }

            const btn = document.getElementById('btn-generar-factura');
            const textoOriginal = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                const pageWidth = doc.internal.pageSize.getWidth();
                const margin = 20;
                const contentWidth = pageWidth - (margin * 2);
                let yPosition = margin;

                // ===== ENCABEZADO =====
                doc.setFillColor(255, 255, 255); // Fondo blanco
                doc.rect(0, 0, pageWidth, 40, 'F');
                
                // Borde inferior verde para separar el encabezado
                doc.setDrawColor(46, 139, 87); // Línea verde
                doc.setLineWidth(2);
                doc.line(0, 40, pageWidth, 40);
                
                doc.setTextColor(46, 139, 87); // Texto verde sobre fondo blanco
                doc.setFontSize(28);
                doc.setFont('helvetica', 'bold');
                doc.text('AgroMarket', pageWidth / 2, 18, { align: 'center' });
                
                doc.setFontSize(16);
                doc.setFont('helvetica', 'normal');
                doc.text('FACTURA', pageWidth / 2, 30, { align: 'center' });

                yPosition = 50;

                // ===== INFORMACIÓN DEL PEDIDO =====
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('Información del Pedido', margin, yPosition);
                
                yPosition += 8;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                
                const fechaFormateada = datosFactura.fechaCompra.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                doc.text(`Número de pedido: ${datosFactura.numeroPedido}`, margin, yPosition);
                yPosition += 6;
                doc.text(`Fecha: ${fechaFormateada}`, margin, yPosition);
                yPosition += 6;
                
                const metodoPagoLabels = {
                    'tarjeta': 'Tarjeta de débito/crédito',
                    'efectivo': 'Efectivo contra entrega',
                    'transferencia': 'Transferencia bancaria'
                };
                const metodoPagoTexto = metodoPagoLabels[datosFactura.pedidoData.metodo_pago] || datosFactura.pedidoData.metodo_pago;
                doc.text(`Método de pago: ${metodoPagoTexto}`, margin, yPosition);
                yPosition += 12;

                // ===== INFORMACIÓN DEL CLIENTE =====
                doc.setFont('helvetica', 'bold');
                doc.text('Información del Cliente', margin, yPosition);
                yPosition += 8;
                doc.setFont('helvetica', 'normal');
                
                const nombreCliente = datosFactura.pedidoData.usuario_nombre || currentUser?.displayName || 'Cliente';
                const emailCliente = datosFactura.pedidoData.usuario_email || currentUser?.email || '';
                
                doc.text(`Nombre: ${nombreCliente}`, margin, yPosition);
                yPosition += 6;
                doc.text(`Email: ${emailCliente}`, margin, yPosition);
                yPosition += 12;

                // ===== PRODUCTOS =====
                doc.setFont('helvetica', 'bold');
                doc.text('Productos', margin, yPosition);
                yPosition += 8;

                // Encabezados de la tabla
                const tableTop = yPosition;
                doc.setFillColor(46, 139, 87);
                doc.rect(margin, yPosition - 6, contentWidth, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                
                doc.text('#', margin + 5, yPosition);
                doc.text('Producto', margin + 15, yPosition);
                doc.text('Cantidad', margin + 80, yPosition);
                doc.text('Precio Unit.', margin + 115, yPosition);
                doc.text('Total', margin + 155, yPosition);
                
                yPosition += 10;
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);

                // Línea divisoria
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);

                // Filas de productos
                datosFactura.productos.forEach((producto, index) => {
                    // Verificar si necesitamos una nueva página
                    if (yPosition > 250) {
                        doc.addPage();
                        yPosition = margin;
                    }

                    const numero = (index + 1).toString();
                    const nombre = producto.nombre || 'Producto';
                    const cantidad = `${producto.cantidad} ${producto.unidad || 'kg'}`;
                    const precioUnit = `$${Number(producto.precio_unitario || 0).toFixed(2)}`;
                    const precioTotal = `$${Number(producto.precio_total || 0).toFixed(2)}`;

                    doc.text(numero, margin + 5, yPosition);
                    // Truncar nombre si es muy largo
                    const nombreTruncado = doc.splitTextToSize(nombre, 60);
                    doc.text(nombreTruncado, margin + 15, yPosition);
                    doc.text(cantidad, margin + 80, yPosition);
                    doc.text(precioUnit, margin + 115, yPosition);
                    doc.text(precioTotal, margin + 155, yPosition);

                    yPosition += 8;
                });

                yPosition += 8;

                // ===== TOTALES =====
                const subtotal = Number(datosFactura.pedidoData.subtotal || 0);
                const envio = Number(datosFactura.pedidoData.envio || 0);
                const impuestos = Number(datosFactura.pedidoData.impuestos || 0);
                const total = Number(datosFactura.pedidoData.total || 0);

                // Línea divisoria antes de totales
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 8;

                doc.setFontSize(10);
                doc.text(`Subtotal:`, margin + 120, yPosition);
                doc.text(`$${subtotal.toFixed(2)}`, margin + 155, yPosition, { align: 'right' });
                yPosition += 7;

                doc.text(`Envío:`, margin + 120, yPosition);
                doc.text(`$${envio.toFixed(2)}`, margin + 155, yPosition, { align: 'right' });
                yPosition += 7;

                doc.text(`Impuestos:`, margin + 120, yPosition);
                doc.text(`$${impuestos.toFixed(2)}`, margin + 155, yPosition, { align: 'right' });
                yPosition += 7;

                // Total final
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setFillColor(46, 139, 87);
                doc.rect(margin + 115, yPosition - 6, 65, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.text(`TOTAL:`, margin + 120, yPosition);
                doc.text(`$${total.toFixed(2)}`, margin + 155, yPosition, { align: 'right' });

                yPosition += 15;

                // ===== INFORMACIÓN DE ENTREGA =====
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = margin;
                }

                doc.text('Información de Entrega', margin, yPosition);
                yPosition += 8;
                doc.setFont('helvetica', 'normal');
                
                const ciudad = datosFactura.direccionEntrega.ciudad || datosFactura.direccionEntrega.formatted || 'No especificada';
                const telefono = datosFactura.direccionEntrega.telefono || 'No especificado';
                
                doc.text(`Ciudad de entrega: ${ciudad}`, margin, yPosition);
                yPosition += 6;
                doc.text(`Teléfono de contacto: ${telefono}`, margin, yPosition);

                // ===== PIE DE PÁGINA =====
                const pageCount = doc.internal.pages.length - 1;
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor(128, 128, 128);
                    doc.text(
                        `Página ${i} de ${pageCount}`,
                        pageWidth / 2,
                        doc.internal.pageSize.getHeight() - 10,
                        { align: 'center' }
                    );
                    doc.text(
                        'Gracias por tu compra en AgroMarket',
                        pageWidth / 2,
                        doc.internal.pageSize.getHeight() - 5,
                        { align: 'center' }
                    );
                }

                // ===== DESCARGAR PDF =====
                const nombreArchivo = `Factura-${datosFactura.numeroPedido.replace(/[^A-Z0-9]/g, '_')}.pdf`;
                doc.save(nombreArchivo);

                // Mostrar mensaje de éxito
                btn.innerHTML = '<i class="fas fa-check"></i> Descargado';
                setTimeout(() => {
                    btn.innerHTML = textoOriginal;
                    btn.disabled = false;
                }, 2000);

            } catch (error) {
                console.error('Error generando PDF:', error);
                alert('Error al generar la factura. Por favor, intenta nuevamente.');
                btn.innerHTML = textoOriginal;
                btn.disabled = false;
            }
        }

        // ===== FUNCIONES PARA COMENTARIOS DE VENDEDORES =====
        
        // Abrir modal para comentar vendedor
        async function abrirModalComentarVendedor(vendedorId, vendedorNombre, productoId, productoNombre) {
            vendedorIdActual = vendedorId;
            productoIdActual = productoId;
            
            document.getElementById('vendedor-nombre-modal').textContent = vendedorNombre;
            document.getElementById('producto-nombre-modal').textContent = productoNombre;
            
            // Verificar si ya existe un comentario
            try {
                const comentarioExistente = await db.collection('comentarios_vendedor')
                    .where('vendedor_id', '==', vendedorId)
                    .where('comprador_id', '==', currentUser.uid)
                    .where('pedido_id', '==', pedidoId)
                    .where('producto_id', '==', productoId)
                    .get();
                
                if (!comentarioExistente.empty) {
                    const comentario = comentarioExistente.docs[0].data();
                    currentRatingVendedor = comentario.calificacion || 0;
                    document.getElementById('comentarioVendedorText').value = comentario.comentario || '';
                    resaltarEstrellasVendedor(currentRatingVendedor);
                    document.getElementById('ratingTextVendedor').textContent = 
                        currentRatingVendedor > 0 ? `${currentRatingVendedor} de 5 estrellas` : 'Selecciona una calificación';
                } else {
                    currentRatingVendedor = 0;
                    document.getElementById('comentarioVendedorText').value = '';
                    resaltarEstrellasVendedor(0);
                    document.getElementById('ratingTextVendedor').textContent = 'Selecciona una calificación';
                }
            } catch (error) {
                console.error('Error verificando comentario:', error);
            }
            
            // Inicializar sistema de rating
            inicializarRatingVendedor();
            
            document.getElementById('modal-comentar-vendedor').style.display = 'flex';
        }
        
        // Cerrar modal
        function cerrarModalComentarVendedor() {
            document.getElementById('modal-comentar-vendedor').style.display = 'none';
            document.getElementById('alertComentarVendedor').style.display = 'none';
        }
        
        // Inicializar sistema de rating para vendedor
        function inicializarRatingVendedor() {
            const stars = document.querySelectorAll('#ratingInputVendedor .fa-star');
            stars.forEach((star, index) => {
                star.addEventListener('click', () => {
                    currentRatingVendedor = index + 1;
                    resaltarEstrellasVendedor(currentRatingVendedor);
                    actualizarTextoCalificacion(currentRatingVendedor);
                });
                
                star.addEventListener('mouseenter', () => {
                    resaltarEstrellasVendedor(index + 1);
                    actualizarTextoCalificacion(index + 1);
                });
            });
            
            document.getElementById('ratingInputVendedor').addEventListener('mouseleave', function() {
                resaltarEstrellasVendedor(currentRatingVendedor);
                actualizarTextoCalificacion(currentRatingVendedor);
            });
        }
        
        // Resaltar estrellas
        function resaltarEstrellasVendedor(rating) {
            const stars = document.querySelectorAll('#ratingInputVendedor .fa-star');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        }
        
        // Actualizar texto de calificación
        function actualizarTextoCalificacion(rating) {
            const textos = [
                'Selecciona una calificación',
                '1 estrella - Muy malo',
                '2 estrellas - Malo',
                '3 estrellas - Regular',
                '4 estrellas - Bueno',
                '5 estrellas - Excelente'
            ];
            document.getElementById('ratingTextVendedor').textContent = 
                rating > 0 ? textos[rating] : textos[0];
        }
        
        // Guardar comentario de vendedor
        async function guardarComentarioVendedor() {
            try {
                if (!auth.currentUser) {
                    mostrarAlerta('error', 'Debes iniciar sesión para comentar');
                    return;
                }
                
                if (currentRatingVendedor === 0) {
                    mostrarAlerta('error', 'Por favor selecciona una calificación');
                    return;
                }
                
                if (!vendedorIdActual || !productoIdActual) {
                    mostrarAlerta('error', 'Error: información del vendedor no válida');
                    return;
                }
                
                const comentarioTexto = document.getElementById('comentarioVendedorText').value.trim();
                
                // Obtener nombre del usuario
                const userDoc = await db.collection('usuarios').doc(currentUser.uid).get();
                const nombreUsuario = userDoc.exists 
                    ? (userDoc.data().nombre || auth.currentUser.displayName || auth.currentUser.email.split('@')[0]) 
                    : (auth.currentUser.displayName || auth.currentUser.email.split('@')[0]);
                
                // Verificar si ya existe un comentario para actualizarlo
                const comentarioExistente = await db.collection('comentarios_vendedor')
                    .where('vendedor_id', '==', vendedorIdActual)
                    .where('comprador_id', '==', currentUser.uid)
                    .where('pedido_id', '==', pedidoId)
                    .where('producto_id', '==', productoIdActual)
                    .get();
                
                const comentarioData = {
                    vendedor_id: vendedorIdActual,
                    comprador_id: currentUser.uid,
                    comprador_nombre: nombreUsuario,
                    pedido_id: pedidoId,
                    producto_id: productoIdActual,
                    calificacion: currentRatingVendedor,
                    comentario: comentarioTexto || '',
                    fecha: firebase.firestore.FieldValue.serverTimestamp(),
                    fecha_actualizacion: firebase.firestore.FieldValue.serverTimestamp(),
                    activo: true
                };
                
                if (!comentarioExistente.empty) {
                    // Actualizar comentario existente
                    await comentarioExistente.docs[0].ref.update(comentarioData);
                    mostrarAlerta('success', 'Comentario actualizado exitosamente');
                } else {
                    // Crear nuevo comentario
                    await db.collection('comentarios_vendedor').add(comentarioData);
                    mostrarAlerta('success', 'Comentario publicado exitosamente');
                }
                
                // Actualizar promedio de calificación del vendedor
                await actualizarPromedioVendedor(vendedorIdActual);
                
                // Cerrar modal después de un breve delay
                setTimeout(() => {
                    cerrarModalComentarVendedor();
                }, 1500);
                
            } catch (error) {
                console.error('Error guardando comentario:', error);
                mostrarAlerta('error', 'Error al guardar el comentario. Por favor intenta nuevamente.');
            }
        }
        
        // Actualizar promedio de calificación del vendedor
        async function actualizarPromedioVendedor(vendedorId) {
            try {
                const comentariosSnapshot = await db.collection('comentarios_vendedor')
                    .where('vendedor_id', '==', vendedorId)
                    .where('activo', '==', true)
                    .get();
                
                if (comentariosSnapshot.empty) return;
                
                let sumaCalificaciones = 0;
                let totalComentarios = 0;
                
                comentariosSnapshot.forEach(doc => {
                    const calificacion = doc.data().calificacion || 0;
                    sumaCalificaciones += calificacion;
                    totalComentarios++;
                });
                
                const promedio = totalComentarios > 0 ? sumaCalificaciones / totalComentarios : 0;
                
                // Actualizar en la colección de usuarios
                await db.collection('usuarios').doc(vendedorId).update({
                    calificacion_promedio: Math.round(promedio * 10) / 10, // Redondear a 1 decimal
                    total_calificaciones: totalComentarios
                });
                
            } catch (error) {
                console.error('Error actualizando promedio del vendedor:', error);
            }
        }
        
        // Mostrar alerta
        function mostrarAlerta(tipo, mensaje) {
            const alertEl = document.getElementById('alertComentarVendedor');
            alertEl.className = `alert alert-${tipo === 'error' ? 'error' : 'success'}`;
            alertEl.textContent = mensaje;
            alertEl.style.display = 'block';
            
            setTimeout(() => {
                alertEl.style.display = 'none';
            }, 5000);
        }
        
        // Cerrar modal al hacer clic fuera
        document.addEventListener('click', function(event) {
            const modal = document.getElementById('modal-comentar-vendedor');
            if (event.target === modal) {
                cerrarModalComentarVendedor();
            }
        });

        // Inicializar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', inicializarFirebase);
        } else {
            inicializarFirebase();
        }

(() => {
const common = window.ProductosCommon;

if (!common) {
    console.error('❌ ProductosCommon no está disponible. Asegúrate de cargar productos-common.js antes de mis-productos.js');
    return;
}

const { ensureFirebase, mostrarMensaje, actualizarSaludoUsuario } = common;

let auth = null;
let db = null;
let storage = null;

let allProducts = [];
let currentPage = 1;
const PAGE_SIZE = 15;

function getVisibleProducts() {
    const start = (currentPage - 1) * PAGE_SIZE;
    return allProducts.slice(start, start + PAGE_SIZE);
}

function updatePagination(total) {
    const container = document.getElementById('paginationContainer');
    const info = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!container || !info || !prevBtn || !nextBtn) {
        return;
    }

    container.style.display = total > PAGE_SIZE ? 'flex' : 'none';

    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, total);

    info.textContent = `Mostrando ${start}-${end} de ${total} productos`;

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage * PAGE_SIZE >= total;
}

const statusBox = document.getElementById('statusBox');
const statusText = document.getElementById('statusText');

function setStatus(message, type = 'info', autoHide = true) {
    if (!statusBox || !statusText) {
        if (type === 'error') {
            console.error(message);
        } else {
            console.log(message);
        }
        return;
    }

    statusText.innerHTML = message;
    statusBox.style.display = 'block';

    const palettes = {
        success: { background: '#d4edda', border: '#c3e6cb', color: '#155724' },
        error: { background: '#f8d7da', border: '#f5c6cb', color: '#721c24' },
        warning: { background: '#fff3cd', border: '#ffeeba', color: '#856404' },
        info: { background: '#e7f3ff', border: '#b3d9ff', color: '#0c5460' }
    };

    const palette = palettes[type] || palettes.info;
    statusBox.style.background = palette.background;
    statusBox.style.borderColor = palette.border;
    statusBox.style.color = palette.color;

    if (autoHide) {
        setTimeout(() => {
            statusBox.style.display = 'none';
        }, 3000);
    }
}

function hideStatus() {
    if (statusBox) {
        statusBox.style.display = 'none';
    }
}

window.cerrarSesion = function cerrarSesion() {
    if (!auth) {
        window.location.href = '/auth/login';
        return;
    }

    auth.signOut().then(() => {
        window.location.href = '/';
    }).catch((error) => {
        setStatus('Error al cerrar sesión: ' + error.message, 'error');
    });
};

function capitalizar(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

async function obtenerImagenDesdeFirestore(ref) {
    try {
        const docId = ref.replace('firestore://imagenes_productos/', '');
        const doc = await db.collection('imagenes_productos').doc(docId).get();
        if (!doc.exists) {
            console.warn('Documento de imagen no encontrado:', ref);
            return null;
        }

        const data = doc.data();
        const mime = data.tipo || data.contentType || 'image/jpeg';
        const base64 = data.datos || data.data;
        if (!base64) {
            console.warn('Documento de imagen sin datos base64:', ref);
            return null;
        }

        return `data:${mime};base64,${base64}`;
    } catch (error) {
        console.error('Error al obtener imagen desde Firestore:', error);
        return null;
    }
}

async function prepararProductos(productos) {
    return Promise.all(productos.map(async (producto) => {
        let imagenUrl = producto.imagen;

        if (!imagenUrl && Array.isArray(producto.imagenes) && producto.imagenes.length) {
            imagenUrl = producto.imagenes[0];
        }

        if (imagenUrl && imagenUrl.startsWith('firestore://imagenes_productos/')) {
            imagenUrl = await obtenerImagenDesdeFirestore(imagenUrl);
        }

        return {
            ...producto,
            imagenUrl
        };
    }));
}

function renderProducts(productos) {
    const table = document.getElementById('productsTable');
    const body = document.getElementById('productsBody');
    const loader = document.getElementById('productsLoader');
    const empty = document.getElementById('productsEmpty');

    if (!table || !body) {
        console.error('Tabla de productos no encontrada');
        return;
    }

    if (loader) loader.style.display = 'none';

    if (!productos.length) {
        table.style.display = 'none';
        body.innerHTML = '';
        if (empty) {
            empty.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h4>No hay productos</h4>
                    <p>Comienza agregando tu primer producto.</p>
                    <button class="action-pill" onclick="window.location.href='/vendedor/agregar_producto'">
                        Agregar producto
                    </button>
                </div>
            `;
            empty.style.display = 'block';
        }
        hideStatus();
        updatePagination(0);
        return;
    }

    if (empty) empty.style.display = 'none';
    table.style.display = 'block';

    const rows = productos.map((producto) => {
        const nombre = producto.nombre || 'Sin nombre';
        const descripcion = producto.descripcion || 'Sin descripción';
        const categoria = capitalizar(producto.categoria || 'Sin categoría');
        const unidad = capitalizar(producto.unidad || 'Sin unidad');
        const precio = Number(producto.precio) || 0;
        const stock = Number(producto.stock) || 0;
        const imagenUrl = producto.imagenUrl || null;
        const activo = producto.activo !== false;
        const statusLabel = activo ? 'Activo' : 'Pausado';
        const pauseLabel = activo ? 'Pausar' : 'Reanudar';

        return `
            <tr>
                <td>
                    <div class="product-info">
                        ${imagenUrl ? `
                            <img src="${imagenUrl}" alt="${nombre}" class="product-image">
                        ` : `
                            <div class="product-image placeholder">
                                <i class="fas fa-image"></i>
                            </div>
                        `}
                        <div class="product-details">
                            <h4>${nombre}</h4>
                            <p>${descripcion.length > 60 ? descripcion.substring(0, 60) + '…' : descripcion}</p>
                        </div>
                    </div>
                </td>
                <td><span class="category-badge">${categoria}</span></td>
                <td class="product-price">$ ${precio.toFixed(2)}</td>
                <td>${stock}</td>
                <td>${unidad}</td>
                <td><span class="status-pill ${activo ? 'active' : 'paused'}">${statusLabel}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-pill action-edit" onclick="window.editProduct('${producto.id}')">Editar</button>
                        <button class="action-pill action-pause" onclick="window.pauseProduct('${producto.id}')">${pauseLabel}</button>
                        <button class="action-pill action-delete" onclick="window.deleteProduct('${producto.id}', '${nombre.replace(/'/g, "\'")}')">Eliminar</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    body.innerHTML = rows;
    updatePagination(allProducts.length);

    hideStatus();
}

async function loadProducts(vendedorId) {
    try {
        setStatus('📦 Cargando productos...');

        const loader = document.getElementById('productsLoader');
        if (loader) loader.style.display = 'block';

        const consultas = [
            db.collection('productos').where('vendedor_id', '==', vendedorId),
            db.collection('productos').where('vendedorId', '==', vendedorId),
            db.collection('productos').where('uid', '==', vendedorId)
        ];

        let snapshot = null;
        for (let i = 0; i < consultas.length; i += 1) {
            snapshot = await consultas[i].get();
            if (!snapshot.empty) break;
        }

        if (!snapshot || snapshot.empty) {
            const todos = await db.collection('productos').limit(100).get();
            if (todos.empty) {
                allProducts = [];
                renderProducts([]);
                setStatus('📭 No se encontraron productos', 'info');
                return;
            }
            snapshot = todos;
        }

        const productos = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.vendedor_id === vendedorId || data.vendedorId === vendedorId || data.uid === vendedorId) {
                productos.push({ id: doc.id, ...data });
            }
        });

        if (!productos.length) {
            allProducts = [];
            setStatus('📭 No se encontraron productos del vendedor', 'info');
            renderProducts([]);
            return;
        }

        allProducts = await prepararProductos(productos);
        currentPage = 1;
        renderProducts(getVisibleProducts());
        setStatus(`✅ Productos cargados: ${allProducts.length}`, 'success');
    } catch (error) {
        console.error('Error al cargar productos:', error);
        setStatus('❌ Error al cargar productos: ' + error.message, 'error', false);
        mostrarMensaje('❌ Error al cargar productos: ' + error.message, 'error');
        const loader = document.getElementById('productsLoader');
        if (loader) loader.style.display = 'none';
    }
}

window.changePage = function changePage(delta) {
    const totalPages = Math.ceil(allProducts.length / PAGE_SIZE);
    const newPage = currentPage + delta;
    if (newPage < 1 || newPage > totalPages) {
        return;
    }
    currentPage = newPage;
    renderProducts(getVisibleProducts());
};

window.editProduct = function editProduct(productId) {
    window.location.href = `/vendedor/editar/${productId}`;
};

window.pauseProduct = async function pauseProduct(productId) {
    const confirmText = '¿Estás seguro de que quieres cambiar el estado de este producto?';
    if (!confirm(confirmText)) return;

    try {
        setStatus('⏳ Actualizando estado del producto...');
        const docRef = db.collection('productos').doc(productId);
        const doc = await docRef.get();
        if (!doc.exists) throw new Error('Producto no encontrado');

        const data = doc.data();
        const nuevoEstado = !(data.activo !== false);

        await docRef.update({
            activo: !nuevoEstado,
            fecha_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
        });

        setStatus(nuevoEstado ? '⏸️ Producto pausado' : '▶️ Producto reactivado', 'success');

        const user = auth.currentUser;
        if (user) {
            await loadProducts(user.uid);
        }
    } catch (error) {
        console.error('Error al pausar producto:', error);
        setStatus('❌ Error al cambiar estado: ' + error.message, 'error');
        mostrarMensaje('❌ Error al cambiar estado del producto', 'error');
    }
};

window.deleteProduct = async function deleteProduct(productId, productName) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el producto "${productName}"?`)) {
        return;
    }

    try {
        setStatus('🗑️ Eliminando producto...');
        await db.collection('productos').doc(productId).delete();
        mostrarMensaje('✅ Producto eliminado correctamente', 'success');

        const user = auth.currentUser;
        if (user) {
            await loadProducts(user.uid);
        }
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        setStatus('❌ Error al eliminar producto: ' + error.message, 'error');
        mostrarMensaje('❌ Error al eliminar el producto', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ensureFirebase().then(({ auth: authInstance, db: dbInstance, storage: storageInstance }) => {
        auth = authInstance;
        db = dbInstance;
        storage = storageInstance;

        auth.onAuthStateChanged((user) => {
            if (!user) {
                setStatus('❌ Usuario no autenticado. Redirigiendo...', 'error', false);
                setTimeout(() => {
                    window.location.href = '/auth/login';
                }, 1500);
                return;
            }

            actualizarSaludoUsuario(user);
            setStatus('✅ Usuario autenticado: ' + (user.email || 'Sin correo'));
            loadProducts(user.uid);
        });
    }).catch((error) => {
        console.error('Error inicializando Firebase:', error);
        setStatus('❌ Error de conexión. Recarga la página.', 'error', false);
        mostrarMensaje('❌ Error de conexión. Recarga la página.', 'error');
    });
});

})();


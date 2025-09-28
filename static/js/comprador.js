document.addEventListener("DOMContentLoaded", () => {
    const listaCarrito = document.getElementById("listaCarrito");
    const totalCarrito = document.getElementById("totalCarrito");
    const inputBusqueda = document.getElementById("busqueda");
    const selectCategoria = document.getElementById("categoria");
    const btnBuscar = document.getElementById("btnBuscar");
    const contadorCarrito = document.getElementById("contadorCarrito");
    const btnVerCarrito = document.getElementById("btnCarrito");
    const btnComprar = document.getElementById("btnComprar");

    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const productos = document.querySelectorAll(".producto-card");

    // Crear botones "Agregar al carrito" dinámicamente
    productos.forEach(producto => {
        const id = producto.dataset.id;
        const nombre = producto.dataset.nombre;
        const precio = parseFloat(producto.dataset.precio);

        

        producto.appendChild(btn);

        btn.addEventListener("click", () => {
            const productoExistente = carrito.find(p => p.id === id);
            if (productoExistente) {
                productoExistente.cantidad++;
            } else {
                carrito.push({ id, nombre, precio, cantidad: 1 });
            }
            guardarYActualizarCarrito();
        });
    });

    function guardarYActualizarCarrito() {
        localStorage.setItem("carrito", JSON.stringify(carrito));
        actualizarCarrito();
    }

    function actualizarCarrito() {
        listaCarrito.innerHTML = "";
        let total = 0;

        carrito.forEach(producto => {
            total += producto.precio * producto.cantidad;
            const li = document.createElement("li");
            li.innerHTML = `
                ${producto.nombre} - $${producto.precio.toFixed(2)} x ${producto.cantidad}
                <button class="eliminar" data-id="${producto.id}">❌</button>
            `;
            listaCarrito.appendChild(li);
        });

        totalCarrito.textContent = total.toFixed(2);

        // Actualizar contador en el menú
        const cantidadTotal = carrito.reduce((sum, p) => sum + p.cantidad, 0);
        contadorCarrito.textContent = cantidadTotal;

        // Botones eliminar
        document.querySelectorAll(".eliminar").forEach(boton => {
            boton.onclick = () => {
                const id = boton.dataset.id;
                carrito = carrito.filter(p => p.id !== id);
                guardarYActualizarCarrito();
            };
        });
    }

    // Inicializar carrito al cargar la página
    actualizarCarrito();

    // Botón comprar
    btnComprar.addEventListener("click", () => {
        if (carrito.length === 0) {
            alert("El carrito está vacío.");
            return;
        }
        alert("Compra realizada con éxito ✅");
        carrito = [];
        guardarYActualizarCarrito();
    });

    // Búsqueda por nombre o categoría
    btnBuscar.addEventListener("click", () => {
        const texto = inputBusqueda.value.toLowerCase();
        const categoria = selectCategoria.value.toLowerCase();

        productos.forEach(producto => {
            const nombre = producto.dataset.nombre.toLowerCase();
            const categoriaProducto = producto.dataset.categoria.toLowerCase();

            const coincideTexto = nombre.includes(texto);
            const coincideCategoria = categoria === "" || categoria === categoriaProducto;

            producto.style.display = (coincideTexto && coincideCategoria) ? "block" : "none";
        });
    });

    // Redirigir al carrito al hacer clic en el icono
    btnVerCarrito.addEventListener("click", () => {
        window.location.href = "{{ url_for('comprador.ver_carrito') }}";
    });
});

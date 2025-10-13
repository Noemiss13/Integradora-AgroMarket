from flask import Blueprint, render_template, session, redirect, url_for, request, flash, jsonify, current_app
from models.database import get_db_connection
from modules.auth.decorators import login_required, role_required

# Blueprint del comprador
comprador = Blueprint('comprador', __name__, template_folder="templates")


# ===== Función para obtener noticias =====
def obtener_noticias():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, titulo, descripcion, url, imagen
        FROM noticias
        ORDER BY fecha DESC
        LIMIT 5
    """)
    noticias = cursor.fetchall()
    conn.close()
    return noticias


# ===== Ver productos por categoría (URL bonita) =====
@comprador.route("/categoria/<string:categoria>")
@login_required
@role_required("comprador")
def ver_categoria(categoria):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen, p.categoria, p.stock,
               u.nombre AS vendedor
        FROM productos p
        JOIN usuarios u ON p.vendedor_id = u.id
        WHERE p.categoria = %s
    """, (categoria,))
    productos = cursor.fetchall()
    conn.close()

    return render_template(
        "comprador/productos_comprador.html",
        productos=productos,
        nombre=session.get("nombre"),
        page='productos',
        categoria=categoria
    )


# ===== Panel del comprador =====
@comprador.route("/panel")
@login_required
@role_required("comprador")
def panel_comprador():
    noticias = obtener_noticias()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Categorías con contadores y etiquetas
    cursor.execute("""
        SELECT 
            categoria AS nombre, 
            MIN(imagen) AS imagen,
            COUNT(*) AS productos_count,
            CASE 
                WHEN categoria = 'frutas' THEN 'Temporada'
                WHEN categoria = 'verduras' THEN 'Orgánico'
                WHEN categoria = 'semillas' THEN 'A granel'
                WHEN categoria = 'cereales' THEN 'Mayorista'
                WHEN categoria = 'tubérculos' THEN 'Populares'
                WHEN categoria = 'hierbas' THEN 'Aromáticas'
                ELSE 'Disponible'
            END AS tag
        FROM productos
        GROUP BY categoria
        ORDER BY productos_count DESC
    """)
    categorias = cursor.fetchall()

    # Productos populares (más vendidos o con mayor stock)
    cursor.execute("""
        SELECT id, nombre, descripcion, precio, imagen, stock
        FROM productos
        WHERE stock > 0
        ORDER BY stock DESC, nombre ASC
        LIMIT 2
    """)
    productos_populares = cursor.fetchall()

    # Contar total de productos
    cursor.execute("SELECT COUNT(*) as total FROM productos WHERE stock > 0")
    total_productos = cursor.fetchone()['total']
    
    conn.close()

    return render_template(
        "comprador/panel_comprador.html",
        nombre=session.get("nombre"),
        noticias=noticias,
        categorias=categorias,
        productos_populares=productos_populares,
        total_productos=total_productos,
        page='inicio'
    )


# ===== Ver productos (con filtros por categoría y búsqueda) =====
@comprador.route("/productos")
@login_required
@role_required("comprador")
def ver_productos():
    categoria = request.args.get("categoria")
    busqueda = request.args.get("busqueda")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen, p.categoria, p.stock,
               u.nombre AS vendedor
        FROM productos p
        JOIN usuarios u ON p.vendedor_id = u.id
        WHERE 1=1
    """
    params = []

    if categoria:
        query += " AND p.categoria = %s"
        params.append(categoria)

    if busqueda:
        query += " AND (p.nombre LIKE %s OR p.descripcion LIKE %s)"
        params.extend([f"%{busqueda}%", f"%{busqueda}%"])

    cursor.execute(query, params)
    productos = cursor.fetchall()
    conn.close()

    return render_template(
        "comprador/productos_comprador.html",
        productos=productos,
        nombre=session.get("nombre"),
        page='productos',
        categoria=categoria,
        busqueda=busqueda
    )


# ===== Ver detalle de producto =====
@comprador.route("/producto/<int:id>")
@login_required
@role_required("comprador")
def ver_detalle_producto(id):
    # Obtener la categoría desde los query params (si viene de un filtro)
    categoria_filtro = request.args.get("categoria")
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Obtener información del producto
    cursor.execute("""
        SELECT p.*, u.nombre as vendedor_nombre, u.email as vendedor_email
        FROM productos p 
        JOIN usuarios u ON p.vendedor_id = u.id 
        WHERE p.id = %s
    """, (id,))
    producto = cursor.fetchone()
    
    if not producto:
        flash("Producto no encontrado", "danger")
        conn.close()
        return redirect(url_for("comprador.ver_productos"))
    
    conn.close()
    return render_template("comprador/detalle_producto.html", 
                         producto=producto, 
                         nombre=session.get("nombre"),
                         categoria_filtro=categoria_filtro)

# ===== Sobre nosotros =====
@comprador.route("/sobre_nosotros")
@login_required
@role_required("comprador")
def sobre_nosotros_comprador():
    return render_template("general/sobre_nosotros.html", page='sobre')


# ===== Agregar al carrito =====
@comprador.route('/agregar_carrito/<int:producto_id>', methods=['POST'])
@login_required
@role_required("comprador")
def agregar_carrito(producto_id):
    cantidad_solicitada = int(request.form.get("cantidad", 1))
    buy_now = request.form.get("buy_now", False)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, nombre, precio, stock, imagen, categoria, descripcion FROM productos WHERE id = %s", (producto_id,))
    producto = cursor.fetchone()
    conn.close()

    if not producto:
        flash("Producto no encontrado", "danger")
        return redirect(url_for('comprador.ver_productos'))

    # Validaciones básicas
    if cantidad_solicitada < 1:
        flash("La cantidad debe ser mayor a 0", "warning")
        return redirect(url_for('comprador.ver_detalle_producto', id=producto_id))
    
    if cantidad_solicitada > producto["stock"]:
        flash(f"No puedes agregar {cantidad_solicitada} unidades. Solo hay {producto['stock']} en stock.", "danger")
        return redirect(url_for('comprador.ver_detalle_producto', id=producto_id))

    if "carrito" not in session:
        session["carrito"] = []

    carrito = session["carrito"]
    
    # Verificar si el producto ya está en el carrito
    for item in carrito:
        if item["id"] == producto["id"]:
            # Calcular la cantidad total que tendría en el carrito
            cantidad_total_carrito = item["cantidad"] + cantidad_solicitada
            
            if cantidad_total_carrito > producto["stock"]:
                flash(f"No puedes agregar más. Ya tienes {item['cantidad']} en el carrito y solo hay {producto['stock']} disponibles.", "warning")
                return redirect(url_for('comprador.ver_detalle_producto', id=producto_id))
            
            item["cantidad"] += cantidad_solicitada
            flash("Producto agregado al carrito ✅", "success")
            break
    else:
        # Producto nuevo en el carrito
        producto["cantidad"] = cantidad_solicitada
        session["carrito"].append(producto)
        flash("Producto agregado al carrito ✅", "success")
    
    # Si es "comprar ahora", redirigir al carrito, sino mantener en la página del producto
    if buy_now:
        return redirect(url_for("comprador.ver_carrito"))
    else:
        return redirect(url_for('comprador.ver_detalle_producto', id=producto_id))


# ===== Finalizar compra =====
@comprador.route("/finalizar_compra", methods=["POST"])
@login_required
@role_required("comprador")
def finalizar_compra():
    carrito = session.get("carrito", [])
    if not carrito:
        flash("Tu carrito está vacío", "warning")
        return redirect(url_for("comprador.ver_carrito"))

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        for item in carrito:
            producto_id = item["id"]
            cantidad = int(item["cantidad"])
            precio = float(item["precio"])
            total = round(precio * cantidad, 2)

            # Descontar stock
            cursor.execute(
                "UPDATE productos SET stock = stock - %s WHERE id = %s AND stock >= %s",
                (cantidad, producto_id, cantidad)
            )

            # Registrar venta
            cursor.execute("""
                INSERT INTO ventas (producto_id, cantidad, total, fecha_venta)
                VALUES (%s, %s, %s, NOW())
            """, (producto_id, cantidad, total))

        conn.commit()
        flash("✅ Compra realizada y stock actualizado.")
        session["carrito"] = []  # Vaciar carrito
    except Exception as e:
        conn.rollback()
        flash(f"❌ Error en la compra: {e}", "danger")
    finally:
        conn.close()

    return redirect(url_for("comprador.ver_carrito"))


# ===== Ajustar cantidad en carrito =====
@comprador.route("/carrito/aumentar/<int:producto_id>", methods=["POST"])
@login_required
@role_required("comprador")
def aumentar_cantidad(producto_id):
    # Obtener el stock actual del producto
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT stock FROM productos WHERE id = %s", (producto_id,))
    producto = cursor.fetchone()
    conn.close()
    
    if not producto:
        flash("Producto no encontrado", "danger")
        return redirect(url_for("comprador.ver_carrito"))
    
    carrito = session.get("carrito", [])
    for item in carrito:
        if item["id"] == producto_id:
            if item["cantidad"] + 1 > producto["stock"]:
                flash(f"No puedes agregar más. Stock disponible: {producto['stock']}", "warning")
            else:
                item["cantidad"] += 1
            break
    session["carrito"] = carrito
    return redirect(url_for("comprador.ver_carrito"))


@comprador.route("/carrito/disminuir/<int:producto_id>", methods=["POST"])
@login_required
@role_required("comprador")
def disminuir_cantidad(producto_id):
    carrito = session.get("carrito", [])
    for item in carrito:
        if item["id"] == producto_id and item["cantidad"] > 1:
            item["cantidad"] -= 1
            break
    session["carrito"] = carrito
    return redirect(url_for("comprador.ver_carrito"))


# ===== Ver carrito =====
@comprador.route('/carrito')
@login_required
@role_required("comprador")
def ver_carrito():
    carrito = session.get("carrito", [])
    for item in carrito:
        item["precio"] = float(item["precio"])
        item["cantidad"] = int(item["cantidad"])

    total = sum(item["precio"] * item["cantidad"] for item in carrito)
    return render_template(
        "comprador/carrito.html",
        carrito=carrito,
        total=total,
        nombre=session.get("nombre"),
        page='carrito'
    )


# ===== Eliminar producto del carrito =====
@comprador.route('/eliminar_carrito/<int:producto_id>', methods=['POST'])
@login_required
@role_required("comprador")
def eliminar_del_carrito(producto_id):
    carrito = session.get("carrito", [])
    carrito = [item for item in carrito if item["id"] != producto_id]
    session["carrito"] = carrito
    return redirect(url_for("comprador.ver_carrito"))


# ===== Vaciar carrito completo =====
@comprador.route('/vaciar_carrito', methods=['POST'])
@login_required
@role_required("comprador")
def vaciar_carrito():
    session["carrito"] = []
    return redirect(url_for("comprador.ver_carrito"))

# =======================================================
# 🟢 NUEVAS RUTAS: activar rol de vendedor desde comprador
# =======================================================
@comprador.route("/activar_rol_vendedor", methods=["GET", "POST"])
@login_required
@role_required("comprador")
def activar_rol_vendedor():
    usuario_id = session["usuario_id"]

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Verificar si ya tiene el rol de vendedor
    cursor.execute("SELECT rol FROM roles_usuarios WHERE usuario_id = %s", (usuario_id,))
    roles_usuario = [r["rol"] for r in cursor.fetchall()]

    if "vendedor" in [r.lower() for r in roles_usuario]:
        flash("Ya tienes el rol de vendedor activo.", "info")
        conn.close()
        return redirect(url_for("auth.perfil"))

    if request.method == "POST":
        cursor.execute(
            "INSERT INTO roles_usuarios (usuario_id, rol) VALUES (%s, %s)",
            (usuario_id, "vendedor")
        )
        conn.commit()
        conn.close()

        session["roles"].append("vendedor")
        session["rol_activo"] = "vendedor"
        flash("Rol de vendedor activado con éxito.", "success")
        return redirect(url_for("vendedor.panel_vendedor"))

    conn.close()
    return render_template("auth/activar_rol.html")


# ===== Búsqueda de productos (AJAX) =====
@comprador.route("/buscar")
@login_required
@role_required("comprador")
def buscar_productos():
    query = request.args.get("q", "").strip()
    
    if len(query) < 2:
        return jsonify({"productos": []})
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen, p.stock
        FROM productos p
        WHERE (p.nombre LIKE %s OR p.descripcion LIKE %s)
        AND p.stock > 0
        ORDER BY p.nombre ASC
        LIMIT 10
    """, [f"%{query}%", f"%{query}%"])
    
    productos = cursor.fetchall()
    conn.close()
    
    return jsonify({"productos": productos})


# ===== Agregar al carrito (AJAX) =====
@comprador.route('/agregar_carrito_ajax', methods=['POST'])
@login_required
@role_required("comprador")
def agregar_carrito_ajax():
    data = request.get_json()
    producto_id = data.get('producto_id')
    cantidad = int(data.get('cantidad', 1))
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, nombre, precio, stock FROM productos WHERE id = %s", (producto_id,))
    producto = cursor.fetchone()
    conn.close()
    
    if not producto:
        return jsonify({"success": False, "message": "Producto no encontrado"})
    
    if cantidad > producto["stock"]:
        return jsonify({"success": False, "message": f"Solo hay {producto['stock']} unidades disponibles"})
    
    if "carrito" not in session:
        session["carrito"] = []
    
    carrito = session["carrito"]
    for item in carrito:
        if item["id"] == producto["id"]:
            if item["cantidad"] + cantidad > producto["stock"]:
                return jsonify({"success": False, "message": f"No puedes agregar más. Stock disponible: {producto['stock']}"})
            item["cantidad"] += cantidad
            break
    else:
        producto["cantidad"] = cantidad
        session["carrito"].append(producto)
    
    return jsonify({"success": True, "message": "Producto agregado al carrito"})


# ===== RUTAS DE PAGO =====

@comprador.route('/payment-success', methods=['GET', 'POST'])
@login_required
@role_required("comprador")
def payment_success():
    """Manejar pago exitoso"""
    try:
        # Obtener datos del carrito
        carrito = session.get("carrito", [])
        if not carrito:
            flash("No hay productos en el carrito", "error")
            return redirect(url_for("comprador.panel_comprador"))
        
        # Calcular total
        total = sum(float(item["precio"]) * int(item["cantidad"]) for item in carrito)
        
        # Guardar las ventas en la base de datos usando la tabla 'ventas' existente
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insertar cada producto como una venta individual
        for item in carrito:
            item_total = float(item["precio"]) * int(item["cantidad"])
            cursor.execute("""
                INSERT INTO ventas (producto_id, cantidad, total, fecha_venta)
                VALUES (%s, %s, %s, NOW())
            """, (item['id'], item['cantidad'], item_total))
        
        conn.commit()
        conn.close()
        
        # Limpiar el carrito
        session["carrito"] = []
        
        flash(f"¡Pago exitoso! Tu compra ha sido procesada correctamente.", "success")
        return redirect(url_for("comprador.panel_comprador"))
        
    except Exception as e:
        print(f"Error in payment success: {str(e)}")
        flash("Error al procesar el pago", "error")
        return redirect(url_for("comprador.ver_carrito"))


@comprador.route('/payment-cancel')
@login_required
@role_required("comprador")
def payment_cancel():
    """Manejar cancelación de pago"""
    flash("El pago fue cancelado", "warning")
    return redirect(url_for("comprador.ver_carrito"))

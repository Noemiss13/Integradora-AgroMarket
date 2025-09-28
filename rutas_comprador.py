from flask import Blueprint, render_template, session, redirect, url_for, request
from db import get_db_connection
from models import Producto, db 
from flask import request, redirect, url_for, flash
from db import get_db_connection

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
def ver_categoria(categoria):
    if session.get("rol") != "comprador":
        return redirect(url_for("auth.login"))

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
        "productos_comprador.html",
        productos=productos,
        nombre=session.get("nombre"),
        page='productos',
        categoria=categoria
    )


# ===== Panel del comprador =====
@comprador.route("/panel")
def panel_comprador():
    if session.get("rol") != "comprador":
        return redirect(url_for("auth.login"))

    noticias = obtener_noticias()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Categorías
    cursor.execute("""
        SELECT categoria AS nombre, MIN(imagen) AS imagen
        FROM productos
        GROUP BY categoria
    """)
    categorias = cursor.fetchall()

    # Productos destacados
    cursor.execute("""
        SELECT id, nombre, descripcion, precio, imagen, stock
        FROM productos
        WHERE temporada=1
        LIMIT 6
    """)
    productos_destacados = cursor.fetchall()
    conn.close()

    return render_template(
        "panel_comprador.html",
        nombre=session.get("nombre"),
        noticias=noticias,
        categorias=categorias,
        productos_destacados=productos_destacados,
        page='inicio'  # pestaña activa
    )

# ===== Ver productos (con filtros por categoría y búsqueda) =====
@comprador.route("/productos")
def ver_productos():
    if session.get("rol") != "comprador":
        return redirect(url_for("auth.login"))

    categoria = request.args.get("categoria")  # filtro por categoría
    busqueda = request.args.get("busqueda")    # filtro por texto

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
        "productos_comprador.html",
        productos=productos,
        nombre=session.get("nombre"),
        page='productos',
        categoria=categoria,
        busqueda=busqueda
    )

# ===== Sobre nosotros ===== #
@comprador.route("/sobre_nosotros")
def sobre_nosotros_comprador():
    return render_template("sobre_nosotros.html", page='sobre')

# ==== agregar carrito === #
@comprador.route('/agregar_carrito/<int:producto_id>', methods=['POST'])
def agregar_carrito(producto_id):
    cantidad_solicitada = int(request.form.get("cantidad", 1))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, nombre, precio, stock FROM productos WHERE id = %s", (producto_id,))
    producto = cursor.fetchone()
    conn.close()

    if not producto:
        return redirect(url_for('comprador.ver_productos'))

    if cantidad_solicitada > producto["stock"]:
        flash(f"No puedes agregar {cantidad_solicitada} unidades. Solo hay {producto['stock']} en stock.", "danger")
        return redirect(url_for('comprador.ver_productos'))

    if "carrito" not in session:
        session["carrito"] = []

    carrito = session["carrito"]
    for item in carrito:
        if item["id"] == producto["id"]:
            if item["cantidad"] + cantidad_solicitada > producto["stock"]:
                flash(f"No puedes agregar más. Stock disponible: {producto['stock']}", "warning")
                return redirect(url_for('comprador.ver_productos'))
            item["cantidad"] += cantidad_solicitada
            break
    else:
        producto["cantidad"] = cantidad_solicitada
        session["carrito"].append(producto)

    flash("Producto agregado al carrito ✅", "success")
    return redirect(url_for("comprador.ver_carrito"))

# ===== Finalizar compra ===== #
@comprador.route("/finalizar_compra", methods=["POST"])
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
            cantidad = item["cantidad"]

            # Descontar stock si hay suficiente
            cursor.execute(
                "UPDATE productos SET stock = stock - %s WHERE id = %s AND stock >= %s",
                (cantidad, producto_id, cantidad)
            )

            # Registrar venta
            cursor.execute("""
                INSERT INTO ventas (producto_id, cantidad, total, fecha_venta)
                VALUES (%s, %s, %s, NOW())
            """, (producto_id, cantidad, item["precio"] * cantidad))

        conn.commit()
        flash("✅ Compra realizada y stock actualizado.")
        session["carrito"] = []  # Vaciar carrito
    except Exception as e:
        conn.rollback()
        flash(f"❌ Error en la compra: {e}", "danger")
    finally:
        conn.close()

    return redirect(url_for("comprador.ver_carrito"))


# ===== Disminuir cantidad en carrito =====
@comprador.route("/carrito/aumentar/<int:producto_id>", methods=["POST"])
def aumentar_cantidad(producto_id):
    carrito = session.get("carrito", [])
    for item in carrito:
        if item["id"] == producto_id:
            item["cantidad"] += 1
            break
    session["carrito"] = carrito
    return redirect(url_for("comprador.ver_carrito"))

@comprador.route("/carrito/disminuir/<int:producto_id>", methods=["POST"])
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
def ver_carrito():
    carrito = session.get("carrito", [])
    # Convertimos precios a float por si acaso
    for item in carrito:
        item["precio"] = float(item["precio"])
        item["cantidad"] = int(item["cantidad"])  # seguridad

    total = sum(item["precio"] * item["cantidad"] for item in carrito)
    return render_template(
        "carrito.html",
        carrito=carrito,
        total=total,
        nombre=session.get("nombre"),
        page='carrito'
    )


# ===== Eliminar producto del carrito =====
@comprador.route('/eliminar_carrito/<int:producto_id>', methods=['POST'])
def eliminar_del_carrito(producto_id):
    carrito = session.get("carrito", [])
    carrito = [item for item in carrito if item["id"] != producto_id]
    session["carrito"] = carrito
    return redirect(url_for("comprador.ver_carrito"))

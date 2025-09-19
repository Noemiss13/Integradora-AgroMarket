from flask import Blueprint, render_template, session, redirect, url_for, request
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

# ===== Ver productos por categoría =====
@comprador.route("/categoria/<categoria>")
def ver_categoria(categoria):
    if session.get("rol") != "comprador":
        return redirect(url_for("auth.login"))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen, p.stock,
               u.nombre AS vendedor
        FROM productos p
        JOIN usuarios u ON p.vendedor_id = u.id
        WHERE p.categoria=%s
    """, (categoria,))
    productos = cursor.fetchall()
    conn.close()

    return render_template(
        "productos_categoria.html",
        productos=productos,
        categoria=categoria,
        nombre=session.get("nombre"),
        page='productos'  # pestaña activa
    )

# ===== Catálogo de productos =====
@comprador.route("/productos")
def ver_productos():
    if session.get("rol") != "comprador":
        return redirect(url_for("auth.login"))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen, p.categoria,
               u.nombre AS vendedor
        FROM productos p
        JOIN usuarios u ON p.vendedor_id = u.id
    """)
    productos = cursor.fetchall()
    conn.close()

    return render_template(
        "productos_comprador.html",
        productos=productos,
        nombre=session.get("nombre"),
        page='productos'  # pestaña activa
    )

# ===== Sobre nosotros =====
@comprador.route("/sobre_nosotros")
def sobre_nosotros_comprador():
    return render_template("sobre_nosotros.html", page='sobre')

# ===== Agregar producto al carrito =====
@comprador.route('/agregar_carrito/<int:producto_id>', methods=['POST'])
def agregar_carrito(producto_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, nombre, precio FROM productos WHERE id = %s", (producto_id,))
    producto = cursor.fetchone()
    conn.close()

    if not producto:
        return redirect(url_for('comprador.ver_productos'))

    if "carrito" not in session:
        session["carrito"] = []

    carrito = session["carrito"]
    for item in carrito:
        if item["id"] == producto["id"]:
            item["cantidad"] += 1
            break
    else:
        producto["cantidad"] = 1
        carrito.append(producto)

    session["carrito"] = carrito
    return redirect(url_for("comprador.ver_carrito"))

# ===== Ver carrito =====
@comprador.route('/carrito')
def ver_carrito():
    carrito = session.get("carrito", [])
    total = sum(item["precio"] * item["cantidad"] for item in carrito)
    return render_template(
        "carrito.html",
        carrito=carrito,
        total=total,
        nombre=session.get("nombre"),
        page='carrito'  # pestaña activa
    )

# ===== Finalizar compra =====
@comprador.route('/finalizar')
def finalizar_compra():
    carrito = session.get("carrito", [])
    if not carrito:
        return redirect(url_for("comprador.ver_productos"))

    session.pop("carrito", None)
    return "<h1>¡Compra realizada con éxito! ✅</h1><a href='/productos'>Volver a productos</a>"

# ===== Eliminar producto del carrito =====
@comprador.route('/eliminar_carrito/<int:producto_id>', methods=['POST'])
def eliminar_del_carrito(producto_id):
    carrito = session.get("carrito", [])
    carrito = [item for item in carrito if item["id"] != producto_id]
    session["carrito"] = carrito
    return redirect(url_for("comprador.ver_carrito"))

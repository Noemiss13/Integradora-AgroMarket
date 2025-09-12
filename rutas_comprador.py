from flask import Blueprint, render_template, session, redirect, url_for, request
from db import get_db_connection

# Usamos un solo Blueprint
comprador = Blueprint('comprador', __name__, template_folder="templates")

# ===== Panel del comprador =====
@comprador.route("/panel")
def panel_comprador():
    if session.get("rol") != "comprador":
        return redirect(url_for("auth.login"))
    return render_template("panel_comprador.html", nombre=session.get("nombre"))

# ===== Catálogo de productos =====
@comprador.route("/productos")
def ver_productos():
    if session.get("rol") != "comprador":
        return redirect(url_for("auth.login"))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, nombre, descripcion, precio, imagen, categoria FROM productos")
    productos = cursor.fetchall()
    conn.close()

    return render_template("productos_comprador.html", productos=productos, nombre=session.get("nombre"))

# ===== Sobre nosotros =====
@comprador.route("/sobre_nosotros")
def sobre_nosotros_comprador():
    return render_template("sobre_nosotros.html")

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

    # Si ya existe el producto en el carrito, sumamos cantidad
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
    return render_template("carrito.html", carrito=carrito, total=total)

# ===== Finalizar compra =====
@comprador.route('/finalizar')
def finalizar_compra():
    carrito = session.get("carrito", [])
    if not carrito:
        return redirect(url_for("comprador.ver_productos"))

    # Aquí se podría guardar la compra en la BD
    session.pop("carrito", None)  # Vaciar carrito
    return "<h1>¡Compra realizada con éxito! ✅</h1><a href='/productos'>Volver a productos</a>"

# ===== Eliminar producto del carrito =====
@comprador.route('/eliminar_carrito/<int:producto_id>', methods=['POST'])
def eliminar_del_carrito(producto_id):
    carrito = session.get("carrito", [])
    carrito = [item for item in carrito if item["id"] != producto_id]
    session["carrito"] = carrito
    return redirect(url_for("comprador.ver_carrito"))

from flask import Blueprint, render_template, session, redirect, url_for
from db import get_db_connection

comprador_bp = Blueprint("comprador", __name__, template_folder="templates")

# Panel Comprador
@comprador_bp.route("/panel")
def panel_comprador():
    if session.get("rol") != "comprador":
        return redirect(url_for("auth.login"))
    return render_template("panel_comprador.html", nombre=session.get("nombre"))

# Catálogo de productos
@comprador_bp.route("/productos")
def ver_productos():
    if session.get("rol") != "comprador":
        return redirect(url_for("auth.login"))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, nombre, descripcion, precio, imagen FROM productos")
    productos = cursor.fetchall()
    conn.close()

    return render_template("productos_comprador.html", productos=productos, nombre=session.get("nombre"))

# Nueva ruta de Sobre Nosotros
@comprador_bp.route("/sobre_nosotros")
def sobre_nosotros_comprador():
    return render_template("sobre_nosotros.html")

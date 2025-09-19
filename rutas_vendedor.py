import os
from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from werkzeug.utils import secure_filename
from db import get_db_connection

vendedor_bp = Blueprint('vendedor', __name__, template_folder='templates')

# Carpeta para subir imágenes
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static/uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ===== Panel Vendedor =====
@vendedor_bp.route("/vendedor/panel")
def panel_vendedor():
    if session.get("rol") != "vendedor":
        return redirect(url_for("auth.login"))
    return render_template("panel_vendedor.html", nombre=session.get("nombre"))

# ===== Agregar Producto =====
@vendedor_bp.route("/vendedor/agregar", methods=["GET", "POST"])
def agregar_producto():
    if session.get("rol") != "vendedor":
        return redirect(url_for("auth.login"))

    if request.method == "POST":
        nombre = request.form.get("nombre")
        descripcion = request.form.get("descripcion")
        categoria = request.form.get("categoria")
        unidad = request.form.get("unidad")

        # Guardar stock
        try:
            stock = int(request.form.get("stock"))
            if stock < 0:
                raise ValueError
        except (ValueError, TypeError):
            flash("Stock inválido", "danger")
            return redirect(request.url)

        # Guardar precio
        try:
            precio = float(request.form.get("precio"))
        except (ValueError, TypeError):
            flash("Precio inválido", "danger")
            return redirect(request.url)

        # Guardar imagen
        file = request.files.get("imagen")
        if not file or file.filename == '':
            flash("No se seleccionó ningún archivo.", "danger")
            return redirect(request.url)

        if not allowed_file(file.filename):
            flash(f"Formato no permitido. Solo: {', '.join(ALLOWED_EXTENSIONS)}", "danger")
            return redirect(request.url)

        filename = secure_filename(file.filename)
        file.save(os.path.join(UPLOAD_FOLDER, filename))

        # Guardar en la base de datos
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO productos (nombre, descripcion, categoria, precio, unidad, stock, imagen, vendedor_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (nombre, descripcion, categoria, precio, unidad, stock, filename, session["usuario_id"]))
            conn.commit()
            conn.close()
            flash("Producto publicado correctamente", "success")
        except Exception as e:
            flash(f"Error al guardar el producto: {e}", "danger")
            return redirect(request.url)

        return redirect(url_for("vendedor.agregar_producto"))

    return render_template("agregar_producto.html", nombre=session.get("nombre"))

# ===== Ver Productos =====
@vendedor_bp.route("/vendedor/productos")
def productos():
    if session.get("rol") != "vendedor":
        return redirect(url_for("auth.login"))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, nombre, descripcion, categoria, precio, unidad, stock, imagen
        FROM productos
        WHERE vendedor_id = %s
    """, (session["usuario_id"],))
    productos = cursor.fetchall()
    conn.close()
    return render_template("productos.html", productos=productos, nombre=session.get("nombre"))

# ===== Ventas =====
@vendedor_bp.route("/vendedor/ventas")
def ventas():
    if session.get("rol") != "vendedor":
        return redirect(url_for("auth.login"))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT p.nombre AS producto, v.cantidad, v.total, v.fecha_venta
        FROM ventas v
        JOIN productos p ON v.producto_id = p.id
        WHERE p.vendedor_id = %s
        ORDER BY v.fecha_venta DESC
    """, (session["usuario_id"],))
    ventas = cursor.fetchall()
    conn.close()

    return render_template("ventas.html", ventas=ventas, nombre=session.get("nombre"))

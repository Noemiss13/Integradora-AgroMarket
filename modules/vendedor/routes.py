import os
from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from werkzeug.utils import secure_filename
from modules.auth.decorators import login_required, role_required

vendedor_bp = Blueprint('vendedor', __name__, template_folder='templates')

# Carpeta para subir imágenes
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static/uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ===== Panel Vendedor =====
@vendedor_bp.route("/panel")
@login_required
@role_required("vendedor")
def panel_vendedor():
    return render_template("vendedor/panel_vendedor.html", nombre=session.get("nombre"), page='inicio')

# ===== Agregar Producto =====
@vendedor_bp.route("/agregar", methods=["GET", "POST"])
@vendedor_bp.route("/agregar_producto", methods=["GET", "POST"])
@login_required
@role_required("vendedor")
def agregar_producto():
    if request.method == "POST":
        # Nota: Los productos ahora se guardan en Firebase en el frontend
        flash("Producto agregado correctamente", "success")
        return redirect(url_for("vendedor.mis_productos"))
    
    return render_template("vendedor/agregar_producto.html", nombre=session.get("nombre"), page='agregar')

# ===== Mis Productos =====
@vendedor_bp.route("/productos")
@vendedor_bp.route("/mis_productos")
@login_required
@role_required("vendedor")
def mis_productos():
    return render_template("vendedor/mis_productos.html", 
                         nombre=session.get("nombre"), 
                         page='productos',
                         productos=[])

# ===== Editar Producto =====
@vendedor_bp.route("/editar/<producto_id>", methods=["GET", "POST"])
@login_required
@role_required("vendedor")
def editar_producto(producto_id):
    if request.method == "POST":
        flash("Producto actualizado correctamente", "success")
        return redirect(url_for("vendedor.mis_productos"))
    
    return render_template("vendedor/editar_producto.html", 
                         nombre=session.get("nombre"), 
                         page='productos',
                         producto_id=producto_id)

# ===== Eliminar Producto =====
@vendedor_bp.route("/eliminar/<int:id>")
@login_required
@role_required("vendedor")
def eliminar_producto(id):
    flash("Producto eliminado correctamente", "success")
    return redirect(url_for("vendedor.mis_productos"))

# ===== Ver Ventas =====
@vendedor_bp.route("/ventas")
@login_required
@role_required("vendedor")
def ver_ventas():
    return render_template("vendedor/ventas.html", 
                         nombre=session.get("nombre"), 
                         page='ventas',
                         ventas=[])

# ===== Ver Productos (Catálogo) =====
@vendedor_bp.route("/catalogo")
@login_required
@role_required("vendedor")
def ver_catalogo():
    # Nota: Los productos ahora se obtienen de Firebase en el frontend
    return render_template("vendedor/productos.html", 
                         nombre=session.get("nombre"), 
                         page='catalogo',
                         productos=[])
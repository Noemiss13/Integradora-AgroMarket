from flask import Flask, render_template, jsonify, redirect, url_for, session
from rutas_vendedor import vendedor_bp
from auth.rutas import auth_bp
from db import get_db_connection
from rutas_comprador import comprador  # ✅ Blueprint del comprador



app = Flask(__name__)
app.secret_key = "clave_secreta_agromarket"

# ===== Registrar blueprints =====
app.register_blueprint(auth_bp)
app.register_blueprint(vendedor_bp)
app.register_blueprint(comprador, url_prefix="/comprador")

# ===== Home =====
@app.route("/")
def home():
    return render_template("informacion.html")


# ===== Página de catálogo offline =====
@app.route("/catalogo_offline")
def catalogo_offline():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nombre, descripcion, precio, imagen FROM productos")
    productos = cursor.fetchall()
    conn.close()
    return render_template("catalogo_offline.html", productos=productos)

# ===== Catálogo JSON =====
@app.route("/catalogo.json")
def catalogo_json():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nombre, descripcion, precio, imagen FROM productos")
    productos = cursor.fetchall()
    conn.close()
    return jsonify(productos)

# ===== Sobre nosotros =====
@app.route("/sobre_nosotros")
def sobre_nosotros():
    return render_template("sobre_nosotros.html")

# ===== Noticias agrícolas (para compradores) =====
# Se integra dentro del Blueprint, pero se puede crear aquí si quieres acceso directo
@app.route("/noticias_comprador")
def noticias_comprador_direct():
    if session.get("rol") != "comprador":
        return redirect(url_for("auth.login"))

    noticias = fetch_and_cache()
    nombre = session.get("nombre")
    return render_template("informacion.html", nombre=nombre, noticias=noticias)

if __name__ == "__main__":
    app.run(debug=True)

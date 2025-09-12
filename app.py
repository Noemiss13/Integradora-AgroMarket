from flask import Flask, render_template, jsonify, redirect, url_for, session
from rutas_vendedor import vendedor_bp
from auth.rutas import auth_bp
from db import get_db_connection
from rutas_comprador import comprador  # ✅ Cambiado de comprador_bp a comprador

app = Flask(__name__)
app.secret_key = "clave_secreta_agromarket"  # ✅ Aquí la clave secreta

# Registrar blueprints
app.register_blueprint(auth_bp)  
app.register_blueprint(vendedor_bp)  
app.register_blueprint(comprador, url_prefix="/comprador")  # ✅ Usamos el Blueprint correcto

# Rutas de prueba para compradores
@app.route("/panel/comprador")
def panel_comprador():
    if session.get("rol") == "comprador":
        return render_template("panel_comprador.html", nombre=session.get("nombre"))
    return redirect(url_for("auth.login"))

# Home ahora carga informacion.html
@app.route("/")
def home():
    return render_template("informacion.html")

@app.route("/catalogo_offline")
def catalogo_offline():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nombre, descripcion, precio, imagen FROM productos")
    productos = cursor.fetchall()
    conn.close()
    return render_template("catalogo_offline.html", productos=productos)

@app.route("/catalogo.json")
def catalogo_json():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nombre, descripcion, precio, imagen FROM productos")
    productos = cursor.fetchall()
    conn.close()
    return jsonify(productos)

@app.route("/sobre_nosotros")
def sobre_nosotros():
    return render_template("sobre_nosotros.html")

if __name__ == "__main__":
    app.run(debug=True)


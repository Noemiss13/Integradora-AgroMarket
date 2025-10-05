from flask import Flask, render_template, jsonify
from flask_bcrypt import Bcrypt
from rutas_vendedor import vendedor_bp
from rutas_comprador import comprador  # Blueprint del comprador
from models import db

app = Flask(__name__)
app.secret_key = "clave_secreta_agromarket"

# Inicializamos bcrypt y SQLAlchemy
bcrypt = Bcrypt(app)

# Configuración de SQLAlchemy para MySQL (Laragon)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:@localhost/agromarket'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Importamos después de inicializar bcrypt para evitar circular import
from auth.rutas import auth_bp

# Registrar blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(vendedor_bp)
app.register_blueprint(comprador, url_prefix="/comprador")

# ---------------------
# Rutas generales
# ---------------------
@app.route("/")
def home():
    return render_template("informacion.html")

@app.route("/catalogo_offline")
def catalogo_offline():
    from db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nombre, descripcion, precio, imagen, stock FROM productos")
    productos = cursor.fetchall()
    conn.close()
    return render_template("catalogo_offline.html", productos=productos)

@app.route("/catalogo.json")
def catalogo_json():
    from db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nombre, descripcion, precio, imagen FROM productos")
    productos = cursor.fetchall()
    conn.close()
    return jsonify(productos)

@app.route("/sobre_nosotros")
def sobre_nosotros():
    return render_template("sobre_nosotros.html")

# ---------------------
# Ejecutar la app
# ---------------------
if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)


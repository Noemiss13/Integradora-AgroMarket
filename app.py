from flask import Flask, render_template, jsonify
from flask_bcrypt import Bcrypt
from rutas_vendedor import vendedor_bp
from rutas_comprador import comprador  # Blueprint del comprador
from models import db
from auth.rutas import auth_bp

app = Flask(__name__)
app.secret_key = "clave_secreta_agromarket"
bcrypt = Bcrypt(app)


# Configuración de SQLAlchemy para Laragon (MySQL)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:@localhost/agromarket'
# Registrar blueprints
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)   # Esto es obligatorio
app.register_blueprint(auth_bp)
app.register_blueprint(vendedor_bp)
app.register_blueprint(comprador, url_prefix="/comprador")

# Home
@app.route("/")
def home():
    return render_template("informacion.html")

# Catálogo offline
@app.route("/catalogo_offline")
def catalogo_offline():
    from db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nombre, descripcion, precio, imagen, stock FROM productos")
    productos = cursor.fetchall()
    conn.close()
    return render_template("catalogo_offline.html", productos=productos)

# Catálogo JSON
@app.route("/catalogo.json")
def catalogo_json():
    from db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nombre, descripcion, precio, imagen FROM productos")
    productos = cursor.fetchall()
    conn.close()
    return jsonify(productos)

# Sobre nosotros
@app.route("/sobre_nosotros")
def sobre_nosotros():
    return render_template("sobre_nosotros.html")

if __name__ == "__main__":
    app.run(debug=True)

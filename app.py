from flask import Flask, render_template, jsonify
from flask_bcrypt import Bcrypt
from flask_mail import Mail  # ✅ Importamos Flask-Mail
from rutas_vendedor import vendedor_bp
from rutas_comprador import comprador  # Blueprint del comprador
from models import db

app = Flask(__name__)
app.secret_key = "clave_secreta_agromarket"

# Inicializamos bcrypt y SQLAlchemy
bcrypt = Bcrypt(app)

# ---------------------------
# CONFIGURACIÓN DE BASE DE DATOS (MySQL - Laragon)
# ---------------------------
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:@localhost/agromarket'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# ---------------------------
# CONFIGURACIÓN DE FLASK-MAIL (Gmail real)
# ---------------------------
# Correo corporativo o de soporte
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False

# ⚠️ Debes generar la clave de aplicación desde soporteagromarkett@gmail.com
#    en Gmail → Seguridad → Contraseñas de aplicaciones → Correo → Otro → AgroMarket
#    Copia los 16 caracteres sin espacios.
app.config['MAIL_USERNAME'] = 'soporteagromarkett@gmail.com'
app.config['MAIL_PASSWORD'] = 'roxeeriekfjsntws'  # 🔹 Clave de aplicación real
app.config['MAIL_DEFAULT_SENDER'] = ('AgroMarket', 'soporteagromarkett@gmail.com')

# Inicializamos Mail y lo vinculamos a la app
mail = Mail(app)
app.mail = mail  # 🔹 Permite acceder a current_app.mail desde los blueprints

# ---------------------------
# IMPORTACIÓN DE BLUEPRINTS
# ---------------------------
from auth.rutas import auth_bp

# Registrar blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(vendedor_bp)
app.register_blueprint(comprador, url_prefix="/comprador")

# ---------------------------
# RUTAS GENERALES
# ---------------------------
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


# ---------------------------
# EJECUTAR LA APP
# ---------------------------
if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)

# Aplicación principal de AgroMarket

from flask import Flask
from flask_bcrypt import Bcrypt
from flask_mail import Mail

# Importar configuraciones
from config.database import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS
from config.mail import MAIL_CONFIG
from config.app import config

# Importar base de datos
from models.database import db

# Importar blueprints de módulos
from modules.auth.routes import auth_bp
from modules.comprador.routes import comprador
from modules.vendedor.routes import vendedor_bp
from modules.general.routes import general_bp

def create_app(config_name='development'):
    """Factory para crear la aplicación Flask"""
    app = Flask(__name__)
    
    # Configuración
    app.config.from_object(config[config_name])
    app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS
    
    # Configuración de correo
    app.config.update(MAIL_CONFIG)
    
    # Inicializar extensiones
    bcrypt = Bcrypt(app)
    mail = Mail(app)
    db.init_app(app)
    
    # Hacer bcrypt y mail disponibles globalmente
    app.bcrypt = bcrypt
    app.mail = mail
    
    # Registrar blueprints
    app.register_blueprint(general_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(vendedor_bp, url_prefix="/vendedor")
    app.register_blueprint(comprador, url_prefix="/comprador")
    
    return app

# Crear la aplicación
app = create_app()

# ---------------------------
# EJECUTAR LA APP
# ---------------------------
if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=3000)
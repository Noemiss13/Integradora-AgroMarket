# Aplicación principal de AgroMarket
# Usa Firebase Firestore como base de datos

import os

# Cargar variables de entorno desde archivo .env (si existe)
# Útil para hostings tradicionales que no tienen panel de variables de entorno
try:
    from dotenv import load_dotenv
    load_dotenv()  # Busca archivo .env en la raíz del proyecto
except ImportError:
    # Si python-dotenv no está instalado, simplemente continuar
    # Las variables de entorno del sistema seguirán funcionando
    pass

from flask import Flask, render_template
from flask_mail import Mail
from config.app import config

# Importar blueprints de módulos
from modules.auth.routes import auth_bp
from modules.comprador.routes import comprador
from modules.vendedor.routes import vendedor_bp
from modules.general.routes import general_bp
from modules.vendors import vendors_bp
from modules.admin.routes import admin_bp

from firebase_config import db, bucket

# Inicializar Flask-Mail
mail = Mail()

def create_app(config_name='development'):
    """Factory para crear la aplicación Flask"""
    app = Flask(__name__)
    
    # Detectar si estamos en producción
    # Prioridad: FLASK_ENV > PRODUCTION > otras variables comunes
    flask_env = os.environ.get('FLASK_ENV', '').lower()
    production_var = os.environ.get('PRODUCTION', '').lower()
    
    # Hostings comunes:
    # - cPanel/VPS tradicionales: usar FLASK_ENV=production
    # - Heroku: usa DYNO automáticamente
    # - Render: usa RENDER automáticamente
    production_indicators = [
        flask_env == 'production',
        production_var == 'true',
        os.environ.get('DYNO'),  # Heroku
        os.environ.get('RENDER'),  # Render
    ]
    
    if any(production_indicators):
        config_name = 'production'
        print("🔧 Modo PRODUCCIÓN detectado")
    
    # Configuración
    app.config.from_object(config[config_name])
    
    # Configurar sesiones permanentes
    @app.before_request
    def make_session_permanent():
        from flask import session
        session.permanent = True
    
    # Inicializar Flask-Mail
    mail.init_app(app)
    
    # Validar configuración de correo en producción
    # NOTA: Los correos se envían con Firebase Functions, no con Flask-Mail directamente
    # Flask-Mail solo se usa como respaldo si Firebase Functions falla
    if config_name == 'production':
        print("📧 Sistema de correos:")
        print("   Principal: Firebase Functions (requiere secrets configurados en Firebase)")
        print("   Respaldo: Flask-Mail (usa variables de entorno)")
        
        # Verificar si Firebase Functions está disponible
        try:
            from utils.firebase_functions import call_firebase_function
            print("   ✅ Firebase Functions disponible")
        except ImportError:
            print("   ⚠️ Firebase Functions no disponible, solo se usará Flask-Mail")
        
        # Verificar configuración de Flask-Mail (respaldo)
        mail_config = {
            'MAIL_SERVER': app.config.get('MAIL_SERVER'),
            'MAIL_USERNAME': app.config.get('MAIL_USERNAME'),
            'MAIL_PASSWORD': 'Configurada' if app.config.get('MAIL_PASSWORD') else 'NO CONFIGURADA'
        }
        print(f"   Flask-Mail (respaldo): Servidor={mail_config['MAIL_SERVER']}, Usuario={mail_config['MAIL_USERNAME']}")
        
        if not mail_config['MAIL_PASSWORD']:
            print("   ⚠️ Flask-Mail no configurado (solo afecta si Firebase Functions falla)")
    
    # Registrar blueprints
    app.register_blueprint(general_bp)
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(vendedor_bp, url_prefix="/vendedor")
    app.register_blueprint(comprador, url_prefix="/comprador")
    app.register_blueprint(vendors_bp, url_prefix="/vendors")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    
    # Ruta adicional para registro sin prefijo
    @app.route("/register", methods=["GET", "POST"])
    def register():
        """Página de registro - Firebase maneja el registro en el frontend"""
        return render_template("auth/register.html")
    
    # Ruta para manejar errores 404
    @app.errorhandler(404)
    def not_found(error):
        return render_template("general/informacion.html"), 404
    
    return app

# Crear la aplicación
app = create_app()

# ---------------------------
# EJECUTAR LA APP
# ---------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(debug=debug, host="0.0.0.0", port=port)
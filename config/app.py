# Configuración general de la aplicación

import os

class Config:
    """Configuración base de la aplicación"""
    SECRET_KEY = "clave_secreta_agromarket"
    
    # Configuración de desarrollo
    DEBUG = True
    TESTING = False
    
    # Configuración del servidor
    HOST = "127.0.0.1"
    PORT = 3000
    

class DevelopmentConfig(Config):
    """Configuración para desarrollo"""
    DEBUG = True

class ProductionConfig(Config):
    """Configuración para producción"""
    DEBUG = False
    
    # En producción, usar variables de entorno
    SECRET_KEY = os.environ.get('SECRET_KEY') or "clave_super_secreta_produccion"
    HOST = os.environ.get('HOST') or '0.0.0.0'
    PORT = int(os.environ.get('PORT') or 5000)

# Configuración por defecto
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

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
    PORT = 8000
    
    # Configuración de Stripe
    STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY') or 'pk_test_51S4nWTKFtQrWkPCD3FRrULpKifZ43LK9m3RcNn9TFpbzYqNU36uInxGyKRuuV78HtuC5drNe0qeZWei34yKGiYeF00M9L6swJq'
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY') or 'sk_test_51S4nWTKFtQrWkPCDrCpPfYlsfL8ypkkhPfUlhMucmh1tS1afbn5QBZG4kNPI3bAyZpp8hKMS9rzRPkWGN06i0uwB00FEGEsbBX'
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET') or 'whsec_your_webhook_secret_here'
    

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

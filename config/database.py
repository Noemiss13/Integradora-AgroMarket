# Configuración de base de datos para AgroMarket

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",         # Laragon por defecto no pide contraseña
    "database": "agromarket",
    "unix_socket": "/tmp/mysql.sock"  # Socket para Mac con Homebrew
}

# Configuración de SQLAlchemy
SQLALCHEMY_DATABASE_URI = 'mysql+mysqlconnector://root:@localhost/agromarket?unix_socket=/tmp/mysql.sock'
SQLALCHEMY_TRACK_MODIFICATIONS = False

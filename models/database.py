# Conexión a base de datos para AgroMarket

import mysql.connector
from flask_sqlalchemy import SQLAlchemy
from config.database import DB_CONFIG

def get_db_connection():
    """Obtiene una conexión directa a MySQL"""
    conn = mysql.connector.connect(**DB_CONFIG)
    return conn

# Instancia de SQLAlchemy para ORM
db = SQLAlchemy()

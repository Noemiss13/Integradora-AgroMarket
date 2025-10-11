# Rutas generales de AgroMarket

from flask import Blueprint, render_template, jsonify
from models.database import get_db_connection

# Blueprint para rutas generales
general_bp = Blueprint("general", __name__)

@general_bp.route("/")
def home():
    """Página principal"""
    return render_template("general/informacion.html")

@general_bp.route("/catalogo_offline")
def catalogo_offline():
    """Catálogo offline de productos"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nombre, descripcion, precio, imagen, stock FROM productos")
    productos = cursor.fetchall()
    conn.close()
    return render_template("general/catalogo_offline.html", productos=productos)

@general_bp.route("/catalogo.json")
def catalogo_json():
    """API JSON del catálogo"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nombre, descripcion, precio, imagen FROM productos")
    productos = cursor.fetchall()
    conn.close()
    return jsonify(productos)

@general_bp.route("/sobre_nosotros")
def sobre_nosotros():
    """Página sobre nosotros"""
    return render_template("general/sobre_nosotros.html")

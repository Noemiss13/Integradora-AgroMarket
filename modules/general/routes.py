# Rutas generales de AgroMarket

from flask import Blueprint, render_template, jsonify

# Blueprint para rutas generales
general_bp = Blueprint("general", __name__)

@general_bp.route("/")
def home():
    """Página principal"""
    return render_template("general/informacion.html")

@general_bp.route("/informacion")
def informacion():
    """Página de información"""
    return render_template("general/informacion.html")

@general_bp.route("/catalogo_offline")
def catalogo_offline():
    """Catálogo offline"""
    return render_template("general/catalogo_offline.html")

@general_bp.route("/sobre_nosotros")
def sobre_nosotros():
    """Página sobre nosotros"""
    return render_template("general/sobre_nosotros.html")

@general_bp.route("/api/noticias")
def api_noticias():
    """API para obtener noticias"""
    # Nota: Las noticias ahora se obtienen de Firebase en el frontend
    return jsonify({"noticias": []})
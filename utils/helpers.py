# Funciones de ayuda comunes para AgroMarket

import os
import hashlib
from werkzeug.utils import secure_filename

def allowed_file(filename, allowed_extensions=None):
    """Verifica si el archivo tiene una extensión permitida"""
    if allowed_extensions is None:
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def generate_filename(original_filename):
    """Genera un nombre de archivo único"""
    # Obtener extensión
    ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
    
    # Generar hash único
    hash_name = hashlib.md5(original_filename.encode()).hexdigest()
    
    return f"{hash_name}.{ext}" if ext else hash_name

def save_uploaded_file(file, upload_folder):
    """Guarda un archivo subido de forma segura"""
    if file and allowed_file(file.filename):
        filename = generate_filename(file.filename)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        return filename
    return None

def format_price(price):
    """Formatea un precio para mostrar"""
    return f"${price:,.2f}"

def format_date(date):
    """Formatea una fecha para mostrar"""
    if date:
        return date.strftime("%d/%m/%Y %H:%M")
    return "N/A"

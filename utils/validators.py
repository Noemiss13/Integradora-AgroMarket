# Validadores para AgroMarket

import re
from email_validator import validate_email, EmailNotValidError

def validate_email_format(email):
    """Valida el formato de un email"""
    try:
        validate_email(email)
        return True, None
    except EmailNotValidError as e:
        return False, str(e)

def validate_password_strength(password):
    """Valida la fortaleza de una contraseña"""
    if len(password) < 8:
        return False, "La contraseña debe tener al menos 8 caracteres"
    
    if not re.search(r"[A-Z]", password):
        return False, "La contraseña debe contener al menos una letra mayúscula"
    
    if not re.search(r"[a-z]", password):
        return False, "La contraseña debe contener al menos una letra minúscula"
    
    if not re.search(r"\d", password):
        return False, "La contraseña debe contener al menos un número"
    
    return True, None

def validate_phone_number(phone):
    """Valida un número de teléfono"""
    # Patrón para números mexicanos
    pattern = r'^(\+52|52)?[0-9]{10}$'
    if re.match(pattern, phone.replace(' ', '').replace('-', '')):
        return True, None
    return False, "Formato de teléfono inválido"

def validate_price(price):
    """Valida un precio"""
    try:
        price_float = float(price)
        if price_float <= 0:
            return False, "El precio debe ser mayor a 0"
        return True, None
    except (ValueError, TypeError):
        return False, "Formato de precio inválido"

def validate_stock(stock):
    """Valida el stock"""
    try:
        stock_int = int(stock)
        if stock_int < 0:
            return False, "El stock no puede ser negativo"
        return True, None
    except (ValueError, TypeError):
        return False, "Formato de stock inválido"

def sanitize_input(text):
    """Limpia texto de entrada"""
    if not text:
        return ""
    
    # Remover caracteres peligrosos
    text = re.sub(r'[<>"\']', '', str(text))
    
    # Limitar longitud
    return text[:255] if len(text) > 255 else text

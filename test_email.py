#!/usr/bin/env python3
"""
Script para probar la configuración de correo electrónico
Ejecutar: python test_email.py
"""

import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_mail import Mail, Message
from config.app import config

def test_email_config():
    """Prueba la configuración de correo"""
    print("=" * 60)
    print("🧪 PRUEBA DE CONFIGURACIÓN DE CORREO")
    print("=" * 60)
    
    # Crear aplicación Flask
    app = Flask(__name__)
    app.config.from_object(config['development'])
    
    # Inicializar Mail
    mail = Mail()
    mail.init_app(app)
    
    # Mostrar configuración
    print("\n📧 CONFIGURACIÓN DE CORREO:")
    print(f"   Servidor: {app.config.get('MAIL_SERVER')}")
    print(f"   Puerto: {app.config.get('MAIL_PORT')}")
    print(f"   TLS: {app.config.get('MAIL_USE_TLS')}")
    print(f"   Usuario: {app.config.get('MAIL_USERNAME')}")
    print(f"   Contraseña: {'*' * len(app.config.get('MAIL_PASSWORD', ''))}")
    print(f"   Remitente: {app.config.get('MAIL_DEFAULT_SENDER')}")
    
    # Verificar extensión
    mail_instance = app.extensions.get('mail')
    if mail_instance:
        print("\n✅ Flask-Mail está configurado correctamente")
    else:
        print("\n❌ Flask-Mail NO está configurado")
        return False
    
    # Solicitar email de prueba
    print("\n" + "=" * 60)
    test_email = input("📨 Ingresa un email para enviar una prueba (o presiona Enter para cancelar): ").strip()
    
    if not test_email:
        print("❌ Prueba cancelada")
        return False
    
    # Crear mensaje de prueba
    try:
        msg = Message(
            subject='🧪 Prueba de Correo - AgroMarket',
            recipients=[test_email],
            html='''
            <html>
            <body>
                <h2>✅ Prueba de Correo Exitosa</h2>
                <p>Si recibes este correo, la configuración de SMTP está funcionando correctamente.</p>
                <p><strong>Servidor:</strong> Gmail SMTP</p>
                <p><strong>Puerto:</strong> 587 (TLS)</p>
            </body>
            </html>
            '''
        )
        
        print(f"\n📤 Enviando correo de prueba a {test_email}...")
        mail.send(msg)
        print("✅ ¡Correo enviado exitosamente!")
        print(f"   Revisa la bandeja de entrada de {test_email}")
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR al enviar correo:")
        print(f"   Tipo: {type(e).__name__}")
        print(f"   Mensaje: {str(e)}")
        
        # Errores comunes
        error_str = str(e).lower()
        if "authentication failed" in error_str or "535" in error_str:
            print("\n💡 SOLUCIÓN:")
            print("   1. Verifica que la contraseña de aplicación sea correcta")
            print("   2. Asegúrate de usar una 'Contraseña de aplicación' de Gmail")
            print("   3. No uses tu contraseña normal de Gmail")
            print("   4. Genera una nueva contraseña de aplicación en:")
            print("      https://myaccount.google.com/apppasswords")
        elif "connection" in error_str or "timeout" in error_str:
            print("\n💡 SOLUCIÓN:")
            print("   1. Verifica tu conexión a internet")
            print("   2. Verifica que el puerto 587 no esté bloqueado")
            print("   3. Intenta con un firewall desactivado temporalmente")
        elif "smtplib" in str(type(e)).lower():
            print("\n💡 SOLUCIÓN:")
            print("   1. Verifica las credenciales en config/app.py")
            print("   2. Asegúrate de que el servidor SMTP sea correcto")
            print("   3. Verifica que el puerto sea 587 para TLS")
        
        return False

if __name__ == "__main__":
    try:
        test_email_config()
    except KeyboardInterrupt:
        print("\n\n❌ Prueba cancelada por el usuario")
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()


#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
AgroMarket - Versión Funcional
Solo login y registro que funcionan con Firebase
"""

from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return '''
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AgroMarket - Inicio</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f0f8ff; }
            .container { max-width: 600px; margin: 0 auto; text-align: center; }
            h1 { color: #2e8b57; }
            .btn { display: inline-block; padding: 15px 30px; margin: 10px; 
                   background: #2e8b57; color: white; text-decoration: none; 
                   border-radius: 5px; font-weight: bold; }
            .btn:hover { background: #228b22; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🌱 AgroMarket</h1>
            <p>Tu plataforma para conectar con productores locales</p>
            <a href="/registro" class="btn">Registrarse</a>
            <a href="/login" class="btn">Iniciar Sesión</a>
        </div>
    </body>
    </html>
    '''

@app.route('/registro')
def registro():
    return render_template('auth/registro_funcional.html')

@app.route('/login')
def login():
    return render_template('auth/login_funcional.html')

@app.route('/comprador/panel')
def panel_comprador():
    # Datos de ejemplo para que el template funcione
    datos = {
        'nombre': 'Usuario',
        'total_productos': 0,
        'productos_populares': [],
        'categorias': []
    }
    return render_template('comprador/panel_comprador.html', **datos)

@app.route('/vendedor/panel')
def panel_vendedor():
    # Datos de ejemplo para que el template funcione
    datos = {
        'nombre': 'Usuario',
        'total_productos': 0,
        'productos': [],
        'ventas': []
    }
    return render_template('vendedor/panel_vendedor.html', **datos)

@app.route('/vendedor/agregar_producto')
def agregar_producto():
    # Datos de ejemplo para que el template funcione
    datos = {
        'nombre': 'Usuario'
    }
    return render_template('vendedor/agregar_producto.html', **datos)

@app.route('/vendedor/mis_productos')
def mis_productos():
    # Datos de ejemplo para que el template funcione
    datos = {
        'nombre': 'Usuario'
    }
    return render_template('vendedor/mis_productos.html', **datos)

if __name__ == '__main__':
    print("🚀 Iniciando AgroMarket FUNCIONAL...")
    print("🌐 Abre tu navegador en: http://127.0.0.1:3002")
    print("📱 Para detener, presiona Ctrl+C")
    app.run(debug=False, host='127.0.0.1', port=3002, threaded=True)

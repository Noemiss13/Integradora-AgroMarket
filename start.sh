#!/bin/bash

# Script para iniciar AgroMarket en Mac
echo "🚀 Iniciando AgroMarket..."

# Activar entorno virtual
echo "🐍 Activando entorno virtual..."
source venv/bin/activate

# Verificar dependencias
echo "📦 Verificando dependencias..."
if ! python3 -c "import flask" > /dev/null 2>&1; then
    echo "⚠️  Instalando dependencias..."
    pip install -r requirements.txt
fi

# Iniciar aplicación
echo "🌟 Iniciando aplicación Flask..."
echo "🌐 La aplicación estará disponible en: http://127.0.0.1:5001"
echo "📱 Para detener la aplicación, presiona Ctrl+C"
echo ""

python3 app.py

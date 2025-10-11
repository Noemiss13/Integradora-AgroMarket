#!/bin/bash

# Script para iniciar AgroMarket en Mac
echo "🚀 Iniciando AgroMarket..."

# Verificar si MySQL está corriendo
if ! pgrep -x "mysqld" > /dev/null; then
    echo "⚠️  MySQL no está corriendo. Iniciando..."
    brew services start mysql
    sleep 3
fi

# Verificar conexión a MySQL
echo "🔍 Verificando conexión a MySQL..."
if mysql -u root -e "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ MySQL está funcionando correctamente"
else
    echo "❌ Error: No se puede conectar a MySQL"
    echo "💡 Asegúrate de que MySQL esté instalado y corriendo:"
    echo "   brew install mysql"
    echo "   brew services start mysql"
    exit 1
fi

# Activar entorno virtual
echo "🐍 Activando entorno virtual..."
source venv/bin/activate

# Verificar dependencias
echo "📦 Verificando dependencias..."
if ! python3 -c "import flask, mysql.connector" > /dev/null 2>&1; then
    echo "⚠️  Instalando dependencias..."
    pip install -r requirements.txt
fi

# Iniciar aplicación
echo "🌟 Iniciando aplicación Flask..."
echo "🌐 La aplicación estará disponible en: http://127.0.0.1:3000"
echo "📱 Para detener la aplicación, presiona Ctrl+C"
echo ""

python3 app.py

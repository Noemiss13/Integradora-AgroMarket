#!/bin/bash
echo "Ejecutando pruebas de entorno de liberación..."
pytest tests/ --disable-warnings -v
if [ $? -eq 0 ]; then
  echo "✅ Todas las pruebas pasaron correctamente."
else
  echo "❌ Error en pruebas. Deteniendo la liberación."
  exit 1
fi

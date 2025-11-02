# Modelos de datos para AgroMarket
# Nota: Esta aplicación ahora usa Firebase como base de datos
# Los modelos se manejan directamente con Firebase en el frontend

# Estructura de datos de referencia para Firebase:
# 
# Colección 'usuarios':
# - uid (documento ID)
# - nombre: string
# - email: string
# - roles: array ['vendedor', 'comprador']
# - fecha_registro: timestamp
#
# Colección 'productos':
# - id (documento ID)
# - nombre: string
# - descripcion: string
# - categoria: string
# - precio: number
# - unidad: string
# - imagen: string
# - vendedor_id: string (uid del usuario)
# - fecha_publicacion: timestamp
# - stock: number
# - temporada: boolean
#
# Colección 'carritos':
# - id (documento ID)
# - usuario_id: string (uid del usuario)
# - productos: array de objetos {producto_id, cantidad}
# - fecha_creacion: timestamp
#
# Colección 'ventas':
# - id (documento ID)
# - producto_id: string
# - cantidad: number
# - total: number
# - fecha_venta: timestamp
# - comprador_id: string (uid del usuario)
#
# Colección 'mensajes':
# - id (documento ID)
# - emisor_id: string (uid del usuario)
# - receptor_id: string (uid del usuario)
# - contenido: string
# - fecha: timestamp
#
# Colección 'membresias':
# - id (documento ID)
# - usuario_id: string (uid del usuario)
# - tipo_membresia: string
# - fecha_inicio: timestamp
# - fecha_fin: timestamp
# - estatus: string
#
# Colección 'noticias':
# - id (documento ID)
# - titulo: string
# - descripcion: string
# - url: string
# - imagen: string
# - fecha: timestamp

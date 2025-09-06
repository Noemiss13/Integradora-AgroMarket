from flask_bcrypt import Bcrypt
import mysql.connector

# Inicializar Bcrypt
bcrypt = Bcrypt()

# Conectar a la base de datos
conn = mysql.connector.connect(
    host='localhost',
    user='root',         # tu usuario de MySQL
    password='',         # tu contraseña de MySQL
    database='agromarket'
)
cursor = conn.cursor()

# Obtener todas las contraseñas existentes
cursor.execute("SELECT id, password FROM usuarios")
usuarios = cursor.fetchall()

for id, password in usuarios:
    if password:  # Solo si hay contraseña
        # Verificar si ya es bcrypt
        if not password.startswith("$2b$"):  
            # Generar hash bcrypt
            hash_pw = bcrypt.generate_password_hash(password).decode('utf-8')
            cursor.execute("UPDATE usuarios SET password=%s WHERE id=%s", (hash_pw, id))
            print(f"Contraseña del usuario {id} actualizada ✅")
        else:
            print(f"Usuario {id} ya tiene bcrypt, se salta 🔹")

conn.commit()
conn.close()
print("✅ Todas las contraseñas están ahora en bcrypt")

from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify, current_app
from functools import wraps

auth_bp = Blueprint("auth", __name__, template_folder="templates")

# 🔹 Configuración para Firebase Auth
# Ya no necesitamos serializer para tokens, Firebase maneja la autenticación

# ---------------------
# Decoradores
# ---------------------
def login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if "usuario_id" not in session:
            flash("Debes iniciar sesión para acceder a esta página.", "danger")
            return redirect(url_for("auth.login"))
        return f(*args, **kwargs)
    return wrapped

def role_required(rol):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if "usuario_id" not in session:
                flash("Debes iniciar sesión para acceder a esta página.", "danger")
                return redirect(url_for("auth.login"))

            roles_usuario = session.get("roles", [])
            if isinstance(roles_usuario, str):
                roles_usuario = [roles_usuario]

            if rol.lower() not in [r.lower() for r in roles_usuario]:
                flash("No tienes permisos para acceder a esta página.", "danger")
                return redirect(url_for("auth.login"))

            return f(*args, **kwargs)
        return wrapped
    return decorator

# ---------------------
# Registro
# ---------------------
# Esta función ya no es necesaria, se movió arriba

# ---------------------
# Login
# ---------------------
@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    """Página de login - Firebase maneja la autenticación en el frontend"""
    return render_template("auth/login.html")

@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    """Página de registro - Firebase maneja el registro en el frontend"""
    return render_template("auth/register.html")

# Ruta adicional para /register (sin prefijo) - se agregará en app.py

# ---------------------
# Seleccionar rol - ELIMINADO (ya no se usa)
# ---------------------

# ---------------------
# Sincronizar rol con sesión Flask
# ---------------------
@auth_bp.route("/sincronizar-rol", methods=["POST"])
def sincronizar_rol():
    """
    Endpoint para sincronizar el rol seleccionado con la sesión de Flask.
    Recibe el token de Firebase y actualiza la sesión Flask con los roles del usuario.
    """
    try:
        data = request.get_json()
        
        # Por ahora, aceptamos la petición sin validar el token (en producción deberías validar el token de Firebase)
        user_id = data.get('user_id')
        roles = data.get('roles', [])
        rol_activo = data.get('rol_activo', 'comprador')
        nombre = data.get('nombre', 'Usuario')
        email = data.get('email', '')
        
        if not user_id:
            return jsonify({'error': 'user_id es requerido'}), 400
        
        # Establecer datos en la sesión de Flask
        session['user_id'] = user_id
        session['usuario_id'] = user_id  # Compatibilidad
        session['roles'] = roles if isinstance(roles, list) else [roles]
        session['rol_activo'] = rol_activo
        session['nombre'] = nombre
        session['email'] = email
        
        return jsonify({
            'success': True,
            'message': 'Rol sincronizado correctamente',
            'rol_activo': rol_activo,
            'roles': session['roles']
        })
        
    except Exception as e:
        current_app.logger.error(f'Error sincronizando rol: {str(e)}')
        return jsonify({'error': 'Error al sincronizar rol: ' + str(e)}), 500

# ---------------------
# Logout
# ---------------------
@auth_bp.route("/logout")
def logout():
    """Logout - Firebase maneja la autenticación en el frontend"""
    session.clear()
    flash("Sesión cerrada correctamente", "success")
    return redirect(url_for("auth.login"))

# ---------------------
# Perfil
# ---------------------
@auth_bp.route("/perfil", methods=["GET", "POST"])
def perfil():
    # Datos por defecto para cuando no hay sesión
    usuario = type('Usuario', (), {
        'id': 'guest',
        'nombre': 'Usuario',
        'email': 'usuario@ejemplo.com',
        'roles': []
    })()
    roles = []
    rol_activo = None
    estadisticas = {}
    
    return render_template("auth/perfil.html", usuario=usuario, roles=roles, rol_activo=rol_activo, estadisticas=estadisticas)

# Tests eliminados

# ---------------------
# Activar rol de vendedor
# ---------------------
@auth_bp.route("/activar_rol_vendedor", methods=["GET", "POST"])
@login_required
def activar_rol_vendedor():
    roles = session.get("roles", [])
    
    if "vendedor" in [r.lower() for r in roles]:
        flash("Ya tienes el rol de vendedor activo.", "info")
        return redirect(url_for("auth.perfil"))

    if request.method == "POST":
        # Agregar rol de vendedor a la sesión
        if "vendedor" not in roles:
            roles.append("vendedor")
            session["roles"] = roles
        session["rol_activo"] = "vendedor"
        flash("Rol de vendedor activado con éxito.", "success")
        return redirect(url_for("vendedor.panel_vendedor"))

    return render_template("auth/activar_rol.html")

# =========================
# Olvidé contraseña
# =========================

@auth_bp.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form['email']
        
        # Nota: Con Firebase, el reset de contraseña se maneja directamente en el frontend
        # Esta función ahora solo muestra un mensaje informativo
        flash("Para restablecer tu contraseña, usa la opción '¿Olvidaste tu contraseña?' en la página de login con Firebase.", "info")
        return redirect(url_for('auth.login'))

    return render_template('auth/forgot_password.html')


# =========================
# Restablecer contraseña
# =========================
@auth_bp.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    # Nota: Con Firebase, el reset de contraseña se maneja directamente en el frontend
    flash("Para restablecer tu contraseña, usa la opción '¿Olvidaste tu contraseña?' en la página de login con Firebase.", "info")
    return redirect(url_for('auth.login'))

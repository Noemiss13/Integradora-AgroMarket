from functools import wraps
from flask import session, redirect, url_for, flash

def login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if "usuario_id" not in session:
            flash("Debes iniciar sesión para acceder a esta página.", "danger")
            return redirect(url_for("auth.login"))
        return f(*args, **kwargs)
    return wrapped

def role_required(rol):
    """
    Decorator que protege la ruta según el rol.
    Ej: @role_required("vendedor")
    Funciona con múltiples roles por usuario (lista en session['roles']).
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if "usuario_id" not in session:
                flash("Debes iniciar sesión para acceder a esta página.", "danger")
                return redirect(url_for("auth.login"))

            # roles del usuario: puede ser string o lista
            roles_usuario = session.get("roles")
            if isinstance(roles_usuario, str):
                roles_usuario = [roles_usuario]

            # Verifica si el rol requerido está en la lista
            if rol.lower() not in [r.lower() for r in roles_usuario]:
                flash("No tienes permisos para acceder a esta página.", "danger")
                return redirect(url_for("auth.login"))

            return f(*args, **kwargs)
        return wrapped
    return decorator

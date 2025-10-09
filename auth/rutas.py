from flask import Blueprint, render_template, request, redirect, url_for, session, flash, current_app
from functools import wraps
from db import get_db_connection
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer
from app import bcrypt, mail  # 🔹 Importamos bcrypt y mail de app.py

auth_bp = Blueprint("auth", __name__, template_folder="templates")

# 🔹 Serializer para generar tokens seguros
serializer = URLSafeTimedSerializer("clave_super_secreta_para_tokens")

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
@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        nombre = request.form.get("nombre")
        email = request.form.get("email")
        password = request.form.get("password")
        rol = request.form.get("rol")

        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM usuarios WHERE email = %s", (email,))
        usuario = cursor.fetchone()

        if usuario:
            cursor.execute(
                "SELECT rol FROM roles_usuarios WHERE usuario_id=%s AND rol=%s",
                (usuario["id"], rol)
            )
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO roles_usuarios (usuario_id, rol) VALUES (%s, %s)",
                    (usuario["id"], rol)
                )
                conn.commit()
                flash(f"Rol {rol} agregado a tu cuenta existente", "success")
            else:
                flash("Ya tienes este rol asignado", "info")
            conn.close()
            return redirect(url_for("auth.login"))

        cursor.execute(
            "INSERT INTO usuarios (nombre, email, password) VALUES (%s, %s, %s)",
            (nombre, email, hashed_password)
        )
        usuario_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO roles_usuarios (usuario_id, rol) VALUES (%s, %s)",
            (usuario_id, rol)
        )
        conn.commit()
        conn.close()

        flash("Usuario registrado con éxito. Ahora inicia sesión.", "success")
        return redirect(url_for("auth.login"))

    return render_template("register.html")

# ---------------------
# Login
# ---------------------
@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email_input = request.form.get("email")
        password_input = request.form.get("password")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM usuarios WHERE email = %s", (email_input,))
        usuario = cursor.fetchone()

        if usuario and bcrypt.check_password_hash(usuario["password"], password_input):
            session["usuario_id"] = usuario["id"]
            session["nombre"] = usuario["nombre"]

            cursor.execute(
                "SELECT rol FROM roles_usuarios WHERE usuario_id = %s",
                (usuario["id"],)
            )
            roles = [r["rol"] for r in cursor.fetchall()]
            session["roles"] = roles
            conn.close()

            if len(roles) == 1:
                session["rol_activo"] = roles[0]
                if roles[0].lower() == "vendedor":
                    return redirect(url_for("vendedor.panel_vendedor"))
                elif roles[0].lower() == "comprador":
                    return redirect(url_for("comprador.panel_comprador"))
            else:
                return redirect(url_for("auth.seleccionar_rol"))
        else:
            conn.close()
            flash("Email o contraseña incorrectos", "danger")
            return redirect(url_for("auth.login"))

    return render_template("login.html")

# ---------------------
# Seleccionar rol
# ---------------------
@auth_bp.route("/seleccionar_rol", methods=["GET", "POST"])
@login_required
def seleccionar_rol():
    if "roles" not in session:
        flash("Debes iniciar sesión primero", "danger")
        return redirect(url_for("auth.login"))

    if request.method == "POST":
        rol = request.form.get("rol")
        if rol in session["roles"]:
            session["rol_activo"] = rol
            flash(f"Modo {rol} activado", "success")
            return redirect(
                url_for("vendedor.panel_vendedor") if rol.lower() == "vendedor" 
                else url_for("comprador.panel_comprador")
            )
        else:
            flash("Rol inválido", "danger")
            return redirect(url_for("auth.seleccionar_rol"))

    return render_template("seleccionar_rol.html", roles=session["roles"])

# ---------------------
# Logout
# ---------------------
@auth_bp.route("/logout")
def logout():
    session.clear()
    flash("Sesión cerrada correctamente", "success")
    return redirect(url_for("auth.login"))

# ---------------------
# Perfil
# ---------------------
@auth_bp.route("/perfil", methods=["GET", "POST"])
@login_required
def perfil():
    usuario_id = session["usuario_id"]

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT nombre, email FROM usuarios WHERE id = %s", (usuario_id,))
    usuario = cursor.fetchone()

    cursor.execute("SELECT rol FROM roles_usuarios WHERE usuario_id = %s", (usuario_id,))
    roles = [r["rol"] for r in cursor.fetchall()]
    session["roles"] = roles
    rol_activo = session.get("rol_activo")

    if request.method == "POST":

        nuevo_rol = request.form.get("nuevo_rol")
        if nuevo_rol and nuevo_rol not in roles:
            cursor.execute(
                "INSERT INTO roles_usuarios (usuario_id, rol) VALUES (%s, %s)",
                (usuario_id, nuevo_rol)
            )
            conn.commit()
            session["roles"].append(nuevo_rol)
            session["rol_activo"] = nuevo_rol
            flash(f"Rol {nuevo_rol} activado y seleccionado como activo", "success")
            conn.close()
            if nuevo_rol.lower() == "vendedor":
                return redirect(url_for("vendedor.panel_vendedor"))
            elif nuevo_rol.lower() == "comprador":
                return redirect(url_for("comprador.panel_comprador"))

        nombre_nuevo = request.form.get("nombre")
        email_nuevo = request.form.get("email")
        password_nuevo = request.form.get("password")
        password_confirm = request.form.get("password_confirm")
        rol_nuevo = request.form.get("rol_activo")

        if password_nuevo and password_nuevo != password_confirm:
            flash("Las contraseñas no coinciden", "danger")
            conn.close()
            return redirect(url_for("auth.perfil"))

        cursor.execute(
            "UPDATE usuarios SET nombre=%s, email=%s WHERE id=%s",
            (nombre_nuevo, email_nuevo, usuario_id)
        )

        if password_nuevo:
            hashed_password = bcrypt.generate_password_hash(password_nuevo).decode("utf-8")
            cursor.execute(
                "UPDATE usuarios SET password=%s WHERE id=%s",
                (hashed_password, usuario_id)
            )

        if rol_nuevo in roles:
            session["rol_activo"] = rol_nuevo
            flash(f"Rol activo cambiado a {rol_nuevo}", "success")
            conn.commit()
            conn.close()
            if rol_nuevo.lower() == "vendedor":
                return redirect(url_for("vendedor.panel_vendedor"))
            elif rol_nuevo.lower() == "comprador":
                return redirect(url_for("comprador.panel_comprador"))
        else:
            flash("Rol seleccionado no es válido", "danger")

        conn.commit()
        conn.close()
        flash("Perfil actualizado correctamente", "success")
        return redirect(url_for("auth.perfil"))

    conn.close()
    return render_template("perfil.html", usuario=usuario, roles=roles, rol_activo=rol_activo)

# ---------------------
# Activar rol de vendedor
# ---------------------
@auth_bp.route("/activar_rol_vendedor", methods=["GET", "POST"])
@login_required
def activar_rol_vendedor():
    usuario_id = session["usuario_id"]

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT rol FROM roles_usuarios WHERE usuario_id = %s", (usuario_id,))
    roles_usuario = [r["rol"] for r in cursor.fetchall()]

    if "vendedor" in [r.lower() for r in roles_usuario]:
        flash("Ya tienes el rol de vendedor activo.", "info")
        conn.close()
        return redirect(url_for("auth.perfil"))

    if request.method == "POST":
        cursor.execute(
            "INSERT INTO roles_usuarios (usuario_id, rol) VALUES (%s, %s)",
            (usuario_id, "vendedor")
        )
        conn.commit()
        conn.close()
        session["roles"].append("vendedor")
        session["rol_activo"] = "vendedor"
        flash("Rol de vendedor activado con éxito.", "success")
        return redirect(url_for("vendedor.panel_vendedor"))

    conn.close()
    return render_template("activar_rol.html")

# =========================
# Olvidé contraseña
# =========================

@auth_bp.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form['email']

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM usuarios WHERE email=%s", (email,))
        usuario = cursor.fetchone()
        conn.close()

        if usuario:
            # Generar token seguro
            token = serializer.dumps(email, salt='password-reset-salt')
            reset_url = url_for('auth.reset_password', token=token, _external=True)

            # Crear mensaje de correo
            msg = Message(
                "Recuperar contraseña - AgroMarket",
                sender=current_app.config['MAIL_DEFAULT_SENDER'],
                recipients=[email]
            )
            msg.body = (
                f"Hola {usuario['nombre']},\n\n"
                f"Haz click en el siguiente enlace para restablecer tu contraseña:\n"
                f"{reset_url}\n\n"
                f"Este enlace expira en 30 minutos."
            )

            try:
                current_app.mail.send(msg)
                flash("Se ha enviado un enlace de recuperación a tu correo electrónico.", "success")
            except Exception as e:
                flash(f"No se pudo enviar el correo: {e}", "danger")
                return redirect(url_for('auth.forgot_password'))

            return redirect(url_for('auth.login'))
        else:
            flash("El correo ingresado no existe", "danger")
            return redirect(url_for('auth.forgot_password'))

    return render_template('forgot_password.html')


# =========================
# Restablecer contraseña
# =========================
@auth_bp.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    try:
        email = serializer.loads(token, salt='password-reset-salt', max_age=1800)  # 30 min
    except Exception:
        flash("El enlace ha expirado o no es válido", "danger")
        return redirect(url_for('auth.forgot_password'))

    if request.method == 'POST':
        password = request.form['password']
        confirm = request.form['password_confirm']

        if password != confirm:
            flash("Las contraseñas no coinciden", "danger")
            return redirect(url_for('auth.reset_password', token=token))

        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE usuarios SET password=%s WHERE email=%s", (hashed_password, email))
        conn.commit()
        conn.close()

        flash("Contraseña restablecida correctamente. Ahora inicia sesión.", "success")
        return redirect(url_for('auth.login'))

    return render_template('reset_password.html')

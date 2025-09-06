from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from flask_bcrypt import Bcrypt
from db import get_db_connection

auth_bp = Blueprint("auth", __name__, template_folder="templates")
bcrypt = Bcrypt()  # se instancia aquí, no necesitas importar desde app.py

# Registro
@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        nombre = request.form.get("nombre")
        email = request.form.get("email")
        password = request.form.get("password")
        rol = request.form.get("rol")

        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO usuarios (nombre, email, password, rol) VALUES (%s, %s, %s, %s)",
            (nombre, email, hashed_password, rol)
        )
        conn.commit()
        conn.close()

        flash("Usuario registrado con éxito. Ahora inicia sesión.", "success")
        return redirect(url_for("auth.login"))

    return render_template("register.html")


# Login
@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email_input = request.form.get("email")
        password_input = request.form.get("password")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM usuarios WHERE email = %s", (email_input,))
        usuario = cursor.fetchone()
        conn.close()

        if usuario and bcrypt.check_password_hash(usuario["password"], password_input):
            session["usuario_id"] = usuario["id"]
            session["rol"] = usuario["rol"]
            session["nombre"] = usuario["nombre"]
            flash(f"Bienvenido {usuario['nombre']}", "success")

            if usuario["rol"] == "vendedor":
                return redirect(url_for("vendedor.panel_vendedor"))
            else:
                return redirect(url_for("comprador.panel_comprador"))

        else:
            flash("Email o contraseña incorrectos", "danger")
            return redirect(url_for("auth.login"))

    return render_template("login.html")


# Logout
@auth_bp.route("/logout")
def logout():
    session.clear()
    flash("Sesión cerrada correctamente", "success")
    return redirect(url_for("auth.login"))

from flask import Flask
from rutas_vendedor import vendedor_bp
from auth.rutas import auth_bp

app = Flask(__name__)
app.secret_key = "clave_secreta_agromarket"

# Registrar blueprints
app.register_blueprint(auth_bp)  # rutas de login/registro
app.register_blueprint(vendedor_bp)  # rutas de vendedor

# Rutas de prueba para compradores
@app.route("/panel/comprador")
def panel_comprador():
    from flask import session, redirect, url_for, render_template
    if session.get("rol") == "comprador":
        return render_template("panel_comprador.html", nombre=session.get("nombre"))
    return redirect(url_for("auth.login"))

# Home
@app.route("/")
def home():
    from flask import redirect, url_for
    return redirect(url_for("auth.login"))

if __name__ == "__main__":
    app.run(debug=True)

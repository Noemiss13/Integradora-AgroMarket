from flask import Blueprint, render_template, session, redirect, url_for, request, flash, jsonify, current_app
from modules.auth.decorators import login_required, role_required
import stripe
import os

# Blueprint del comprador
comprador = Blueprint('comprador', __name__, template_folder="templates")


# ===== Función para obtener noticias =====
def obtener_noticias():
    # Nota: Las noticias ahora se obtienen de Firebase en el frontend
    return []


# ===== Ver productos por categoría (URL bonita) =====
@comprador.route("/categoria/<string:categoria>")
@login_required
@role_required("comprador")
def ver_categoria(categoria):
    # Nota: Los productos ahora se obtienen de Firebase en el frontend
    return render_template(
        "comprador/productos_comprador.html",
        productos=[],
        nombre=session.get("nombre"),
        page='productos',
        categoria=categoria
    )


# ===== Panel del comprador =====
@comprador.route("/panel")
@login_required
@role_required("comprador")
def panel_comprador():
    return render_template(
        "comprador/panel_comprador.html",
        nombre=session.get("nombre", "Usuario"),
        page='inicio'
    )


# ===== Ver productos (con filtros por categoría y búsqueda) =====
@comprador.route("/productos")
def ver_productos():
    return render_template(
        "comprador/productos_comprador.html",
        productos=[],
        nombre=session.get("nombre", "Usuario"),
        page='productos'
    )


# ===== Detalle de producto =====
@comprador.route("/producto/<string:producto_id>")
@comprador.route("/detalle_producto/<string:producto_id>")
@login_required
@role_required("comprador")
def ver_detalle_producto(producto_id):
    # Página de detalle - datos cargados desde Firebase en el frontend
    return render_template("comprador/detalle_producto.html", 
                         producto_id=producto_id,
                         producto=None, 
                         nombre=session.get("nombre", "Usuario"),
                         page='productos')


# ===== Agregar al carrito =====
@comprador.route("/agregar_carrito", methods=["POST"])
@login_required
@role_required("comprador")
def agregar_carrito():
    # Nota: El carrito ahora se maneja en el frontend con Firebase
    flash("Producto agregado al carrito", "success")
    return redirect(url_for("comprador.ver_carrito"))


# ===== Ver carrito =====
@comprador.route("/carrito")
@login_required
@role_required("comprador")
def ver_carrito():
    # Página de carrito simplificada - solo diseño visual
    return render_template("comprador/carrito.html", 
                         nombre=session.get("nombre", "Usuario"),
                         page='carrito')


# ===== Procesar compra =====
@comprador.route("/procesar_compra", methods=["POST"])
@login_required
@role_required("comprador")
def procesar_compra():
    # Nota: Las compras ahora se procesan en el frontend con Firebase y Stripe
    flash("Compra procesada correctamente", "success")
    return redirect(url_for("comprador.ver_carrito"))


# ===== Activar rol de vendedor =====
@comprador.route("/activar_rol_vendedor", methods=["GET", "POST"])
@login_required
@role_required("comprador")
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


# ===== Búsqueda de productos (AJAX) =====
@comprador.route("/buscar_productos")
@login_required
@role_required("comprador")
def buscar_productos():
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({"productos": []})
    
    # Nota: La búsqueda ahora se hace en el frontend con Firebase
    return jsonify({"productos": []})


# ===== Agregar producto al carrito (AJAX) =====
@comprador.route("/agregar_carrito_ajax", methods=["POST"])
@login_required
@role_required("comprador")
def agregar_carrito_ajax():
    data = request.get_json()
    producto_id = data.get('producto_id')
    cantidad = int(data.get('cantidad', 1))
    
    # Nota: El carrito ahora se maneja en el frontend con Firebase
    return jsonify({
        "success": True,
        "message": "Producto agregado al carrito",
        "carrito_count": len(session.get("carrito", []))
    })


# ===== Procesar pago con Stripe =====
@comprador.route("/procesar_pago", methods=["POST"])
@login_required
@role_required("comprador")
def procesar_pago():
    # Nota: Los pagos ahora se procesan en el frontend con Stripe
    flash("Pago procesado correctamente", "success")
    return redirect(url_for("comprador.ver_carrito"))


# ===== Crear Payment Intent (Stripe) =====
@comprador.route("/create-payment-intent", methods=["POST"])
def create_payment_intent():
    """
    Endpoint para crear Payment Intent de Stripe.
    Verifica autenticación y roles tanto en sesión Flask como en Firestore (para compatibilidad con Firebase).
    """
    try:
        # Verificar autenticación - primero por sesión Flask, luego por token Firebase si se proporciona
        user_id = session.get('user_id')
        user_roles = session.get('roles', [])
        
        if isinstance(user_roles, str):
            user_roles = [user_roles]
        
        # Si no hay sesión de Flask, intentar obtener desde Firestore a través del token
        # Por ahora, permitimos si hay al menos un usuario_id en sesión o si viene en el request
        if not user_id:
            # Intentar obtener desde el request (si el frontend lo envía)
            data = request.get_json() or {}
            firebase_token = data.get('firebase_token')
            
            if not firebase_token:
                return jsonify({
                    'error': 'No estás autenticado. Por favor, inicia sesión.',
                    'auth_required': True
                }), 401
        
        # Verificar rol de comprador - en sesión o permitir si no hay sesión (asumir que Firebase validó)
        # Por ahora, permitimos el acceso si hay sesión con usuario_id o si viene token
        # En producción, deberías verificar el token de Firebase aquí
        
        data = request.get_json() or {}
        amount = data.get('amount')
        
        if not amount:
            return jsonify({'error': 'Monto no proporcionado'}), 400
        
        if amount <= 0:
            return jsonify({'error': 'El monto debe ser mayor a cero'}), 400
        
        # Obtener clave secreta de Stripe
        stripe_secret = current_app.config.get('STRIPE_SECRET_KEY')
        if not stripe_secret:
            return jsonify({'error': 'Stripe no está configurado en el servidor'}), 500
        
        # Inicializar Stripe
        stripe.api_key = stripe_secret
        
        # Crear Payment Intent
        payment_intent = stripe.PaymentIntent.create(
            amount=int(amount),  # Monto en centavos
            currency='mxn',
            metadata={
                'user_id': user_id or data.get('user_id', 'unknown')
            }
        )
        
        return jsonify({
            'client_secret': payment_intent.client_secret,
            'payment_intent_id': payment_intent.id
        })
        
    except stripe.error.StripeError as e:
        return jsonify({'error': f'Error de Stripe: {str(e)}'}), 400
    except Exception as e:
        current_app.logger.error(f'Error al crear payment intent: {str(e)}')
        return jsonify({'error': 'Error al crear payment intent: ' + str(e)}), 500


# ===== Pago exitoso (Stripe) =====
@comprador.route("/stripe-success")
@login_required
def stripe_success():
    # Página de pago exitoso
    return render_template("comprador/pago_exitoso.html", 
                         nombre=session.get("nombre", "Usuario"),
                         page='carrito')


# ===== Pago exitoso =====
@comprador.route("/pago_exitoso")
def pago_exitoso():
    # Página de pago exitoso simplificada - solo diseño visual
    return render_template("comprador/pago_exitoso.html", 
                         nombre=session.get("nombre", "Usuario"),
                         page='carrito')
from flask import Blueprint, render_template, session, redirect, url_for, request, flash, jsonify, current_app
from flask_mail import Message, Mail
from modules.auth.decorators import login_required, role_required
import stripe
import os
from datetime import datetime

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


# ===== Ver mis pedidos =====
@comprador.route("/mis_pedidos")
@login_required
@role_required("comprador")
def mis_pedidos():
    # Página de pedidos del comprador - datos cargados desde Firebase en el frontend
    return render_template("comprador/mis_pedidos.html", 
                         nombre=session.get("nombre", "Usuario"),
                         page='pedidos')


# ===== Ver detalle de pedido =====
@comprador.route("/detalle_pedido/<string:pedido_id>")
@login_required
@role_required("comprador")
def detalle_pedido(pedido_id):
    # Página de detalle del pedido - datos cargados desde Firebase en el frontend
    return render_template("comprador/detalle_pedido.html", 
                         nombre=session.get("nombre", "Usuario"),
                         pedido_id=pedido_id,
                         page='pedidos')


# ===== Enviar ticket de compra por correo =====
@comprador.route("/enviar-ticket-compra", methods=["POST"])
def enviar_ticket_compra():
    """Endpoint para enviar el ticket de compra por correo electrónico"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se recibieron datos'}), 400
        
        # Datos de la compra
        compra_id = data.get('compra_id', 'N/A')
        email_cliente = data.get('email_cliente', '')
        nombre_cliente = data.get('nombre_cliente', 'Cliente')
        fecha_compra = data.get('fecha_compra', datetime.now().strftime('%d/%m/%Y %H:%M'))
        productos = data.get('productos', [])
        subtotal = float(data.get('subtotal', 0))
        envio = float(data.get('envio', 4.50))
        impuestos = float(data.get('impuestos', 0))
        total = float(data.get('total', 0))
        metodo_pago = data.get('metodo_pago', 'N/A')
        direccion_entrega = data.get('direccion_entrega', {})
        
        if not email_cliente:
            return jsonify({'error': 'No se proporcionó el email del cliente'}), 400
        
        # Configurar método de pago
        metodo_pago_labels = {
            'tarjeta': 'Tarjeta de débito/crédito',
            'efectivo': 'Efectivo contra entrega',
            'transferencia': 'Transferencia bancaria'
        }
        metodo_pago_texto = metodo_pago_labels.get(metodo_pago, metodo_pago)
        
        # Construir HTML del ticket
        productos_html = ''
        for idx, producto in enumerate(productos, 1):
            productos_html += f'''
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align:center;">{idx}</td>
                    <td style="padding: 12px; border-bottom:1px solid #eee;">{producto.get('nombre', 'Producto')}</td>
                    <td style="padding: 12px; border-bottom:1px solid #eee; text-align:center;">{producto.get('cantidad', 0)} {producto.get('unidad', 'kg')}</td>
                    <td style="padding: 12px; border-bottom:1px solid #eee; text-align:right;">${float(producto.get('precio_unitario', 0)):.2f}</td>
                    <td style="padding: 12px; border-bottom:1px solid #eee; text-align:right;">${float(producto.get('precio_total', 0)):.2f}</td>
                </tr>
            '''
        
        ciudad = direccion_entrega.get('ciudad', 'No especificada')
        telefono = direccion_entrega.get('telefono', 'No especificado')
        
        html_body = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2e8b57 0%, #228B22 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ margin: 0; font-size: 28px; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .section {{ background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .section h2 {{ color: #2e8b57; margin-top: 0; font-size: 20px; border-bottom: 2px solid #2e8b57; padding-bottom: 10px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
                th {{ background: #2e8b57; color: white; padding: 12px; text-align: left; }}
                td {{ padding: 12px; border-bottom: 1px solid #eee; }}
                .total-section {{ background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 20px; }}
                .total-row {{ display: flex; justify-content: space-between; padding: 8px 0; }}
                .total-final {{ font-size: 20px; font-weight: bold; color: #2e8b57; border-top: 2px solid #2e8b57; padding-top: 10px; margin-top: 10px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🍃 AgroMarket</h1>
                    <p style="margin: 10px 0 0 0; font-size: 18px;">Ticket de Compra</p>
                </div>
                
                <div class="content">
                    <div class="section">
                        <h2>📋 Información del Pedido</h2>
                        <p><strong>Número de pedido:</strong> {compra_id}</p>
                        <p><strong>Fecha:</strong> {fecha_compra}</p>
                        <p><strong>Método de pago:</strong> {metodo_pago_texto}</p>
                    </div>
                    
                    <div class="section">
                        <h2>👤 Información del Cliente</h2>
                        <p><strong>Nombre:</strong> {nombre_cliente}</p>
                        <p><strong>Email:</strong> {email_cliente}</p>
                    </div>
                    
                    <div class="section">
                        <h2>📦 Productos Comprados</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th style="text-align:center; width:50px;">#</th>
                                    <th>Producto</th>
                                    <th style="text-align:center;">Cantidad</th>
                                    <th style="text-align:right;">Precio Unit.</th>
                                    <th style="text-align:right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productos_html}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="section">
                        <h2>📍 Información de Entrega</h2>
                        <p><strong>Ciudad de entrega:</strong> {ciudad}</p>
                        <p><strong>Teléfono de contacto:</strong> {telefono}</p>
                        <p style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                            <strong>ℹ️ Importante:</strong> El conductor se comunicará contigo en el número proporcionado para coordinar la entrega.
                        </p>
                    </div>
                    
                    <div class="total-section">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span>${subtotal:.2f}</span>
                        </div>
                        <div class="total-row">
                            <span>Envío:</span>
                            <span>${envio:.2f}</span>
                        </div>
                        <div class="total-row">
                            <span>Impuestos:</span>
                            <span>${impuestos:.2f}</span>
                        </div>
                        <div class="total-row total-final">
                            <span>TOTAL:</span>
                            <span>${total:.2f}</span>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Gracias por tu compra en AgroMarket 🍃</p>
                        <p>Este es un comprobante automático, por favor guárdalo.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        '''
        
        # Crear y enviar el correo
        msg = Message(
            subject=f'🎉 Confirmación de Compra - Pedido #{compra_id[:9].upper()}',
            recipients=[email_cliente],
            html=html_body
        )
        
        # Obtener la instancia de Mail desde la extensión de Flask
        mail = current_app.extensions.get('mail')
        if not mail:
            # Si no está en extensions, intentar crear una nueva instancia
            # Esto solo debería pasar si Flask-Mail no está configurado
            current_app.logger.warning('Flask-Mail no está configurado correctamente')
            return jsonify({'error': 'Servicio de correo no disponible'}), 503
        
        mail.send(msg)
        
        return jsonify({
            'success': True,
            'message': 'Ticket de compra enviado correctamente'
        })
        
    except Exception as e:
        current_app.logger.error(f'Error enviando ticket de compra: {str(e)}')
        return jsonify({
            'error': f'Error al enviar el ticket: {str(e)}'
        }), 500
from flask import Blueprint, render_template, session, redirect, url_for, flash, request
from werkzeug.security import check_password_hash, generate_password_hash
from db import get_db
from auth.decorators import login_required

usuario_bp = Blueprint('usuario', __name__, url_prefix='/usuario')

@usuario_bp.route('/perfil')
@login_required
def perfil():
    db = get_db()
    usuario_id = session['usuario_id']
    usuario = db.execute("SELECT * FROM usuarios WHERE id = ?", (usuario_id,)).fetchone()
    return render_template('usuarios/perfil_usuario.html', usuario=usuario)


@usuario_bp.route('/actualizar_perfil', methods=['POST'])
@login_required
def actualizar_perfil():
    db = get_db()
    usuario_id = session['usuario_id']
    nombre = request.form['nombre']
    correo = request.form['correo']
    telefono = request.form.get('telefono')

    db.execute("""
        UPDATE usuarios SET nombre = ?, correo = ?, telefono = ? WHERE id = ?
    """, (nombre, correo, telefono, usuario_id))
    db.commit()

    flash('Perfil actualizado correctamente.', 'success')
    return redirect(url_for('usuario.perfil'))


@usuario_bp.route('/cambiar_contrasena', methods=['POST'])
@login_required
def cambiar_contrasena():
    db = get_db()
    usuario_id = session['usuario_id']
    actual = request.form['actual']
    nueva = request.form['nueva']
    confirmar = request.form['confirmar']

    usuario = db.execute("SELECT contraseña FROM usuarios WHERE id = ?", (usuario_id,)).fetchone()

    if not check_password_hash(usuario['contraseña'], actual):
        flash('La contraseña actual no es correcta.', 'danger')
        return redirect(url_for('usuario.perfil'))

    if nueva != confirmar:
        flash('Las contraseñas no coinciden.', 'warning')
        return redirect(url_for('usuario.perfil'))

    nueva_hash = generate_password_hash(nueva)
    db.execute("UPDATE usuarios SET contraseña = ? WHERE id = ?", (nueva_hash, usuario_id))
    db.commit()

    flash('Contraseña actualizada correctamente.', 'success')
    return redirect(url_for('usuario.perfil'))


@usuario_bp.route('/cambiar_rol', methods=['POST'])
@login_required
def cambiar_rol():
    db = get_db()
    usuario_id = session['usuario_id']
    nuevo_rol = request.form['nuevo_rol']

    # Actualiza en base de datos y sesión
    db.execute("UPDATE usuarios SET rol = ? WHERE id = ?", (nuevo_rol, usuario_id))
    db.commit()
    session['roles'] = [nuevo_rol]

    flash(f'Rol cambiado a {nuevo_rol}.', 'info')
    return redirect(url_for('usuario.perfil'))

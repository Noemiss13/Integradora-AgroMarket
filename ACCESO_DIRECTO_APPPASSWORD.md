# Acceso Directo a Contraseñas de Aplicaciones

## 🔗 Enlace Directo

Abre este enlace en tu navegador (debería funcionar incluso si no aparece en el menú):

**https://myaccount.google.com/apppasswords**

## 📋 Qué deberías ver

Si el enlace funciona, verás una página que dice algo como:

**"Genera una contraseña de aplicación"** o **"Create an app password"**

Con un formulario que tiene:
- **Seleccionar app**: Un menú desplegable
- **Seleccionar dispositivo**: Un menú desplegable

## ✅ Pasos una vez que abras el enlace

1. En **"Seleccionar app"**, elige: **"Correo"** o **"Mail"**
2. En **"Seleccionar dispositivo"**, elige: **"Otro (nombre personalizado)"** o **"Other (Custom name)"**
3. Escribe: `AgroMarket`
4. Haz clic en **"Generar"** o **"Generate"**
5. **Copia la contraseña de 16 caracteres** que aparece (algo como `abcd efgh ijkl mnop`)
6. **Elimina los espacios**: debe quedar `abcdefghijklmnop`

## ⚠️ Si el enlace te da error

Si el enlace no funciona o te da error, puede ser porque:

1. **Cuenta de Google Workspace (empresa)**:
   - Tu administrador puede tener restricciones
   - Puedes intentar usar tu contraseña normal de Gmail temporalmente (aunque no es recomendado)

2. **Alternativa temporal**: 
   - Puedes configurar el correo directamente en `config/app.py` con tu contraseña normal de Gmail
   - Pero necesitarás habilitar "Permitir aplicaciones menos seguras" (no recomendado)

## 📝 Después de obtener la contraseña

Una vez que tengas la contraseña de 16 caracteres (sin espacios), edita `config/app.py` líneas 26-28:

```python
MAIL_USERNAME = 'tu-email@gmail.com'  # Tu email de Gmail
MAIL_PASSWORD = 'abcdefghijklmnop'     # La contraseña sin espacios
MAIL_DEFAULT_SENDER = 'AgroMarket <tu-email@gmail.com>'
```


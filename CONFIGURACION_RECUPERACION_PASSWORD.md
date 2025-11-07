# Configuración de Recuperación de Contraseña

## Requisitos

La funcionalidad de recuperación de contraseña requiere:

1. **Firebase Admin SDK** - Para cambiar contraseñas en Firebase Auth
2. **Flask-Mail** - Para enviar correos (ya configurado)
3. **Credenciales de Firebase Admin** - Archivo JSON con las credenciales del servicio

## Instalación

1. Instala las dependencias:
```bash
pip install -r requirements.txt
```

## Configuración de Firebase Admin SDK

### Opción 1: Variable de Entorno (Recomendado)

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `agromarket-625b2`
3. Ve a **Configuración del proyecto** > **Cuentas de servicio**
4. Haz clic en **Generar nueva clave privada**
5. Descarga el archivo JSON
6. Guarda el archivo en un lugar seguro (ej: `config/firebase-credentials.json`)
7. Configura la variable de entorno:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/ruta/completa/a/firebase-credentials.json"
```

O en Windows:
```cmd
set GOOGLE_APPLICATION_CREDENTIALS=C:\ruta\completa\a\firebase-credentials.json
```

### Opción 2: Configuración Manual

Si prefieres no usar la variable de entorno, puedes modificar el código en `modules/auth/routes.py` en la función `initialize_firebase_admin()` para especificar la ruta directamente.

## Configuración de Permisos en Firebase

Asegúrate de que la cuenta de servicio tenga los siguientes permisos:
- **Firebase Authentication Admin** - Para cambiar contraseñas
- **Cloud Firestore User** - Para leer/escribir tokens

## Estructura de Datos en Firestore

La aplicación creará automáticamente una colección llamada `password_reset_tokens` con la siguiente estructura:

```
password_reset_tokens/
  {token_hash}/
    email: string
    token_hash: string
    expires_at: timestamp
    created_at: timestamp
    used: boolean
```

## Funcionamiento

1. **Usuario solicita recuperación**: Ingresa su email en `/auth/forgot_password`
2. **Sistema genera token**: Se crea un token único y seguro
3. **Token se guarda en Firestore**: Con expiración de 1 hora
4. **Correo enviado**: Con Flask-Mail usando SMTP
5. **Usuario hace clic en enlace**: Va a `/auth/reset_password/<token>`
6. **Sistema valida token**: Verifica que existe, no ha expirado y no ha sido usado
7. **Usuario ingresa nueva contraseña**: Mínimo 6 caracteres
8. **Contraseña actualizada**: En Firebase Auth usando Admin SDK
9. **Token marcado como usado**: Para evitar reutilización

## Seguridad

- Los tokens expiran en 1 hora
- Los tokens se almacenan como hash SHA-256
- Cada token solo puede usarse una vez
- Los tokens se validan antes de permitir cambio de contraseña
- Por seguridad, no se revela si un email existe o no

## Solución de Problemas

### Error: "Firebase Admin no está configurado"

1. Verifica que `firebase-admin` esté instalado: `pip list | grep firebase-admin`
2. Verifica que la variable de entorno esté configurada: `echo $GOOGLE_APPLICATION_CREDENTIALS`
3. Verifica que el archivo JSON exista y sea válido

### Error: "Error al enviar el correo electrónico"

1. Verifica la configuración de Flask-Mail en `config/app.py`
2. Verifica que las credenciales de SMTP sean correctas
3. Para Gmail, usa una "Contraseña de aplicación" en lugar de tu contraseña normal

### Error: "Error al actualizar contraseña"

1. Verifica que la cuenta de servicio tenga permisos de Firebase Authentication Admin
2. Verifica los logs del servidor para más detalles

## Notas

- El sistema funciona con Firebase Auth
- Los correos se envían usando SMTP configurado en Flask-Mail
- Los tokens se almacenan en Firestore
- La contraseña se actualiza en Firebase Auth usando Admin SDK


# 🔐 Configurar Firebase Admin SDK para Cambio de Contraseñas

## 📋 Pasos para Configurar

### Paso 1: Descargar el Archivo de Credenciales

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **agromarket-625b2**
3. Haz clic en el ícono de ⚙️ **Configuración del proyecto** (arriba a la izquierda)
4. Ve a la pestaña **"Cuentas de servicio"**
5. Haz clic en **"Generar nueva clave privada"**
6. Se descargará un archivo JSON (ej: `agromarket-625b2-firebase-adminsdk-xxxxx.json`)

### Paso 2: Colocar el Archivo en el Proyecto

Tienes **3 opciones** (elige una):

#### Opción A: En la raíz del proyecto (Recomendado)
- Renombra el archivo descargado a: `serviceAccountKey.json`
- Colócalo en: `/Users/bryan/Desktop/integradora/Integradora-AgroMarket/serviceAccountKey.json`

#### Opción B: En la carpeta config/
- Renombra el archivo descargado a: `serviceAccountKey.json`
- Colócalo en: `/Users/bryan/Desktop/integradora/Integradora-AgroMarket/config/serviceAccountKey.json`

#### Opción C: Variable de entorno
- Coloca el archivo donde quieras
- Configura la variable de entorno:
  ```bash
  export GOOGLE_APPLICATION_CREDENTIALS="/ruta/completa/al/archivo.json"
  ```

### Paso 3: Verificar que Funciona

1. Reinicia el servidor Flask
2. Intenta cambiar una contraseña
3. Revisa los logs del servidor - deberías ver:
   ```
   📁 Usando credenciales de Firebase desde: /ruta/al/archivo.json
   ✅ Firebase Admin SDK inicializado correctamente
   ```

## ✅ Estructura del Archivo

El archivo JSON debe verse así:
```json
{
  "type": "service_account",
  "project_id": "agromarket-625b2",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@agromarket-625b2.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

## 🔒 Seguridad

⚠️ **IMPORTANTE**: 
- **NUNCA** subas este archivo a Git (ya está en `.gitignore`)
- **NUNCA** compartas este archivo públicamente
- Este archivo da acceso completo a tu proyecto de Firebase

## 🐛 Solución de Problemas

### Error: "Firebase Admin no está configurado"
- Verifica que el archivo existe en una de las ubicaciones mencionadas
- Verifica que el nombre del archivo sea exactamente `serviceAccountKey.json`
- Verifica que el archivo JSON sea válido

### Error: "Permission denied"
- Verifica que la cuenta de servicio tenga permisos de **Firebase Authentication Admin**

## 📝 Notas

- El código buscará automáticamente el archivo en las ubicaciones mencionadas
- Si encuentras el archivo, el sistema lo detectará automáticamente
- Una vez configurado, el cambio de contraseñas funcionará directamente sin depender del email de Firebase


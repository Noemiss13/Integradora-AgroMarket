import json
import os
from functools import lru_cache

from flask import current_app


@lru_cache(maxsize=1)
def _load_firestore_client():
    """
    Inicializa Firebase Admin y devuelve un cliente de Firestore.
    Si Firebase Admin no está disponible o la inicialización falla, devuelve None.
    Se usa memoización para evitar inicializaciones repetidas en el ciclo de vida de la app.
    """
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError:
        return None

    if firebase_admin._apps:
        return firestore.client()

    cred = _build_credentials(firebase_admin)
    if not cred:
        return None

    firebase_admin.initialize_app(cred)
    return firestore.client()


def _build_credentials(firebase_admin):
    """
    Construye las credenciales de Firebase Admin según la configuración disponible.
    Se soporta:
      - Ruta a archivo de servicio (FIREBASE_CREDENTIALS_PATH)
      - JSON de servicio en variable de entorno (FIREBASE_SERVICE_ACCOUNT_JSON)
      - Credenciales por defecto (GOOGLE_APPLICATION_CREDENTIALS / ADC)
    """
    from firebase_admin import credentials

    config = getattr(current_app, "config", {}) or {}
    credentials_path = config.get("FIREBASE_CREDENTIALS_PATH") or os.environ.get("FIREBASE_CREDENTIALS_PATH")
    credentials_json = config.get("FIREBASE_SERVICE_ACCOUNT_JSON") or os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")

    if credentials_json:
        try:
            service_dict = json.loads(credentials_json)
            return credentials.Certificate(service_dict)
        except json.JSONDecodeError:
            current_app.logger.error("No se pudo parsear FIREBASE_SERVICE_ACCOUNT_JSON; revisa el formato.")
            return None

    if credentials_path and os.path.exists(credentials_path):
        return credentials.Certificate(credentials_path)

    try:
        return credentials.ApplicationDefault()
    except Exception as exc:
        current_app.logger.warning("No se pudieron cargar credenciales de Firebase Admin: %s", exc)
        return None


def get_firestore_client():
    """
    Devuelve un cliente de Firestore listo para usar o None si no fue posible inicializarlo.
    No lanza excepciones para facilitar el manejo en rutas/servicios.
    """
    try:
        client = _load_firestore_client()
        if client is None:
            current_app.logger.warning("Firestore no está disponible: Firebase Admin no inicializado.")
        return client
    except Exception as exc:
        current_app.logger.error("Error inicializando Firestore: %s", exc)
        return None


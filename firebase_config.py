import firebase_admin
from firebase_admin import credentials, firestore, auth, storage

cred = credentials.Certificate("firebase-key.json")

firebase_admin.initialize_app(cred, {
    "storageBucket": "tu-proyecto.appspot.com"
})

db = firestore.client()
bucket = storage.bucket()

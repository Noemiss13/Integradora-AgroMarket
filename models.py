from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()  # Objeto que se inicializa luego en app.py

class Producto(db.Model):
    __tablename__ = "productos"  # Asegúrate que coincida con tu tabla en la DB
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text)
    precio = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, nullable=False)
    imagen = db.Column(db.String(100))
    vendedor = db.Column(db.String(100))

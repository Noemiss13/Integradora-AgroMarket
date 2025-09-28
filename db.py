import mysql.connector
from config import db_config
from flask_sqlalchemy import SQLAlchemy

def get_db_connection():
    conn = mysql.connector.connect(**db_config)
    return conn


db = SQLAlchemy()

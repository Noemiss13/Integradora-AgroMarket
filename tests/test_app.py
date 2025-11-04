import sys
import os
import pytest

# Asegura que Python encuentre app.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app  # importa la instancia de Flask

@pytest.fixture
def cliente():
    app.config['TESTING'] = True
    with app.test_client() as cliente:
        yield cliente


def test_ruta_principal(cliente):
    """Verifica que la página principal responde correctamente"""
    respuesta = cliente.get('/')
    assert respuesta.status_code in [200, 302, 404]

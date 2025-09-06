# Integradora-AgroMarket
realización de una página web de comercio agrícola



# AgroMarket 

Proyecto de plataforma web para comercio agrícola, desarrollado en **Flask + MySQL**.

## 📌 Requisitos previos

- Tener instalado **Python 3.10+**
- Tener instalado **MySQL** y crear una base de datos para el proyecto
- Instalar **pip** y **virtualenv** (si no los tienes)

## 🚀 Instalación y ejecución

1. **Clonar el repositorio**

   ```bash
   git clone <URL_DEL_REPO>
   cd AgroMarket

2. crear y acticvar un entorno virtual, en cmd

python -m venv venv
venv\Scripts\activate

3. instalar las dependencias con el siguiente comando:

pip install -r requirements.txt

4. Ejecutar la pagina:

python app.py

5. ya inclui el script de la bd en schema.sql, tienen que crear su bd para eso deben ejecutar los siguientes comandos:

mysql -u root -p < schema.sql


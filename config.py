# Configuración global

import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "devkey")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "postgresql://walter:WalexNet@server:5432/portfolio")
    #SQLALCHEMY_DATABASE_URI = os.environ["DATABASE_URL"]
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    BABEL_DEFAULT_LOCALE = "es"
    LANGUAGES = ["es", "en"]
    # Flask-Admin Configuration
    FLASK_ADMIN_TEMPLATE_MODE = "bootstrap4"
    # Configuramos la carpeta Uploader
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'upload')

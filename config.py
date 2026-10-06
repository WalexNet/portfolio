import os


class Config:
    SECRET_KEY = os.environ["SECRET_KEY"]
    SQLALCHEMY_DATABASE_URI = os.environ["DATABASE_URL"]
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_RECIPIENT = os.getenv("MAIL_RECIPIENT")

    BABEL_DEFAULT_LOCALE = "es"
    LANGUAGES = ["es", "en"]

    FLASK_ADMIN_TEMPLATE_MODE = "bootstrap4"
    UPLOAD_FOLDER = os.path.join(os.getcwd(), "upload")

class DevelopmentConfig(Config):
    ENVIRONMENT = "development"


class ProductionConfig(Config):
    ENVIRONMENT = "production"


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}
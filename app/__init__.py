# Factory (crea la app)

from flask import Flask
from flask_login import LoginManager
from .extensions import db, migrate, babel
from .admin import setup_admin
from .routes.main import main
from .routes.blog import blog_bp
from .routes.auth import auth_bp
from config import Config
from flask import request
from app.models import User

def create_app():
    # Inicializamos la app
    app = Flask(__name__)
    # Cargamos la config
    app.config.from_object(Config)
    # Configuración de Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))
    # Conectamos e inicializamos las Extenciones
    db.init_app(app)
    migrate.init_app(app, db)
    babel.init_app(app)
    setup_admin(app)
    # Registramos los BluePrint
    app.register_blueprint(main)
    app.register_blueprint(blog_bp)
    app.register_blueprint(auth_bp)


    return app

# @babel.localeselector
def get_locale():
    return request.accept_languages.best_match(["es", "en"])

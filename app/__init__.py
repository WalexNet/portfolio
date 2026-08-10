# Factory (crea la app)

from flask import Flask
from flask_login import LoginManager
from .extensions import db, migrate, babel
from .admin import setup_admin
from .routes.main import main
from .routes.blog import blog_bp
from .routes.auth import auth_bp
from .routes.page import career_bp
from config import Config
from flask import request
from app.models import User
from .middleware.access_logger import start_timer, log_request
from sqlalchemy import select
from app.models import Page

def create_app():
    # Inicializamos la app
    app = Flask(__name__)
    # Cargamos la config
    app.config.from_object(Config)
    #Verificamos quien entra en la app
    app.before_request(start_timer)
    app.after_request(log_request)
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
    app.register_blueprint(career_bp)

    @app.context_processor
    def inject_career_menu():
        stmt = (
            select(Page)
            .where(
                Page.section == "career",
                Page.is_published.is_(True)
            )
            .order_by(Page.sort_order, Page.title)
        )

        career_menu = db.session.scalars(stmt).all()

        return {
            "career_menu": career_menu
        }

    return app

# @babel.localeselector
def get_locale():
    return request.accept_languages.best_match(["es", "en"])

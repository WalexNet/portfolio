# Factory (crea la app)

from flask import Flask
from .extensions import db, migrate, babel
from .admin import setup_admin
from .routes import main
from config import Config
from flask import request

def create_app():
    # Inicializamos la app
    app = Flask(__name__)
    # Cargamos la config
    app.config.from_object(Config)
    # Conectamos e inicializamos las Extenciones
    db.init_app(app)
    migrate.init_app(app, db)
    babel.init_app(app)
    app.register_blueprint(main)
    setup_admin(app)

    return app

# @babel.localeselector
def get_locale():
    return request.accept_languages.best_match(["es", "en"])

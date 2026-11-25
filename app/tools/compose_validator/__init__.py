"""Docker Compose static validator; blueprint registered in app/__init__.py."""
from flask import Blueprint

compose_validator_bp = Blueprint('compose_validator', __name__, url_prefix='/tools/compose-validator')

from . import routes  # noqa: E402,F401

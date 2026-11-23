"""Rutas de la herramienta Comparador de configuraciones."""
from flask import Blueprint, render_template

config_diff_bp = Blueprint('config_diff', __name__, url_prefix='/tools/config-diff')


@config_diff_bp.get('/')
def index():
    return render_template('tools/config_diff/index.html')

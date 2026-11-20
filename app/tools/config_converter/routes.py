from flask import Blueprint, render_template

config_converter_bp = Blueprint(
    'config_converter', __name__, url_prefix='/tools/config-converter'
)


@config_converter_bp.get('/')
def index():
    return render_template('tools/config_converter/index.html')

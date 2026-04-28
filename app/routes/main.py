# Rutas (controlador)

from flask import Blueprint, render_template
from app.models import Project

main = Blueprint(
    'main',
    __name__,
    url_prefix="/",
    template_folder="../templates"
)

@main.route('/')
def index():
    return render_template('index.html')
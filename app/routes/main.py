# Rutas (controlador)

from flask import Blueprint, render_template
from app.models import Project

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')
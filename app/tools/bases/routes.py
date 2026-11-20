"""Rutas del conversor de bases numéricas."""
from flask import Blueprint, render_template

bases_bp = Blueprint("bases", __name__, url_prefix="/tools/bases")


@bases_bp.get("/")
def index():
    return render_template("tools/bases/index.html")

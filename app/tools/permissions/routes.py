from flask import Blueprint, render_template

permissions_bp = Blueprint(
    "permissions", __name__, url_prefix="/tools/permissions"
)

@permissions_bp.get("/")
def index():
    return render_template("tools/permissions/index.html")

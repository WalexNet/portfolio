from flask import Blueprint, render_template

regex_bp = Blueprint("regex", __name__, url_prefix="/tools/regex")


@regex_bp.get("/")
def index():
    return render_template("tools/regex/index.html")

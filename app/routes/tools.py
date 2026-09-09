from flask import Blueprint, render_template

tools_bp = Blueprint(
    "tools",
    __name__,
    url_prefix="/tools/",
    template_folder="../templates"
)


@tools_bp.route("/")
def index():
    return render_template("tools.html")
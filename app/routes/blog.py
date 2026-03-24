from flask import Blueprint, render_template

blog_bp = Blueprint(
    "blog",
    __name__,
    url_prefix="/blog",
    template_folder="../templates"
)

@blog_bp.route("/")
def index():
    return render_template("blog.html")

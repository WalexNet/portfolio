from flask import Blueprint, render_template, abort
from app.models import Post

blog_bp = Blueprint(
    "blog",
    __name__,
    url_prefix="/blog",
    template_folder="../templates"
)

# Listado
@blog_bp.route("/")
def index():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    return render_template("blog.html", posts=posts)


# Post Individual
@blog_bp.route("/<slug>")
def post(slug):
    posteo = Post.query.filter_by(slug=slug).first()

    if not post:
        abort(404)

    return render_template("post.html", post=posteo)

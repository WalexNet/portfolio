from flask import Blueprint, render_template, abort
from app.models import Post
from sqlalchemy import select
from ..extensions import db

blog_bp = Blueprint(
    "blog",
    __name__,
    url_prefix="/blog",
    template_folder="../templates"
)

# Listado
@blog_bp.get("/")
def index():
    print('index()')
    """Fetches all posts ordered by creation date."""
    # Using the new SQLAlchemy 2.0 style syntax for execution
    query = select(Post).order_by(Post.created_at.desc())
    posts = db.session.execute(query).scalars().all()
    return render_template('blog.html', posts=posts)
    #return render_template("blog.html", posts=posts)


# Post Individual
@blog_bp.get("/<string:slug>")
def detail(slug):
    """Retrieves a single post by its slug."""
    query = select(Post).filter_by(slug=slug)
    post = db.session.execute(query).scalar_one_or_none()

    if post is None:
        abort(404)

    return render_template("detail.html", post=post)



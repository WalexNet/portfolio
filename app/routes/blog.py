from flask import Blueprint, render_template, abort, send_from_directory
from app.models import Post, Tag, post_tags
from sqlalchemy import select
from ..extensions import db
from mistune import create_markdown
import os

blog_bp = Blueprint(
    "blog",
    __name__,
    url_prefix="/blog",
    template_folder="../templates"
)

md = create_markdown(plugins=[
    'strikethrough',
    'table',
    'task_lists',
    'footnotes',
    'url'
])

@blog_bp.route('/upload/<path:filename>')
def uploaded_file(filename):
    upload_folder = os.path.join(os.getcwd(), 'upload')
    return send_from_directory(upload_folder, filename)


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
    content_html = md(post.content)
    if post is None:
        abort(404)

    return render_template("detail.html", post=post, content_html=content_html)


@blog_bp.route("/tag/<string:name>")
def by_tag(name):
    """Fetches all posts with the given tag."""
    query = (
        select(Post)
        .join(post_tags)
        .join(Tag)
        .filter(Tag.name == name)
        .order_by(Post.created_at.desc())
    )
    posts = db.session.execute(query).scalars().all()
    return render_template("blog.html", posts=posts, tag=name)



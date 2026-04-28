# Base de datos (SQLAlchemy)

from .extensions import db
from datetime import datetime
from slugify import slugify


#export DATABASE_URL="postgresql://walter:WalexNet@server:5432/portfolio"


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150))
    description = db.Column(db.Text)
    tech_stack = db.Column(db.String(250))
    github_url = db.Column(db.String(250))

class Post(db.Model):
    """Blog post model representing the 'public.post' table."""
    __tablename__ = 'post'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    content = db.Column(db.Text, nullable=False)
    summary = db.Column(db.String(300))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, title, content, summary=""):
        self.title = title
        self.slug = slugify(title)
        self.content = content
        self.summary = summary


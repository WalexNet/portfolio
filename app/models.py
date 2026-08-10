# Base de datos (SQLAlchemy)
from datetime import datetime, timezone
from typing import Optional
from .extensions import db
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, DateTime, Table, Column, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import INET
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

#export DATABASE_URL="postgresql://walter:WalexNet@server:5432/portfolio"


post_tags = Table(
    'post_tags',
    db.metadata,
    Column('post_id', ForeignKey('post.id'), primary_key=True),
    Column('tag_id', ForeignKey('tag.id'), primary_key=True),
)


class Tag(db.Model):
    __tablename__ = 'tag'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    posts = relationship('Post', secondary=post_tags, back_populates='tags')

    def __repr__(self) -> str:
        return f'<Tag {self.name}>'


class Project(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    tech_stack: Mapped[str] = mapped_column(Text)
    github_url: Mapped[str] = mapped_column(Text, nullable=True)

class Post(db.Model):
    """Blog post model representing the 'public.post' table."""
    __tablename__ = 'post'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(String(300))
    cover_image: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f'<Post {self.title[:20]}...>'

    tags = relationship('Tag', secondary=post_tags, back_populates='posts')



class Page(db.Model):
    """Generic page model."""

    __tablename__ = "page"
    __table_args__ = (
        db.UniqueConstraint("section", "slug", name="uq_page_section_slug",),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    section: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(String(300))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    cover_image: Mapped[Optional[str]] = mapped_column(Text)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    menu_title: Mapped[Optional[str]] = mapped_column(String(100))
    sort_order: Mapped[int] = mapped_column(default=100, nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<Page {self.section}/{self.slug}>"


class User(db.Model, UserMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class AccessLog(db.Model):
    __tablename__ = "access_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )
    ip: Mapped[str | None] = mapped_column(INET)
    method: Mapped[str | None] = mapped_column(String(10))
    path: Mapped[str | None] = mapped_column(String(255))
    status_code: Mapped[int | None]
    response_time_ms: Mapped[int | None]
    user_agent: Mapped[str | None] = mapped_column(Text)
    referer: Mapped[str | None] = mapped_column(Text)
    browser: Mapped[str | None] = mapped_column(String(50))
    os: Mapped[str | None] = mapped_column(String(50))
    device: Mapped[str | None] = mapped_column(String(50))
# Base de datos (SQLAlchemy)
from datetime import datetime, timezone
from typing import Optional
from .extensions import db
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, DateTime, Table, Column, ForeignKey
from sqlalchemy.orm import relationship

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


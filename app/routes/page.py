from flask import Blueprint, render_template, abort
from sqlalchemy import select
from app.utils.markdow import render_markdown

from app.models import Page
from app.extensions import db

career_bp = Blueprint(
    "career",
    __name__,
    url_prefix="/trayectoria",
    template_folder="../templates",
)


@career_bp.route("/<slug>")
def detail(slug):

    stmt = (
        select(Page)
        .where(
            Page.section == "career",
            Page.slug == slug,
            Page.is_published.is_(True)
        )
    )

    page = db.session.scalar(stmt)

    if page is None:
        abort(404)

    content_html = render_markdown(page.content)

    return render_template(
        "detail.html",
        item=page,
        content_html=content_html,)
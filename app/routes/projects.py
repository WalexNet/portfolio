import os
from flask import Blueprint, render_template, send_from_directory, abort
from sqlalchemy import desc, select

from app.models import Project
from app.extensions import db
from app.utils.markdow import render_markdown


projects_bp = Blueprint(
    "projects",
    __name__,
    url_prefix="/projects",
    template_folder="../templates"
)

@projects_bp.route("/upload/<path:filename>")
def uploaded_file(filename):
    upload_folder = os.path.join(os.getcwd(), "upload")
    return send_from_directory(upload_folder, filename)

@projects_bp.get("/")
def index():
    projects = (
        Project.query
        .filter(Project.is_published.is_(True))
        .order_by(desc(Project.created_at))
        .all()
    )

    return render_template(
        "projects.html",
        projects=projects
    )

@projects_bp.get("/<string:slug>")
def detail(slug):
    query = select(Project).where(
        Project.slug == slug,
        Project.is_published.is_(True)
    )
    project = db.session.execute(query).scalar_one_or_none()

    if project is None:
        abort(404)

    content_html = render_markdown(project.content)

    return render_template("project_detail.html", project=project,
        content_html=content_html )
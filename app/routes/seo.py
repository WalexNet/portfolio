
from flask import Blueprint, Response, url_for
from sqlalchemy import select
from xml.etree import ElementTree as ET

from app.extensions import db
from app.models import Post, Project, Page


seo_bp = Blueprint("seo", __name__)

SITE_URL = "https://walex.net"
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"


@seo_bp.get("/sitemap.xml")
def sitemap():
    """Genera el sitemap XML con las URLs públicas."""

    urls = [
        url_for("main.index"),
        url_for("blog.index"),
        url_for("projects.index"),
    ]

    # Artículos publicados
    posts = db.session.scalars(
        select(Post.slug).where(
            Post.is_published.is_(True)
        )
    ).all()

    for slug in posts:
        urls.append(url_for("blog.detail", slug=slug))

    # Proyectos publicados
    projects = db.session.scalars(
        select(Project.slug).where(
            Project.is_published.is_(True)
        )
    ).all()

    for slug in projects:
        urls.append(url_for("projects.detail", slug=slug))

    # Páginas publicadas de Trayectoria Profesional
    career_pages = db.session.scalars(
        select(Page.slug).where(
            Page.section == "career",
            Page.is_published.is_(True)
        )
    ).all()

    for slug in career_pages:
        urls.append(url_for("career.detail", slug=slug))

    # Generar XML
    ET.register_namespace("", SITEMAP_NS)

    root = ET.Element(f"{{{SITEMAP_NS}}}urlset")

    for path in urls:
        url_element = ET.SubElement(
            root, f"{{{SITEMAP_NS}}}url"
        )

        ET.SubElement(
            url_element, f"{{{SITEMAP_NS}}}loc"
        ).text = SITE_URL + path

    xml = ET.tostring(
        root,
        encoding="utf-8",
        xml_declaration=True
    )

    return Response(xml, mimetype="application/xml")


@seo_bp.get("/robots.txt")
def robots():
    """Directivas públicas para los rastreadores."""

    content = (
        "User-agent: *\n"
        "Allow: /\n"
        "\n"
        f"Sitemap: {SITE_URL}/sitemap.xml\n"
    )

    return Response(content, mimetype="text/plain")

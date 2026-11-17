from flask import Blueprint, redirect

legacy_bp = Blueprint("legacy", __name__)

# Redirecciones permanentes de URLs antiguas
LEGACY_REDIRECTS = {
    "/index.html": "/",
    "/projects/index.html": "/projects/",
    "/tools/index.html": "/tools/",
    "/tools/subnet/index.html": "/tools/subnet/",
    "/trayectoria/index.html": "/trayectoria/portada",
}


def make_redirect(destination):
    """Crea una vista de redirección permanente."""

    def redirect_view():
        return redirect(destination, code=301)

    return redirect_view


for index, (old_path, destination) in enumerate(LEGACY_REDIRECTS.items()):
    legacy_bp.add_url_rule(
        old_path,
        endpoint=f"legacy_{index}",
        view_func=make_redirect(destination),
        methods=["GET"],
    )
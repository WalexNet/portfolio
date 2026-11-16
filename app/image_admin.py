"""Subida de imágenes para insertarlas en contenido Markdown."""

from io import BytesIO
from pathlib import Path
from uuid import uuid4

from flask import flash, redirect, request, url_for
from flask_admin import BaseView, expose
from flask_login import current_user
from flask_wtf import FlaskForm
from flask_wtf.file import FileRequired
from PIL import Image, UnidentifiedImageError
from wtforms import FileField, SubmitField


UPLOAD_DIR = Path(__file__).resolve().parent.parent / "upload" / "img" / "content"
MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_EXTENSIONS = {"PNG": ".png", "JPEG": ".jpg", "WEBP": ".webp"}


class MarkdownImageForm(FlaskForm):
    image = FileField("Imagen (PNG, JPG o WebP; máximo 5 MB)", validators=[FileRequired()])
    submit = SubmitField("Subir imagen")


class MarkdownImageAdminView(BaseView):
    def is_accessible(self):
        return current_user.is_authenticated

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for("auth.login", next=request.url))

    @expose("/", methods=("GET", "POST"))
    def index(self):
        form = MarkdownImageForm()
        markdown_code = None

        if form.validate_on_submit():
            incoming = form.image.data
            data = incoming.stream.read(MAX_IMAGE_BYTES + 1)
            if len(data) > MAX_IMAGE_BYTES:
                flash("La imagen supera el límite de 5 MB.", "error")
            else:
                try:
                    with Image.open(BytesIO(data)) as img:
                        image_format = img.format
                        if image_format not in IMAGE_EXTENSIONS:
                            raise ValueError("Formato de imagen no admitido")
                        img.verify()
                except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
                    flash("El archivo no es una imagen PNG, JPG o WebP válida.", "error")
                else:
                    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
                    filename = f"{uuid4().hex}{IMAGE_EXTENSIONS[image_format]}"
                    (UPLOAD_DIR / filename).write_bytes(data)
                    image_url = url_for(
                        "blog.uploaded_file",
                        filename=f"img/content/{filename}",
                    )
                    markdown_code = f"![Descripción de la imagen]({image_url})"
                    flash("Imagen subida correctamente.", "success")
        elif request.method == "POST":
            flash("Selecciona una imagen válida para continuar.", "error")

        images = []
        if UPLOAD_DIR.is_dir():
            for path in sorted(
                (p for p in UPLOAD_DIR.iterdir()
                 if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS.values()),
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )[:100]:
                image_url = url_for(
                    "blog.uploaded_file", filename=f"img/content/{path.name}"
                )
                images.append({
                    "filename": path.name,
                    "url": image_url,
                    "markdown": f"![Descripción de la imagen]({image_url})",
                })

        return self.render(
            "admin/markdown_images.html",
            form=form,
            markdown_code=markdown_code,
            images=images,
        )

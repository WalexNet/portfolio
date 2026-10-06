# app/admin.py
from flask import redirect, url_for, request
from pathlib import Path
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from flask_admin.form import ImageUploadField
from flask_login import current_user
from slugify import slugify

from app.models import (
    Post,
    Project,
    Tag,
    User,
    Page,
    Certification,
)
from app.extensions import db

import time


# Use pathlib for robust path management
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "upload" / "img"


# Vista principal del Admin protegida
class MyAdminIndexView(AdminIndexView):

    @expose('/')
    def index(self):
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login', next=request.url))

        return super(MyAdminIndexView, self).index()


# Clase base para proteger todas las vistas de modelos
class ProtectedModelView(ModelView):

    def is_accessible(self):
        return current_user.is_authenticated

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('auth.login', next=request.url))


class PostAdminView(ProtectedModelView):
    """Admin view with automated slug generation and image handling."""

    def __init__(self, *args, **kwargs):
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        super().__init__(*args, **kwargs)

    form_extra_fields = {
        'cover_image': ImageUploadField(
            'Cover Image',
            base_path=str(UPLOAD_DIR),
            namegen=lambda obj, file_data:
                f"post_{int(time.time())}{Path(file_data.filename).suffix}",
            url_relative_path='img/'
        )
    }

    form_excluded_columns = ['slug', 'created_at']

    column_list = [
        'title',
        'slug',
        'tags',
        'created_at'
    ]

    column_filters = ['tags']

    def on_model_change(self, form, model, is_created):
        if is_created or not model.slug:
            model.slug = slugify(model.title)

        return super().on_model_change(form, model, is_created)


class ProjectAdminView(ProtectedModelView):
    """Admin view for projects with automated slug generation and image handling."""

    def __init__(self, *args, **kwargs):
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        super().__init__(*args, **kwargs)

    form_extra_fields = {
        'cover_image': ImageUploadField(
            'Cover Image',
            base_path=str(UPLOAD_DIR),
            namegen=lambda obj, file_data:
                f"project_{int(time.time())}{Path(file_data.filename).suffix}",
            url_relative_path='img/'
        )
    }

    form_excluded_columns = ['slug', 'created_at']

    column_list = [
        'title',
        'slug',
        'tech_stack',
        'github_url',
        'is_published',
        'created_at'
    ]

    column_filters = [
        'is_published'
    ]

    column_searchable_list = [
        'title',
        'description',
        'tech_stack'
    ]

    column_editable_list = [
        'is_published'
    ]

    column_default_sort = ('created_at', True)

    def on_model_change(self, form, model, is_created):

        if is_created or not model.slug:
            base_slug = slugify(model.title)
            slug = base_slug
            counter = 2

            with db.session.no_autoflush:
                while Project.query.filter_by(slug=slug).first() is not None:
                    slug = f"{base_slug}-{counter}"
                    counter += 1

            model.slug = slug

        return super().on_model_change(form, model, is_created)


class CertificationAdminView(ProtectedModelView):
    """Admin view for certifications and courses."""

    def __init__(self, *args, **kwargs):
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        super().__init__(*args, **kwargs)

    form_extra_fields = {
        'certificate_image': ImageUploadField(
            'Certificate Image',
            base_path=str(UPLOAD_DIR),
            namegen=lambda obj, file_data:
                f"certificate_{int(time.time())}{Path(file_data.filename).suffix}",
            url_relative_path='img/'
        )
    }
    form_choices = {
        'cert_type': [
            ('certification', 'Certificación'),
            ('course', 'Curso'),
        ]
    }
    form_excluded_columns = [
        'created_at'
    ]
    column_list = [
        'title',
        'issuer',
        'cert_type',
        'issue_date',
        'display_order',
        'is_published',
    ]
    column_labels = {
        'title': 'Título',
        'issuer': 'Entidad',
        'cert_type': 'Tipo',
        'issue_date': 'Fecha',
        'certificate_image': 'Certificado',
        'credential_url': 'URL de verificación',
        'description': 'Descripción',
        'display_order': 'Orden',
        'is_published': 'Publicado',
    }
    column_filters = [
        'cert_type',
        'issuer',
        'is_published'
    ]
    column_searchable_list = [
        'title',
        'issuer',
        'description'
    ]
    column_editable_list = [
        'display_order',
        'is_published'
    ]
    column_default_sort = ('display_order', False)


def setup_admin(app):
    """
    Initializes Flask-Admin.
    """

    admin = Admin(
        app,
        name='Portfolio Admin',
        index_view=MyAdminIndexView()
    )
    admin.add_view(
        PostAdminView(
            Post,
            db.session,
            name="Blog Posts",
            category="Content"
        )
    )
    admin.add_view(
        ModelView(
            Tag,
            db.session,
            name="Tags",
            category="Content"
        )
    )
    admin.add_view(
        ModelView(
            Page,
            db.session
        )
    )
    admin.add_view(
        ProjectAdminView(
            Project,
            db.session,
            name="Projects",
            category="Content"
        )
    )
    admin.add_view(
        CertificationAdminView(
            Certification,
            db.session,
            name="Certifications & Courses",
            category="Content"
        )
    )
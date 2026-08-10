# app/admin.py
from flask import redirect, url_for, request
from pathlib import Path
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from flask_admin.form import ImageUploadField
from flask_login import current_user
from slugify import slugify
from app.models import Post, Project, Tag, User, Page
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
        # Redirige al login si no tiene sesión
        return redirect(url_for('auth.login', next=request.url))



class PostAdminView(ProtectedModelView):
    """Admin view with automated slug generation and image handling."""
    def __init__(self, *args, **kwargs):
        # Ensure the directory exists before the first upload
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        super().__init__(*args, **kwargs)

    form_extra_fields = {
        'cover_image': ImageUploadField(
            'Cover Image',
            base_path=str(UPLOAD_DIR),
            # Generate unique filenames based on title slug
            namegen=lambda obj, file_data: f"post_{int(time.time())}{Path(file_data.filename).suffix}",
            url_relative_path='img/'
        )
    }
    # Hide fields that are handled automatically
    form_excluded_columns = ['slug', 'created_at']
    column_list = ['title', 'slug', 'tags', 'created_at']
    column_filters = ['tags']

    def on_model_change(self, form, model, is_created):
        """Logic executed before saving to DB."""
        if is_created or not model.slug:
            model.slug = slugify(model.title)
        return super().on_model_change(form, model, is_created)

def setup_admin(app):
    """
    Initializes Flask-Admin.
    The template_mode is now pulled from app.config.
    """
    # Initialize without the problematic keyword argument
    # Inyectamos MyAdminIndexView
    admin = Admin(app, name='Portfolio Admin', index_view=MyAdminIndexView())

    # Registering views
    admin.add_view(ModelView(Project, db.session, name="Projects", category="Content"))
    admin.add_view(PostAdminView(Post, db.session, name="Blog Posts", category="Content"))
    admin.add_view(ModelView(Tag, db.session, name="Tags", category="Content"))
    admin.add_view(ModelView(Page, db.session))


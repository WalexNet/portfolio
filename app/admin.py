# Panel admin

from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from .models import Project
from .extensions import db

def setup_admin(app):
    admin = Admin(app, name="Portfolio Admin")
    admin.add_view(ModelView(Project, db.session))
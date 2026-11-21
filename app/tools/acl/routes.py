"""Diseñador de ACL IPv4 Cisco IOS/IOS XE."""
from flask import Blueprint, render_template

acl_bp = Blueprint("acl", __name__, url_prefix="/tools/acl")


@acl_bp.get("/")
def index():
    return render_template("tools/acl/index.html")

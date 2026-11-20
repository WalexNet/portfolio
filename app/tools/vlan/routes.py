
from flask import Blueprint, render_template

vlan_bp = Blueprint(
    "vlan",
    __name__,
    url_prefix="/tools/vlan"
)


@vlan_bp.route("/")
def index():
    return render_template("tools/vlan/index.html")

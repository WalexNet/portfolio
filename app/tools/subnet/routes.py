from flask import Blueprint, render_template, request

from .logic import calculate_subnet


subnet_bp = Blueprint(
    "subnet",
    __name__,
    url_prefix="/tools/subnet"
)


@subnet_bp.route("/", methods=["GET", "POST"])
def index():
    ip_cidr = None
    subnet_prefix = None

    result = None
    subnets = None
    subnet_info = None
    subnet_summary = None
    error = None

    if request.method == "POST":
        ip_cidr = request.form.get(
            "ip_cidr",
            ""
        ).strip()

        subnet_prefix = request.form.get(
            "subnet_prefix",
            ""
        ).strip()

        try:
            calculation = calculate_subnet(
                ip_cidr,
                subnet_prefix
            )

            result = calculation["result"]
            subnets = calculation["subnets"]
            subnet_info = calculation["subnet_info"]
            subnet_summary = calculation["subnet_summary"]

        except ValueError as e:
            error = str(e)

    return render_template(
        "tools/subnet/index.html",
        ip_cidr=ip_cidr,
        subnet_prefix=subnet_prefix,
        result=result,
        subnets=subnets,
        subnet_info=subnet_info,
        subnet_summary=subnet_summary,
        error=error
    )

from flask import Blueprint, render_template, request

from .logic import calculate_subnet


subnet_bp = Blueprint("subnet", __name__, url_prefix="/tools/subnet")


@subnet_bp.route("/", methods=["GET", "POST"])
def index():
    ip_cidr = ""
    subnet_prefix = ""
    ip_version = "4"
    result = None
    subnets = None
    subnet_info = None
    subnet_summary = None
    error = None

    if request.method == "POST":
        ip_cidr = request.form.get("ip_cidr", "").strip()
        subnet_prefix = request.form.get("subnet_prefix", "").strip()
        ip_version = request.form.get("ip_version", "4")

        if ip_version not in {"4", "6"}:
            ip_version = "4"

        try:
            calculation = calculate_subnet(ip_cidr, subnet_prefix)
            calculated_version = (
                "6" if ":" in calculation["result"]["address"] else "4"
            )
            if calculated_version != ip_version:
                raise ValueError(
                    f"La dirección introducida es IPv{calculated_version}, "
                    f"pero has seleccionado IPv{ip_version}."
                )

            result = calculation["result"]
            subnets = calculation["subnets"]
            subnet_info = calculation["subnet_info"]
            subnet_summary = calculation["subnet_summary"]

        except ValueError as exc:
            error = str(exc)

    return render_template(
        "tools/subnet/index.html",
        ip_cidr=ip_cidr,
        subnet_prefix=subnet_prefix,
        ip_version=ip_version,
        result=result,
        subnets=subnets,
        subnet_info=subnet_info,
        subnet_summary=subnet_summary,
        error=error,
    )

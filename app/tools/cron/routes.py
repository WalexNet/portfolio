
from flask import Blueprint, jsonify, render_template, request

from .logic import next_executions, validate_cron


cron_bp = Blueprint("cron", __name__, url_prefix="/tools/cron")


TIMEZONES = {
    "Europe/Madrid": "España (Madrid)",
    "UTC": "UTC",
    "Europe/London": "Reino Unido (Londres)",
    "Europe/Paris": "Francia (París)",
    "Europe/Berlin": "Alemania (Berlín)",
    "America/New_York": "EE. UU. (Nueva York)",
    "America/Los_Angeles": "EE. UU. (Los Ángeles)",
    "America/Mexico_City": "México (Ciudad de México)",
    "America/Argentina/Buenos_Aires": "Argentina (Buenos Aires)",
    "America/Bogota": "Colombia (Bogotá)",
    "Asia/Tokyo": "Japón (Tokio)",
}


@cron_bp.route("/", methods=["GET"])
def index():
    return render_template(
        "tools/cron/index.html",
        timezones=TIMEZONES,
    )


@cron_bp.route("/validate", methods=["POST"])
def validate():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "valid": False,
            "error": "La solicitud debe contener un objeto JSON válido."
        }), 400

    expression = data.get("expression", "")
    timezone = data.get("timezone", "Europe/Madrid")

    if not isinstance(expression, str):
        return jsonify({
            "valid": False,
            "error": "La expresión debe ser una cadena de texto."
        }), 400

    if not isinstance(timezone, str) or timezone not in TIMEZONES:
        return jsonify({
            "valid": False,
            "error": "La zona horaria seleccionada no es válida."
        }), 400

    try:
        validate_cron(expression)

        executions = next_executions(
            expression,
            count=5,
            timezone=timezone,
        )

        return jsonify({
            "valid": True,
            "expression": expression.strip(),
            "timezone": timezone,
            "executions": [
                execution.strftime("%d/%m/%Y %H:%M %Z")
                for execution in executions
            ],
        })

    except ValueError as exc:
        return jsonify({
            "valid": False,
            "error": str(exc),
        }), 400

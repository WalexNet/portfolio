"""Endpoints del analizador sshd_config."""
from flask import Blueprint, jsonify, render_template, request
from .logic import analyze_config

ssh_analyzer_bp = Blueprint("ssh_analyzer", __name__, url_prefix="/tools/ssh-analyzer")


@ssh_analyzer_bp.get("/")
def index():
    return render_template("tools/ssh_analyzer/index.html")


@ssh_analyzer_bp.post("/analyze")
def analyze():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Se esperaba una petición JSON válida."}), 400
    try:
        result = analyze_config(data.get("config"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(result)

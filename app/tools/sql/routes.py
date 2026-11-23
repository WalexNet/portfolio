"""Rutas del formateador SQL: registrar sql_bp desde app/__init__.py."""
from flask import Blueprint, jsonify, render_template, request
from .logic import DIALECTS, MAX_SQL_LENGTH, SqlInputError, process_sql

sql_bp = Blueprint("sql", __name__, url_prefix="/tools/sql")


@sql_bp.get("/")
def index():
    return render_template("tools/sql/index.html")


@sql_bp.post("/process")
def process_api():
    if request.content_length is not None and request.content_length > 250_000:
        return jsonify(error="Solicitud demasiado grande."), 413
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="Se esperaba un objeto JSON."), 400
    try:
        result = process_sql(
            sql=payload.get("sql", ""),
            dialect=payload.get("dialect", "postgres"),
            action=payload.get("action", "format"),
            keyword_case=payload.get("keyword_case", "upper"),
        )
    except SqlInputError as exc:
        return jsonify(error=str(exc)), 400
    return jsonify(result)

"""Blueprint for CIDR route aggregation, with no persistent storage."""
from flask import Blueprint, jsonify, render_template, request
from .logic import analyze, routes

cidr_bp = Blueprint('cidr', __name__, url_prefix='/tools/cidr')


@cidr_bp.get('/')
def index():
    return render_template('tools/cidr/index.html')


@cidr_bp.post('/analyze')
def analyze_api():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({'error': 'Envía un objeto JSON válido.'}), 400
    try:
        return jsonify(analyze(payload.get('networks', '')))
    except (ValueError, TypeError) as error:
        return jsonify({'error': str(error)}), 400


@cidr_bp.post('/routes')
def routes_api():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({'error': 'Envía un objeto JSON válido.'}), 400
    try:
        result = routes(payload.get('networks', []), payload.get('vendor', ''), payload.get('gateway', ''), payload.get('interface', ''))
        return jsonify({'configuration': result})
    except (ValueError, TypeError) as error:
        return jsonify({'error': str(error)}), 400

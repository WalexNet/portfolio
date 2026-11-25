from flask import render_template, request
from . import compose_validator_bp
from .validator import analyze_compose

EXAMPLE = '''services:
  web:
    image: nginx:stable-alpine
    ports:
      - "8080:80"
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      retries: 5
volumes:
  postgres_data:
'''

@compose_validator_bp.route('/', methods=['GET', 'POST'])
def index():
    source = EXAMPLE if request.method == 'GET' else request.form.get('compose', '')
    report = analyze_compose(source) if request.method == 'POST' else None
    return render_template('tools/compose_validator/index.html', source=source, report=report)

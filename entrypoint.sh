#!/bin/sh

echo "========================================="
echo "Iniciando aplicación Flask..."
echo "========================================="

exec gunicorn \
    --workers=4 \
    --threads=2 \
    --bind=0.0.0.0:8000 \
    --timeout=120 \
    wsgi:app

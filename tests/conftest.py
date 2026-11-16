import os

# Variables exclusivas del entorno de pruebas.
# No sobrescribimos valores existentes.

os.environ.setdefault(
    "SECRET_KEY",
    "testing-secret-key-not-for-production"
)

os.environ.setdefault(
    "DATABASE_URL",
    "sqlite:///:memory:"
)

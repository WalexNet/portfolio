# Validador Docker Compose — integración Portfolio Web

Descomprimir el ZIP en la raíz del repositorio. Contiene únicamente **archivos nuevos**; no sobrescribe app/__init__.py, tools.html ni requirements.txt.

## 1. Dependencia

Verificar PyYAML en el entorno y `requirements.txt`:

```bash
python -c 'import yaml; print(yaml.__version__)'
```

Si falta: `pip install PyYAML` y registrar `PyYAML` en `requirements.txt` antes del próximo build de imagen.

## 2. Registrar blueprint centralizado

En `app/__init__.py`, **dentro de `create_app()`**, junto a los demás imports de blueprints:

```python
from app.tools.compose_validator import compose_validator_bp
```

En el mismo bloque en el que se llama a `app.register_blueprint(...)`:

```python
app.register_blueprint(compose_validator_bp)
```

Se deja fuera del ZIP porque hay que insertar las líneas en las posiciones reales de tu archivo vigente.

## 3. Confirmar bloque Jinja

La plantilla usa `{% extends 'base.html' %}` y `{% block content %}`. Si el bloque principal de tu `base.html` tiene otro nombre, adaptar **solo** ese bloque a la estructura real. El archivo CSS es independiente.

## 4. Prueba mínima

```bash
python -m compileall -q app/tools/compose_validator
python -c 'import yaml; print("PyYAML OK")'
flask routes | grep compose_validator
pytest -q tests/test_compose_validator.py
```

Ruta: `/tools/compose-validator/` y endpoint: `compose_validator.index`.

## 5. Catálogo

No se toca `app/templates/tools.html` porque debe conservarse la versión más reciente (filtros, slug de tutorial y grid 260px / flexible / 220px). Tras validar la herramienta, agregar tarjeta con etiqueta Docker / DevOps e imagen transparente y asociar el slug del artículo cuando se publique.

## Alcance

Analizador **estático**, no ejecuta Docker ni utiliza archivos externos. Puede producir recomendaciones que no apliquen a cada caso; las colisiones por puertos variables/rangos y los YAML Compose con etiquetas de merge especiales no se resuelven completamente. Complementar con `docker compose config -q` sobre el proyecto real.

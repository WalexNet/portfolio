# Conversor JSON / YAML / TOML — integración

Copiar los archivos de `app/` a sus rutas equivalentes del proyecto (sin eliminar nada existente).

## 1. Editar `app/__init__.py`

Buscar exactamente:

```python
from .tools.bases.routes import bases_bp
```

Reemplazar por:

```python
from .tools.bases.routes import bases_bp
from .tools.config_converter.routes import config_converter_bp
```

Buscar exactamente:

```python
    app.register_blueprint(bases_bp)
```

Reemplazar por:

```python
    app.register_blueprint(bases_bp)
    app.register_blueprint(config_converter_bp)
```

## 2. Comprobar

```bash
python -m compileall -q app
python -c 'from app import create_app; app=create_app(); print([r.rule for r in app.url_map.iter_rules() if "config-converter" in r.rule])'
```

Abrir `/tools/config-converter/` en Flask y probar JSON → YAML, YAML → TOML, TOML → JSON, errores y descarga.

## 3. Catálogo

Incorporar tarjeta en `app/templates/tools.html` siguiendo una tarjeta existente; no se incluye un reemplazo automático porque falta la versión actual de ese archivo.

## Notas

- Las bibliotecas JavaScript se importan desde `esm.sh` con versiones fijadas. Se necesita acceso a Internet en el navegador y una política CSP que permita dicho dominio.
- Los documentos se procesan en el navegador; no se envían al servidor Flask.
- El código rechaza documentos YAML múltiples y ficheros mayores de 2 MiB.
- Las conversiones no garantizan conservación de comentarios, orden semántico, estilos o tipos especiales.
- Para un despliegue sin dependencia de CDN, conviene empaquetar las bibliotecas localmente.

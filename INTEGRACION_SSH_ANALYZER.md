# Integración del Analizador SSH

Descomprime el ZIP en la raíz del repositorio `portfolio/`. No se modifica ningún archivo existente en el ZIP; solo se añaden archivos nuevos.

## 1. Registro en `app/__init__.py`

Localiza el bloque de **importaciones de blueprints de herramientas**, junto al de `fortigate_audit` (o la última herramienta), y añade:

```python
from app.tools.ssh_analyzer.routes import ssh_analyzer_bp
```

Dentro de `create_app()`, donde están los demás `app.register_blueprint(...)`, añade:

```python
app.register_blueprint(ssh_analyzer_bp)
```

No hagas este registro en `app/tools/ssh_analyzer/__init__.py`.

## 2. Comprobar

```bash
python -m compileall -q app/tools/ssh_analyzer
flask routes | grep ssh_analyzer
python -m pytest tests/test_ssh_analyzer.py -q
```

Rutas esperadas:

- `ssh_analyzer.index` GET `/tools/ssh-analyzer/`
- `ssh_analyzer.analyze` POST `/tools/ssh-analyzer/analyze`

## 3. Catálogo y tutorial

Cuando confirmes la pantalla funcional, incorpora la tarjeta al `app/templates/tools.html` vigente. Debe seguir el grid 260px / flexible / 220px, las clases de la tarjeta existente, `data-category="sistemas"` y las condiciones de `tutorial_slugs`/`published_tutorials`, sin inventar slugs publicados. Se preparará la imagen transparente en su fase visual para `app/static/img/tools/`.

## 4. Limitaciones importantes

- El análisis es estático: no resuelve `Include` ni evalúa `Match` para un contexto específico.
- No deduce valores por defecto de la versión de OpenSSH ni interpreta el efecto completo del orden de directivas.
- No reemplaza `sshd -t`, `sshd -T`, una revisión de permisos ni una auditoría del servidor.
- El endpoint recibe la configuración en memoria durante la solicitud, sin grabarla explícitamente en archivos o base de datos.

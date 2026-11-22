# Integración de la calculadora de rutas y sumarización CIDR

El ZIP **no sobrescribe** `app/__init__.py`, `app/templates/tools.html`, `base.html` ni los estilos compartidos. Contiene únicamente archivos nuevos para preservar ACL y el resto de herramientas.

## 1. Registro del Blueprint

**Archivo:** `app/__init__.py`

Junto a las importaciones de Blueprints existentes (por ejemplo `from .tools.subnet.routes import subnet_bp`) insertar:

```python
from .tools.cidr.routes import cidr_bp
```

Dentro de `create_app()`, junto a los `app.register_blueprint(...)` existentes, insertar:

```python
app.register_blueprint(cidr_bp)
```

Ambas operaciones deben hacerse en este archivo central; no registrar blueprints en los `__init__.py` de herramientas.

## 2. Tarjeta en el catálogo

**Archivo:** `app/templates/tools.html`

Añadir una nueva tarjeta **copiando una tarjeta de red existente de la versión actual**, respetando la estructura y todas las clases CSS aprobadas: `tools-card`, `tools-card-body`, `tools-card-art`, `tools-card-content`, `tools-card-title`, `tools-tags` y el bloque lateral de acción que ya utilice la página. Establecer:

- Título: **Calculadora de rutas y sumarización CIDR**
- Descripción: **Agrupa prefijos IPv4 e IPv6, elimina redundancias y genera rutas estáticas.**
- Categoría: `data-category="redes"`
- Destino del CTA: `{{ url_for('cidr.index') }}`
- Imagen: reservar `app/static/img/tools/cidr.webp` para la ilustración de fondo transparente que se generará al aprobar el diseño (no incluida en este ZIP).

No se incluye una sustitución completa de `tools.html` porque la última versión con ACL no está disponible. Ajustar la tarjeta copiando la plantilla real evita romper el catálogo.

## 3. Comprobaciones breves

```bash
python -m compileall -q app/tools/cidr
flask routes | grep cidr
```

Si la aplicación requiere `.env`, cargarlo del modo habitual antes de lanzar Flask. Probar:

- `GET /tools/cidr/`
- Introducir `192.168.0.0/24` hasta `192.168.3.0/24` → `192.168.0.0/22`
- Generar rutas Cisco usando `10.0.0.1` de siguiente salto.

El módulo usa exclusivamente la biblioteca estándar Python (`ipaddress`); no requiere modificar `requirements.txt`.

## 4. Consideraciones técnicas

- La sumarización exacta usa `ipaddress.collapse_addresses` y **no añade redes**.
- La superred común es solo informativa cuando incluye direcciones adicionales.
- No se admiten mezclas IPv4/IPv6 en el mismo análisis.
- Los comandos estáticos requieren un siguiente salto válido de la familia correspondiente; no se comprueba conectividad ni existencia de interfaces.
- La numeración `edit` FortiOS comienza en 1 en el bloque generado; **revisarla si ya existen rutas estáticas**, porque puede sobrescribir entradas con el mismo ID.
- La herramienta no modifica equipos de red ni almacena datos en la base de datos.

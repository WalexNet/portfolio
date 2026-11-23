# Auditor FortiGate — primera integración

Esta entrega agrega archivos nuevos; **no reemplaza** `app/__init__.py`, `config.py`, `tools.html` ni el comparador existente. Se usa `UPLOAD_FOLDER`, confirmado en `config.py` como `upload/`, y se guardan versiones en `upload/fortigate_audit/<UUID>/`. Cada usuario autenticado ve solamente sus cargas. El directorio de backups **no debe servirse por Nginx/Apache como directorio estático**. Verificar configuración del proxy antes de desplegar.

## Registro centralizado (única modificación manual obligatoria)

En `app/__init__.py` junto a los imports de otras herramientas, después de:

```python
from .tools.config_diff.routes import config_diff_bp
```

insertar:

```python
from .tools.fortigate_audit.routes import fortigate_audit_bp
```

En el bloque de `app.register_blueprint`, después de:

```python
    app.register_blueprint(config_diff_bp)
```

insertar:

```python
    app.register_blueprint(fortigate_audit_bp)
```

## Verificaciones mínimas

Cargar `.env` como se hace habitualmente en el proyecto y ejecutar:

```bash
python -m compileall -q app/tools/fortigate_audit
flask routes | grep fortigate
```

Esperado: `/tools/fortigate-audit/`, `/tools/fortigate-audit/upload`, `/tools/fortigate-audit/report/<rec_id>`, `/tools/fortigate-audit/compare`.

En el navegador, acceder como usuario autenticado a `/tools/fortigate-audit/`. Subir un `.conf` FortiOS exportado, comprobar el informe y subir una segunda versión **del mismo hostname** para probar la comparación. No se incluye ningún backup real en el ZIP.

## Límites y comportamiento

- No conecta con el dispositivo. Auditoría estática según 14 reglas y pesos históricos (40, 10, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 2, 2).
- El cálculo ha sido corregido respecto al script original; los resultados **no son directamente comparables** con sus puntuaciones anteriores.
- El perfil contiene valores corporativos heredados; revisar/parametrizar antes de usar para otros entornos. Las reglas «Perfiles de seguridad en salida» y «Políticas Any Any» siguen siendo heurísticas: validar manualmente los hallazgos.
- `no evaluable` no suma ni resta puntos; la pantalla indica el máximo evaluable.
- Archivo hasta 4 MiB; diff textual limitado a 350 líneas. Historial respaldado por JSON y archivos privados, sin migraciones SQL.
- La comparación del navegador existente **no se reutiliza** porque limita a 2.000 líneas. Se realiza con Python en el servidor.
- No se muestra ni se descarga el backup original desde las rutas del auditor. Los secretos comunes se ocultan en la vista diff, pero **otras líneas pueden contener datos sensibles**. Limitar acceso y nunca publicar resultados completos.
- No se ha añadido todavía tarjeta al catálogo porque no se aportó la versión actual de `app/templates/tools.html`. Tampoco se incluye icono ilustrado propio ni tutorial: se integrarán con el catálogo y blog reales.
- No se incluye CSS de la herramienta original `config-diff.css` (no aportado); el módulo usa CSS aislado con paleta de herramientas para evitar afectar a páginas existentes.
- Para un uso público en producción, revisar retención/borrado, límites de cuota por usuario, exposición web de `upload/`, cabeceras de seguridad y almacenamiento de secretos.

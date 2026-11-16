# AGENTS.md — Portfolio Web

## Alcance y estado

Aplicación de portfolio profesional y blog técnico escrita en Flask. Este documento describe el código de la base **1.8.3** y las funcionalidades de imágenes Markdown validadas localmente para la próxima versión **1.8.4** (16-11-2026). No presupongas que estos cambios están desplegados en producción.

Este archivo sirve como guía para cualquier agente o colaborador que modifique el repositorio. Prioriza cambios pequeños, verificables y compatibles con el diseño actual. Comprobar cada paso en desarrollo antes de continuar o desplegar.

## Arquitectura

- Python 3.14 (Dockerfile), Flask 3.1.3, SQLAlchemy 2.x, Flask-SQLAlchemy, Flask-Migrate/Alembic, PostgreSQL con psycopg2, Flask-Admin 2.0.2 y Flask-Login.
- Patrón *application factory*: `app/__init__.py:create_app()`; puntos de entrada `run.py` (desarrollo) y `wsgi.py` (Gunicorn).
- Configuración en `config.py`: `APP_ENV` selecciona `development` o `production`; `SECRET_KEY` y `DATABASE_URL` se leen obligatoriamente del entorno. No incluir secretos ni valores de ejemplo con credenciales reales en documentación o commits.
- Extensiones compartidas en `app/extensions.py`; modelos en `app/models.py`; vistas administrativas en `app/admin.py`; recursos estáticos en `app/static/`; plantillas Jinja2 en `app/templates/`.
- Docker: `Dockerfile` usa `python:3.14-slim` y `entrypoint.sh` ejecuta Gunicorn en el puerto 8000 (4 workers, 2 threads). Las configuraciones de Docker Compose, proxy y volúmenes de producción no están definidas en este repositorio: verificar en el host de despliegue, no inventarlas.

## Blueprints y funciones

- `app/routes/main.py`: portada (`/`).
- `app/routes/blog.py`: listado, detalle y filtros del blog; archivos en `/blog/upload/<path:filename>`.
- `app/routes/projects.py`: proyectos publicados y detalle; archivos en `/projects/upload/<path:filename>`.
- `app/routes/auth.py`: acceso y salida de usuarios (`/auth/`).
- `app/routes/page.py`: páginas de trayectoria profesional (`/trayectoria/<slug>`).
- `app/routes/tools.py`: página de herramientas (`/tools/`).
- `app/tools/subnet/`: calculadora de subredes (`/tools/subnet/`), con lógica separada de la vista.
- `app/routes/seo.py`: rutas SEO.
- `app/middleware/access_logger.py`: tiempo de respuesta y registro de accesos en la base de datos, con exclusiones de rutas estáticas.

## Modelo de datos

- `Post`: artículos Markdown, resumen, portada, slug, estado de publicación y etiquetas.
- `Project`: descripción, contenido Markdown, portada, tecnologías, URL GitHub, slug y estado de publicación.
- `Tag` y tabla `post_tags`: relación muchos a muchos con artículos.
- `Page`: contenido de secciones (por ejemplo, trayectoria), orden y publicación.
- `Certification`: certificaciones y cursos, imagen, fechas, orden y publicación.
- `User`: credenciales con hash y autenticación Flask-Login.
- `AccessLog`: accesos, agente de usuario, IP, estado HTTP y latencia.
- Las migraciones Alembic se guardan en `migrations/versions/`; no modificar una migración aplicada en producción ni generar cambios de esquema para almacenar imágenes Markdown cuando solo se necesita una ruta en el contenido.

## Markdown e imágenes

- El renderizador está en `app/utils/markdow.py` (mantener este nombre, incluido el nombre sin la «n» final, hasta efectuar un cambio coordinado de imports). Usa Mistune 3 con plugins `strikethrough`, `table`, `task_lists`, `footnotes` y `url`.
- El HTML de Markdown se utiliza en las páginas públicas; revisar sanitización y seguridad de `|safe` antes de admitir contenido de autores no confiables. No asumir que Mistune sanea HTML sin configuración.
- Los estilos están en `app/static/css/md.css`.
- Las portadas se gestionan en Flask-Admin mediante `ImageUploadField`, con destino `upload/img/`.
- La mejora 1.8.4 incorpora `app/image_admin.py` y `app/templates/admin/markdown_images.html`: subida PNG/JPEG/WebP (hasta 5 MiB), verificación con Pillow, nombres UUID, biblioteca de hasta 100 imágenes recientes y botón «Copiar Markdown».
- Las imágenes ilustrativas se almacenan en `upload/img/content/` y se enlazan en Markdown con URL pública similar a `![Descripción](/blog/upload/img/content/<archivo>.png)`. La base de datos solo guarda el contenido Markdown con la URL; no se añaden tablas ni migraciones.
- La nueva vista debe usar **`self.render(...)`**, no `flask.render_template(...)`, para que Flask-Admin inyecte `admin_base_template` y su contexto. Formularios mediante Flask-WTF y token CSRF.
- No borrar imágenes sin comprobar sus referencias en los artículos y proyectos. La biblioteca es de consulta y reutilización, no de borrado.
- El almacenamiento `upload/` no está versionado: asegurar persistencia y copias de seguridad en producción antes de desplegar. La ruta en Docker debe comprobarse en la configuración efectiva del despliegue.

## Administración y seguridad

- El panel se monta en `/admin/`. `PostAdminView`, `ProjectAdminView` y `CertificationAdminView` heredan `ProtectedModelView`; las imágenes Markdown se gestionan en una vista `BaseView` con control de autenticación.
- `MyAdminIndexView` redirige usuarios anónimos al login. Revisar los permisos de **todas** las vistas al modificar `setup_admin`; el código base registra `Tag` y `Page` con `ModelView` directamente, por lo que debe auditarse su protección antes del siguiente despliegue.
- La autenticación actual se basa en `current_user.is_authenticated`, no en roles detallados. No presentar este comportamiento como un sistema de autorización por roles.
- En cargas de archivos: validar tamaño, contenido real y extensión; generar nombres seguros; no confiar en el nombre ni MIME aportado por el cliente; mantener protección CSRF.
- Evitar divulgar contraseñas, tokens, cookies, claves privadas o datos personales en parches, pruebas, logs compartidos y documentación.

## Comandos de desarrollo

```bash
# Activar entorno existente
source venv/bin/activate

# Arrancar localmente (con SECRET_KEY y DATABASE_URL configuradas)
python run.py

# Verificar módulos y estilo del parche
python -m compileall -q app

git diff --check

# Prueba existente
python -m pytest tests/test_subnet.py

# Migraciones (solo cuando cambie el esquema; configurar entorno)
flask --app run.py db migrate -m "descripcion"
flask --app run.py db upgrade
```

El repositorio incluye `tests/test_subnet.py`; no afirmar que carece de pruebas. Agregar pruebas de vistas y cargas cuando se modifique el gestor de imágenes. Verificar que el entorno de tests tenga las dependencias necesarias (pytest no figura en `requirements.txt` de producción).

## Flujo de cambios y despliegue

1. Inspeccionar rutas, modelos, plantillas y configuración existentes antes de editar.
2. Modificar lo mínimo indispensable y preservar rutas públicas y esquemas de datos.
3. Validar compilación, tests relevantes y navegación funcional en Manjaro.
4. Comprobar imágenes Markdown: subida, miniatura, enlace, copia, renderizado en artículo/proyecto, rechazo de archivo inválido y límite de tamaño.
5. Actualizar `CHANGELOG.md`, `AGENTS.md` y `APP_VERSION` de manera coherente con la versión candidata.
6. Antes de producción: verificar variables de entorno, persistencia del directorio `upload`, copias de seguridad, proceso de actualización del contenedor y prueba final de URLs públicas.

## Convenciones

- Código legible, modular, con nombres coherentes con las convenciones existentes; Flask Blueprints para rutas y Jinja2 para vistas.
- Usar API de SQLAlchemy 2.x en código nuevo; mantener estados de publicación en consultas públicas.
- Usar `url_for` para construir rutas internas en lugar de fijar dominios o puertos.
- No introducir nuevas dependencias, tablas o servicios cuando el sistema actual resuelva el objetivo.
- Documentación en español; versiones y fechas explícitas. Nunca inferir que desarrollo y producción están sincronizados.

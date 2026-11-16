
# Historial de cambios — PortfolioWEB

Todas las modificaciones relevantes de PortfolioWEB se documentarán en este archivo.

El proyecto sigue [Versionado Semántico](https://semver.org/lang/es/)
y utiliza el formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [1.8.4] - 2026-11-16 (validada en desarrollo; pendiente de despliegue)

### Añadido
- Vista «Imágenes Markdown» en Flask-Admin para subir ilustraciones PNG, JPG y WebP y generar su código Markdown.
- Biblioteca visual de hasta 100 imágenes recientes, con miniaturas y enlaces reutilizables.
- Botones «Copiar Markdown» después de una subida y en cada elemento de la biblioteca, con aviso de copia y alternativa manual.

### Seguridad y almacenamiento
- Validación de formato real con Pillow, tamaño máximo de 5 MiB, nombres únicos y protección CSRF en el formulario.
- Archivos ilustrativos almacenados en `upload/img/content/` y accesibles mediante la ruta ya existente `/blog/upload/img/content/...`.
- Sin modificaciones de esquema ni migraciones; se mantiene el sistema de portadas.

### Corregido
- Uso de `self.render()` en la vista personalizada de Flask-Admin para disponer del contexto de plantilla (`admin_base_template`).

### Documentación
- Actualización de `AGENTS.md` para reflejar la arquitectura y las convenciones actuales.

### Pendiente antes de producción
- Verificar la persistencia de `upload/` en el despliegue y revisar sanitización del HTML Markdown y acceso a vistas administrativas.

---

## [1.8.0] - 2026-10-16

### Añadido
- Sección de artículos relacionados en el Blog Técnico, seleccionados automáticamente mediante etiquetas compartidas.
- Botón «Volver al Blog» al finalizar los artículos.
- Navegación mejorada desde el logotipo hacia la portada.
- Variable `APP_VERSION` centralizada en la configuración de Flask.

### Cambiado
- Reorganización del menú principal con desplegables para Inicio y Trayectoria Profesional.
- Incorporación de Certificaciones y Cursos al menú de Trayectoria Profesional.
- Mejoras de presentación y estructura HTML en las tarjetas y páginas de proyectos.
- Actualización del pie de página con información de versión y mayor contraste.
- Optimización de la jerarquía de encabezados de la portada y de Proyectos.
- Descripciones de proyectos limitadas visualmente a tres líneas.
- Carga diferida de imágenes en el listado de proyectos.

### Corregido
- Nombres accesibles de los enlaces sociales GitHub y LinkedIn.
- Accesibilidad del botón GitHub en las tarjetas de proyectos.
- Encabezados duplicados y saltos de nivel en la portada.
- Enlace del logotipo que anteriormente apuntaba a `#`.

---

## Versiones anteriores

Las versiones anteriores a `1.8.0` no disponían de un historial
de cambios centralizado. Se conserva su trazabilidad mediante Git.

from flask import Blueprint, render_template, abort, send_from_directory, request
from app.models import Post, Tag, post_tags
from sqlalchemy import select, desc, or_, extract
from ..extensions import db
from mistune import create_markdown
import os

blog_bp = Blueprint(
    "blog",
    __name__,
    url_prefix="/blog",
    template_folder="../templates"
)

md = create_markdown(plugins=[
    'strikethrough',
    'table',
    'task_lists',
    'footnotes',
    'url'
])

@blog_bp.route('/upload/<path:filename>')
def uploaded_file(filename):
    upload_folder = os.path.join(os.getcwd(), 'upload')
    return send_from_directory(upload_folder, filename)


# Listado
@blog_bp.get("/")
def index() -> str:
    # 1. Captura de parámetros de la Request
    page = request.args.get('page', 1, type=int)
    tag_name = request.args.get('tag', type=str)
    search_term = request.args.get('q', type=str)
    month = request.args.get('month', type=int)
    year = request.args.get('year', type=int)
    is_blog = request.args.get('is_blog', type=int)

    # 2. Query Base: Orden descendente por fecha de creación
    query = Post.query.order_by(desc(Post.created_at))

    # 3. Filtros condicionales (Query Building)
    if search_term:
        query = query.filter(
            or_(
                Post.title.ilike(f"%{search_term}%"),
                Post.content.ilike(f"%{search_term}%")
            )
        )

    if tag_name:
        query = query.filter(Post.tags.any(name=tag_name))

    if month and year:
        query = query.filter(
            extract('month', Post.created_at) == month,
            extract('year', Post.created_at) == year
        )

    # 4. Paginación a nivel de base de datos (OFFSET/LIMIT)
    # per_page=10 para balancear carga de red y UI
    pagination = query.paginate(page=page, per_page=10, error_out=False)

    # 5. Datos auxiliares para el sidebar
    # (Solo las etiquetas usadas por post)
    all_tags = Tag.query.join(Tag.posts).distinct().all()

    # 6. GENERACIÓN DEL ÁRBOL DE ARCHIVO (NUEVO)
    # Obtenemos combinaciones únicas de Año y Mes directamente de la DB
    archive_query = db.session.query(
        extract('year', Post.created_at).label('year'),
        extract('month', Post.created_at).label('month')
    ).distinct().order_by(desc('year'), desc('month')).all()

    # Mapeo manual para nombres de meses en español
    month_names = {
        1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
        5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
        9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
    }

    # Estructuramos el árbol: { 2026: [{'num': 5, 'name': 'Mayo'}, ...], 2025: [...] }
    archive_tree = {}
    for y, m in archive_query:
        y_int, m_int = int(y), int(m)
        if y_int not in archive_tree:
            archive_tree[y_int] = []
        archive_tree[y_int].append({
            'num': m_int,
            'name': month_names.get(m_int, "Desconocido")
        })

    return render_template(
        'blog.html',
        posts=pagination.items,
        pagination=pagination,
        tags=all_tags,
        is_blog=is_blog,
        current_tag=tag_name,
        archive_tree=archive_tree,  # Enviamos el árbol al template
        current_month=month,
        current_year=year
    )


# Post Individual
@blog_bp.get("/<string:slug>")
def detail(slug):
    """Retrieves a single post by its slug."""
    query = select(Post).filter_by(slug=slug)
    post = db.session.execute(query).scalar_one_or_none()
    content_html = md(post.content)
    if post is None:
        abort(404)

    return render_template("detail.html", item=post, content_html=content_html)


@blog_bp.route("/tag/<string:name>")
def by_tag(name):
    """Fetches all posts with the given tag."""
    query = (
        select(Post)
        .join(post_tags)
        .join(Tag)
        .filter(Tag.name == name)
        .order_by(Post.created_at.desc())
    )
    posts = db.session.execute(query).scalars().all()
    return render_template("blog.html", posts=posts, tag=name)



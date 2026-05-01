# AGENTS.md

## Project overview

Flask portfolio + blog app with PostgreSQL, Flask-Admin, and i18n (es/en). Python 3.14.

## Directory structure

```
app/
  __init__.py        # create_app factory
  extensions.py      # db, migrate, babel singletons
  models.py          # Project, Post
  admin.py           # Flask-Admin setup (exposes Project)
  routes/
    main.py          # Blueprint "/" → index.html
    blog.py          # Blueprint "/blog" → listing + "/blog/<slug>" → detail
  templates/         # base.html, index.html, blog.html, detail.html, blog_stat.html
  static/            # CSS, JS, vendor libs (Bootstrap, GLightbox, etc.), images
migrations/          # Alembic (managed by Flask-Migrate)
config.py            # Config class, loads from env vars
run.py               # Dev entrypoint (`python run.py`)
wsgi.py              # Prod entrypoint (gunicorn)
```

## Commands

| Action | Command |
|---|---|
| Dev server | `python run.py` (debug=True) |
| Prod server | `gunicorn wsgi:app` |
| Create migration | `flask db migrate -m "message"` |
| Apply migrations | `flask db upgrade` |
| Downgrade | `flask db downgrade <revision>` |
| DB shell | `flask shell` |

**Note:** `flask db` commands require `FLASK_APP=wsgi.py` or `FLASK_APP=run.py` set in env, or rely on the app context from `create_app`.

## Environment

- **`.env`** file is gitignored; create one locally.
- Required env vars:
  - `DATABASE_URL` — defaults to `postgresql://walter:WalexNet@server:5432/portfolio`
  - `SECRET_KEY` — defaults to `"devkey"`
- Uses `python-dotenv` — loads `.env` if present.

## Database

- PostgreSQL via `psycopg2-binary`.
- Models use SQLAlchemy 2.0 style (`Mapped`, `mapped_column`).
- Tables: `project` (implicit), `post` (explicit `__tablename__`).
- Migration history starts with `62fafd99fe66` (initial) → `4403503ed30d` (create Post).

## Key conventions

- Blueprint `template_folder` is set to `"../templates"` relative to each routes file.
- Default locale is `es`; supported: `es`, `en`.
- Blog posts use `slug` as URL key (generated with `python-slugify`).
- Admin panel is mounted at `/admin` (Flask-Admin, name: "Portfolio Admin").

## Testing

No test framework is configured. Add tests alongside features if requested.

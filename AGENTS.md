# AGENTS.md

## Project overview

Flask portfolio + blog app with PostgreSQL, Flask-Admin, and i18n (es/en).

## Commands

| Action | Command |
|---|---|
| Dev server | `python run.py` |
| Prod server | `gunicorn wsgi:app` |
| Create migration | `flask db migrate -m "message"` |
| Apply migrations | `flask db upgrade` |
| Downgrade migration | `flask db downgrade <revision>` |
| DB shell | `flask shell` |

`flask db` commands require `FLASK_APP=run.py` or `FLASK_APP=wsgi.py` set in environment.

## Environment

- `.env` is gitignored; create one locally with:
  - `DATABASE_URL` (defaults to `postgresql://walter:WalexNet@server:5432/portfolio`)
  - `SECRET_KEY` (defaults to `devkey`)
- Uses `python-dotenv` to load `.env`.

## Database

- PostgreSQL via `psycopg2-binary`; SQLAlchemy 2.0 style (`Mapped`, `mapped_column`).
- Tables: `project` (implicit tablename), `post` (explicit `__tablename__`), `tag`, `post_tags` (association).
- Initial migration: `7a637fe61ec2`.

## Key conventions

- Blueprints use `template_folder="../templates"`.
- Supported locales: `es` (default), `en`; `get_locale` has `@babel.localeselector` commented out.
- Blog posts use `slug` (auto-generated via `python-slugify` in admin) as URL key.
- Admin panel at `/admin` exposes Project, Post, Tag views; Post view handles cover image uploads.
- Tags have many-to-many relation to posts; filter posts via `/blog/tag/<name>`.
- Blog markdown rendered with `mistune` (plugins: strikethrough, table, task_lists, footnotes, url).
- Uploaded files served at `/blog/upload/<filename>`.

## Testing

No test framework configured. Add tests alongside features if requested.

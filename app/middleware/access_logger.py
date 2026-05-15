from flask import request, g
import time
from user_agents import parse
from datetime import datetime, timezone
from app.models import AccessLog
from app.extensions import db

EXCLUDED_PREFIXES = (
    "/static",
    "/favicon.ico",
    "/robots.txt",
    "/health",
    "/ping",
    "/blog/upload/img",
    "/admin/static",
)


def start_timer():
    g.start_time = time.time()


def log_request(response):
    try:
        #  FILTRO CENTRALIZADO
        if request.path.startswith(EXCLUDED_PREFIXES):
            return response

        duration = int((time.time() - g.start_time) * 1000)

        ua = parse(request.headers.get("User-Agent", ""))

        ip = request.headers.get("X-Forwarded-For", request.remote_addr)
        if ip:
            ip = ip.split(",")[0].strip()

        log = AccessLog(
            ip=ip,
            method=request.method,
            path=request.path,
            status_code=response.status_code,
            response_time_ms=duration,
            user_agent=request.headers.get("User-Agent"),
            referer=request.referrer,
            browser=ua.browser.family,
            os=ua.os.family,
            device="mobile" if ua.is_mobile else "desktop"
        )

        db.session.add(log)
        db.session.commit()

    except Exception:
        db.session.rollback()

    return response

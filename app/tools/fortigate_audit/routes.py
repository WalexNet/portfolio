"""Rutas protegidas para auditar y comparar copias de FortiOS."""
import difflib
import hashlib
import json
import os
import re
import secrets
import uuid
from datetime import datetime, timezone
from pathlib import Path
from flask import Blueprint, current_app, flash, redirect, render_template, request, session, url_for, abort
from flask_login import login_required, current_user
from .engine import audit, ParseError

fortigate_audit_bp = Blueprint('fortigate_audit', __name__, url_prefix='/tools/fortigate-audit')
MAX_BYTES = 4 * 1024 * 1024

def _root():
    return Path(current_app.config['UPLOAD_FOLDER']).resolve() / 'fortigate_audit'

def _owner():
    return str(current_user.get_id())

def _csrf():
    if 'fortigate_audit_csrf' not in session:
        session['fortigate_audit_csrf'] = secrets.token_urlsafe(32)
    return session['fortigate_audit_csrf']

def _validate_csrf():
    if not secrets.compare_digest(str(request.form.get('csrf_token', '')), _csrf()):
        abort(400, 'Token de formulario incorrecto')

def _record(rec_id):
    try:
        uuid.UUID(rec_id)
    except (ValueError, AttributeError):
        abort(404)
    folder = _root() / rec_id
    try:
        meta = json.loads((folder / 'metadata.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        abort(404)
    if meta.get('owner') != _owner():
        abort(404)
    return folder, meta

def _records():
    root = _root()
    if not root.is_dir():
        return []
    result=[]
    for folder in root.iterdir():
        if not folder.is_dir():
            continue
        try:
            rec_id=str(uuid.UUID(folder.name))
            data=json.loads((folder/'metadata.json').read_text(encoding='utf-8'))
            if data.get('owner')==_owner() and data.get('id')==rec_id:
                result.append(data)
        except (ValueError,OSError):
            continue
    return sorted(result,key=lambda x:x.get('created',''),reverse=True)

@fortigate_audit_bp.get('/')
@login_required
def index():
    return render_template('tools/fortigate_audit/index.html', records=_records(), token=_csrf(), report=None, comparison=None)

@fortigate_audit_bp.post('/upload')
@login_required
def upload():
    _validate_csrf()
    item=request.files.get('configuration')
    if not item or not item.filename or Path(item.filename).suffix.lower() not in ('.conf','.txt','.cfg'):
        flash('Selecciona un archivo .conf, .txt o .cfg.', 'warning')
        return redirect(url_for('.index'))
    raw=item.stream.read(MAX_BYTES+1)
    if len(raw)>MAX_BYTES:
        flash('El archivo supera los 4 MiB permitidos.', 'warning')
        return redirect(url_for('.index'))
    if b'\0' in raw:
        flash('No se permiten archivos binarios.', 'warning')
        return redirect(url_for('.index'))
    try:
        source=raw.decode('utf-8-sig')
        report=audit(source)
    except (UnicodeError,ParseError,ValueError) as exc:
        flash(f'No se pudo analizar el archivo: {exc}', 'warning')
        return redirect(url_for('.index'))
    identifier=str(uuid.uuid4())
    root=_root()
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    folder=root/identifier
    folder.mkdir(mode=0o700)
    os.chmod(folder,0o700)
    meta={
        'id':identifier,'owner':_owner(),'filename':Path(item.filename).name[:180],
        'created':datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'sha256':hashlib.sha256(raw).hexdigest(), 'size':len(raw), 'report':report,
    }
    original=folder/'original.conf'
    with original.open('xb') as stream:
        stream.write(raw)
    os.chmod(original,0o600)
    metadata=folder/'metadata.json'
    with metadata.open('x',encoding='utf-8') as stream:
        json.dump(meta,stream,ensure_ascii=False)
    os.chmod(metadata,0o600)
    return redirect(url_for('.detail',rec_id=identifier))

@fortigate_audit_bp.get('/report/<rec_id>')
@login_required
def detail(rec_id):
    _,rec=_record(rec_id)
    return render_template('tools/fortigate_audit/index.html',records=_records(),token=_csrf(),report=rec,comparison=None)

@fortigate_audit_bp.post('/compare')
@login_required
def compare():
    _validate_csrf()
    left_id=request.form.get('before','')
    right_id=request.form.get('after','')
    if left_id==right_id:
        flash('Selecciona dos versiones distintas.', 'warning')
        return redirect(url_for('.index'))
    old_dir,old=_record(left_id)
    new_dir,new=_record(right_id)
    if old['report']['hostname']!=new['report']['hostname']:
        flash('Las configuraciones pertenecen a equipos con distinto hostname.', 'warning')
        return redirect(url_for('.index'))
    before=(old_dir/'original.conf').read_text(encoding='utf-8-sig')
    after=(new_dir/'original.conf').read_text(encoding='utf-8-sig')
    diff=[]
    total=0
    # Restringir HTML y memoria de la respuesta; no enviar miles de líneas al cliente.
    for line in difflib.unified_diff(before.splitlines(),after.splitlines(),fromfile='Anterior',tofile='Nueva',n=2):
        total+=1
        if len(diff)<350:
            # No mostrar valores secretos en la comparación HTML.
            if re.search(r'\bset\s+[^\s]*(?:password|passwd|secret|key|pwd|private-key|token|community)[^\s]*\s', line, flags=re.IGNORECASE):
                line='[Parámetro sensible: valor oculto]'
            diff.append(line[:800])
    previous={r['id']:r for r in old['report']['rules']}
    changes=[]
    for rule in new['report']['rules']:
        original=previous[rule['id']]
        if rule['status']!=original['status']:
            changes.append({'name':rule['name'],'before':original['status'],'after':rule['status']})
    comparison={'before':old,'after':new,'changes':changes,'lines':diff,'total':total,'truncated':total>len(diff)}
    return render_template('tools/fortigate_audit/index.html',records=_records(),token=_csrf(),report=None,comparison=comparison)

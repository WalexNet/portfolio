"""Auditoría estática FortiOS. No ejecuta comandos ni contacta dispositivos."""
import re
import shlex
from pathlib import Path

WEIGHTS = [40,10,5,5,5,5,5,5,4,4,4,4,2,2]
NAMES = [
    'Políticas Any Any', 'Perfiles de seguridad en salida', 'Deny BlackList',
    'Deny Malicious Countries', 'ClearPass', 'Red de confianza administrativa',
    'Acceso HTTPS por interfaces', 'SNMP', 'Syslog', 'NTP',
    'Puerto HTTPS administrativo', 'Alta disponibilidad', 'FortiManager', 'FortiAnalyzer',
]
# Perfil histórico del script aportado. No es un estándar de seguridad general.
PROFILE = {
    'radius_servers': ('radius1.central.cirsa.com','radius2.central.cirsa.com','radius3.central.cirsa.com','radius4.central.cirsa.com'),
    'ntp_servers': ('1.es.pool.ntp.org','2.es.pool.ntp.org','3.es.pool.ntp.org','4.es.pool.ntp.org'),
    'trusted_network': '10.0.0.0 255.0.0.0',
    'management_port': '8443', 'https_interface_count': 2,
    'fortimanager_ip': '10.146.66.5', 'fortianalyzer_ip': '10.146.66.4',
    'ha_hb_priority': '150', 'ha_priority': '200',
    'internet_interface_token': 'inter',
}

class ParseError(ValueError):
    pass

def _identifier(value):
    try:
        parts = shlex.split(value, posix=True)
    except ValueError:
        return value.strip().strip('"')
    return ' '.join(parts)

def parse_config(text):
    root = {}
    stack = [(None, root)]
    for number, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        verb, _, rest = line.partition(' ')
        if verb == 'config' and rest:
            name = 'config ' + rest
            current = stack[-1][1]
            child = current.setdefault(name, {})
            if not isinstance(child, dict):
                raise ParseError(f'Línea {number}: bloque duplicado incompatible')
            stack.append(('config', child))
        elif verb == 'edit' and rest:
            current = stack[-1][1]
            name = _identifier(rest)
            child = current.setdefault(name, {})
            if not isinstance(child, dict):
                raise ParseError(f'Línea {number}: entrada incompatible')
            stack.append(('edit', child))
        elif verb == 'set' and rest:
            key, sep, value = rest.partition(' ')
            if sep:
                stack[-1][1][key] = value.strip()
        elif verb == 'unset' and rest:
            stack[-1][1].pop(rest.strip(), None)
        elif verb in ('end', 'next') and not rest:
            required = 'config' if verb == 'end' else 'edit'
            if len(stack) == 1 or stack[-1][0] != required:
                raise ParseError(f'Línea {number}: {verb} sin bloque {required}')
            stack.pop()
        # FortiOS incluye otras instrucciones; no evaluarlas como set.
    if len(stack) != 1:
        raise ParseError('Configuración incompleta: bloques config/edit sin cerrar')
    if not root or 'config system global' not in root:
        raise ParseError('No se reconoce una configuración FortiOS completa (falta system global)')
    return root

def clean(raw):
    return _identifier(raw) if isinstance(raw, str) else ''

def tokens(raw):
    try:
        return shlex.split(raw) if raw else []
    except ValueError:
        return raw.split() if raw else []

def section(root, key):
    value = root.get(key, {})
    return value if isinstance(value, dict) else {}

def entries(root, key):
    return {k:v for k,v in section(root,key).items() if isinstance(v,dict)}

def audit(text):
    data = parse_config(text)
    policies = entries(data, 'config firewall policy')
    interfaces = entries(data, 'config system interface')
    admins = entries(data, 'config system admin')
    radius = entries(data, 'config user radius')
    glob = section(data, 'config system global')
    results=[]
    def add(index, status, details, note=''):
        results.append({'id':index+1,'name':NAMES[index],'points':WEIGHTS[index],
                        'status':status,'details':details[:300], 'total_details':len(details), 'note':note})

    # Detectar únicamente políticas accept activas con servicio ALL y algún extremo ALL.
    issues=[]
    for pid,p in policies.items():
        if clean(p.get('status','enable')) == 'disable' or clean(p.get('action','deny')) != 'accept':
            continue
        if 'ALL' not in [x.upper() for x in tokens(p.get('service',''))]:
            continue
        if 'all' in [x.lower() for x in tokens(p.get('srcaddr',''))] or 'all' in [x.lower() for x in tokens(p.get('dstaddr',''))]:
            issues.append(f'ID {pid}: {clean(p.get("name", "Sin nombre"))}')
    add(0, 'fail' if issues else ('pass' if policies else 'unknown'), issues, 'Reglas accept activas con servicio ALL y dirección de origen o destino all')

    # Heurística histórica, NO identifica necesariamente tráfico de Internet.
    issues=[]
    for pid,p in policies.items():
        if clean(p.get('status','enable')) == 'disable' or clean(p.get('action','deny')) != 'accept':
            continue
        if PROFILE['internet_interface_token'] not in clean(p.get('dstintf','')).lower():
            continue
        missing=[k for k in ('ssl-ssh-profile','av-profile','ips-sensor','application-list') if not p.get(k)]
        if missing:
            issues.append(f'ID {pid}: faltan {", ".join(missing)}')
    add(1,'fail' if issues else ('pass' if policies else 'unknown'), issues, 'Heurística heredada: destino contiene "inter"; requiere revisión')

    for idx,group in ((2,'Blacklist-Ips'), (3,'GRP_Malicious_Countries')):
        matches=[]
        for pid,p in policies.items():
            if clean(p.get('status','enable'))=='disable':continue
            if group in tokens(p.get('srcaddr','')) or group in tokens(p.get('dstaddr','')):
                matches.append((pid,clean(p.get('action','deny'))))
        bad=[f'ID {pid}: action {action}' for pid,action in matches if action!='deny']
        add(idx,'fail' if bad else ('pass' if matches else 'unknown'),bad,
            'Sin reglas coincidentes: no evaluable' if not matches else f'{len(matches)} políticas coincidentes')

    cp=radius.get('ClearPass Admin',{})
    cp_ok=clean(cp.get('server','')) in PROFILE['radius_servers'] and clean(cp.get('secondary-server','')) in PROFILE['radius_servers']
    add(4, 'pass' if cp_ok else 'fail', [] if cp_ok else ['Servidor RADIUS ClearPass no coincide con el perfil histórico'])
    adm=admins.get('Radius_Access',{})
    has_trust=any(k.startswith('trusthost') and clean(v)==PROFILE['trusted_network'] for k,v in adm.items() if isinstance(v,str))
    add(5,'pass' if has_trust else 'fail',[] if has_trust else ['No se encontró la red de confianza configurada en el perfil'])
    https_int=[name for name,it in interfaces.items() if 'https' in tokens(it.get('allowaccess','')) and clean(it.get('status','up'))!='down']
    count_ok=len(https_int)==PROFILE['https_interface_count']
    add(6,'pass' if count_ok else 'fail',[f'{len(https_int)} interfaces: '+', '.join(https_int)],'Se comprueba exactamente el número esperado; conviene revisar exposición y trusted hosts')
    snmp=section(data,'config system snmp sysinfo')
    add(7,'pass' if clean(snmp.get('status',''))=='enable' else 'fail',[] if clean(snmp.get('status',''))=='enable' else ['SNMP no figura habilitado explícitamente'])
    syslog=section(data,'config log syslogd setting')
    add(8,'pass' if clean(syslog.get('status',''))=='enable' else 'fail',[] if clean(syslog.get('status',''))=='enable' else ['Syslog no figura habilitado explícitamente'])
    ntp=entries(section(data,'config system ntp'),'config ntpserver')
    ntp_ok=len(ntp)==4 and all(clean(v.get('server','')) in PROFILE['ntp_servers'] for v in ntp.values())
    add(9,'pass' if ntp_ok else 'fail',[] if ntp_ok else [f'Servidores NTP detectados: {len(ntp)}'])
    port=clean(glob.get('admin-sport',''))
    add(10,'pass' if port==PROFILE['management_port'] else 'fail',[] if port==PROFILE['management_port'] else [f'Puerto configurado explícitamente: {port or "no presente"}'])
    ha=section(data,'config system ha')
    hb=tokens(ha.get('hbdev',''))
    ha_ok=len(hb)>=2 and hb[1]==PROFILE['ha_hb_priority'] and clean(ha.get('priority',''))==PROFILE['ha_priority']
    add(11,'pass' if ha_ok else ('unknown' if clean(ha.get('mode','')) in ('','standalone') else 'fail'),[] if ha_ok else ['Parámetros HA diferentes del perfil histórico'])
    fmg=section(data,'config system central-management')
    fmg_ok=clean(fmg.get('type',''))=='fortimanager' and clean(fmg.get('fmg',''))==PROFILE['fortimanager_ip']
    add(12,'pass' if fmg_ok else 'fail',[] if fmg_ok else ['FortiManager no coincide con el perfil histórico'])
    faz=section(data,'config log fortianalyzer setting')
    faz_ok=clean(faz.get('status',''))=='enable' and clean(faz.get('server',''))==PROFILE['fortianalyzer_ip']
    add(13,'pass' if faz_ok else 'fail',[] if faz_ok else ['FortiAnalyzer no coincide con el perfil histórico'])

    header=text.splitlines()[0] if text.splitlines() else ''
    version=re.search(r'#config-version=([^:]+)',header)
    score=sum(r['points'] for r in results if r['status']=='pass')
    assessed=sum(r['points'] for r in results if r['status'] in ('pass','fail'))
    return {'hostname':clean(glob.get('hostname','')),'version':version.group(1) if version else 'Desconocida',
            'score':score,'assessed_points':assessed,'max_points':100,'rules':results,
            'policy_count':len(policies),'interface_count':len(interfaces),
            'warnings':['Perfil corporativo histórico: resultados orientativos, no certificación de seguridad.']}

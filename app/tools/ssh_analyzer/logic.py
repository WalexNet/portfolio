"""Análisis estático orientativo de sshd_config, sin ejecutar comandos ni red."""
import re
from collections import Counter

MAX_BYTES = 256 * 1024
MAX_LINES = 5000
MAX_FINDINGS = 250
KEY_RE = re.compile(r"^[A-Za-z][A-Za-z0-9]*$")
SEVERITIES = {"high": "Alta", "medium": "Media", "low": "Baja", "info": "Información"}


def _finding(items, severity, title, explanation, recommendation, line=None):
    if len(items) < MAX_FINDINGS:
        items.append({"severity": severity, "title": title, "explanation": explanation,
                      "recommendation": recommendation, "line": line})


def analyze_config(content: str) -> dict:
    if not isinstance(content, str) or not content.strip():
        raise ValueError("Pega el contenido de sshd_config o carga un archivo de texto.")
    if len(content.encode("utf-8")) > MAX_BYTES:
        raise ValueError("El archivo supera el límite de 256 KiB.")
    lines = content.splitlines()
    if len(lines) > MAX_LINES:
        raise ValueError("El archivo supera el límite de 5000 líneas.")
    if "\x00" in content:
        raise ValueError("El archivo contiene caracteres NUL y no parece un sshd_config de texto.")

    findings, directives, matches, includes, invalid = [], [], [], [], []
    match_context = None
    for n, raw in enumerate(lines, 1):
        stripped = raw.strip()
        if not stripped or stripped.startswith("#"):
            continue
        # sshd_config soporta 'Keyword value' y 'Keyword=value'. Los # en valores
        # no se eliminan para evitar alterar rutas o argumentos entrecomillados.
        m = re.match(r"^([A-Za-z][A-Za-z0-9]*)(?:\s*=\s*|\s+)(.*?)\s*$", stripped)
        if not m or not m.group(2).strip():
            invalid.append(n)
            continue
        key, value = m.group(1).lower(), m.group(2).strip()
        if not KEY_RE.fullmatch(key):
            invalid.append(n)
            continue
        if key == "match":
            match_context = value
            matches.append({"line": n, "condition": value})
            continue
        entry = {"key": key, "value": value, "line": n, "scope": match_context or "global"}
        directives.append(entry)
        if key == "include":
            includes.append(entry)

    globals_ = {}
    for item in directives:
        if item["scope"] == "global":
            globals_.setdefault(item["key"], []).append(item)
    # OpenSSH utiliza el primer valor obtenido para numerosas directivas. Evitamos
    # inferir estado efectivo cuando Include o Match alteran el análisis.
    first = {k: v[0] for k, v in globals_.items()}

    for line in invalid[:15]:
        _finding(findings, "medium", "Línea no reconocida", "No se pudo interpretar esta línea como una directiva de OpenSSH.", "Comprueba la sintaxis con sshd -t en el servidor de destino.", line)
    if len(invalid) > 15:
        _finding(findings, "info", "Más líneas sin interpretar", f"Hay {len(invalid) - 15} líneas adicionales con formato no reconocido.", "Revisa el archivo completo con sshd -t.")
    if includes:
        _finding(findings, "info", "Archivos Include no resueltos", f"Se detectaron {len(includes)} directivas Include. No se cargan los archivos externos.", "Comprueba los archivos incluidos y usa sshd -T -C en el servidor para consultar la configuración efectiva.", includes[0]["line"])
    if matches:
        _finding(findings, "info", "Bloques Match presentes", f"Se detectaron {len(matches)} bloques Match. Sus parámetros dependen del usuario, origen y conexión.", "Verifica cada escenario con sshd -T -C user=...,host=...,addr=... en el servidor.", matches[0]["line"])

    def check(key, bad, severity, title, reason, remedy):
        item = first.get(key)
        if item and bad(item["value"].lower()):
            _finding(findings, severity, title, reason, remedy, item["line"])

    check("permitrootlogin", lambda v: v == "yes", "high", "Acceso directo de root habilitado", "PermitRootLogin yes permite iniciar sesión SSH directamente como root.", "Usa PermitRootLogin no cuando sea viable y eleva privilegios mediante sudo.")
    check("permitemptypasswords", lambda v: v == "yes", "high", "Contraseñas vacías permitidas", "PermitEmptyPasswords yes admite cuentas sin contraseña en ciertos escenarios.", "Configura PermitEmptyPasswords no.")
    check("passwordauthentication", lambda v: v == "yes", "medium", "Autenticación mediante contraseña habilitada", "Puede facilitar ataques de fuerza bruta si el servicio está expuesto.", "Valora PasswordAuthentication no después de verificar el acceso por claves.")
    check("kbdinteractiveauthentication", lambda v: v == "yes", "medium", "Autenticación interactiva habilitada", "Puede admitir autenticación mediante contraseñas o PAM según el entorno.", "Revisa los mecanismos PAM y desactívala solo si no es necesaria.")
    check("challengeresponseauthentication", lambda v: v == "yes", "medium", "ChallengeResponseAuthentication habilitado", "Es un alias histórico de autenticación interactiva en algunas versiones.", "Comprueba la versión y revisa KbdInteractiveAuthentication y PAM.")
    check("pubkeyauthentication", lambda v: v == "no", "medium", "Autenticación por clave pública deshabilitada", "Se impide el acceso mediante claves públicas, habitual en políticas SSH endurecidas.", "Valora PubkeyAuthentication yes y configura claves autorizadas.")
    check("x11forwarding", lambda v: v == "yes", "low", "Reenvío X11 habilitado", "Amplía la superficie disponible en sesiones con aplicaciones gráficas.", "Configura X11Forwarding no si no utilizas aplicaciones X11 remotas.")
    check("allowtcpforwarding", lambda v: v in ("yes", "all", "local", "remote"), "low", "Reenvío TCP permitido", "Permite túneles TCP según el modo establecido.", "Restringe AllowTcpForwarding si los túneles no forman parte del servicio.")
    check("allowagentforwarding", lambda v: v == "yes", "low", "Reenvío del agente SSH habilitado", "El agente reenviado puede quedar accesible desde el equipo remoto mientras dure la sesión.", "Usa AllowAgentForwarding no cuando no sea necesario.")
    check("gatewayports", lambda v: v in ("yes", "clientspecified"), "medium", "Puertos reenviados expuestos", "GatewayPorts puede permitir que puertos remotos reenviados escuchen en interfaces no locales.", "Utiliza GatewayPorts no salvo necesidad expresa.")
    check("strictmodes", lambda v: v == "no", "medium", "Comprobación de permisos desactivada", "StrictModes no relaja la verificación de permisos de rutas y claves autorizadas.", "Configura StrictModes yes.")
    check("ignorerhosts", lambda v: v == "no", "medium", "Archivos .rhosts no ignorados", "Permite considerar mecanismos de confianza antiguos si están habilitados.", "Configura IgnoreRhosts yes.")
    check("hostbasedauthentication", lambda v: v == "yes", "medium", "Autenticación basada en host permitida", "La confianza entre hosts requiere control estricto de las claves y equipos.", "Desactívala si no hay un diseño de confianza entre hosts documentado.")
    check("loglevel", lambda v: v == "quiet", "medium", "Registro SSH insuficiente", "LogLevel QUIET reduce la información disponible para auditoría.", "Considera LogLevel VERBOSE o INFO según tus requisitos de registro.")
    check("permituserenvironment", lambda v: v in ("yes", "true") or v.startswith("yes "), "medium", "Variables de entorno controladas por usuario", "PermitUserEnvironment puede permitir variables que afecten al entorno de ejecución.", "Usa PermitUserEnvironment no, salvo necesidad controlada.")
    check("usedns", lambda v: v == "yes", "info", "Búsquedas DNS inversas activadas", "UseDNS yes puede añadir latencia a ciertas conexiones.", "Comprueba si necesitas validación DNS inversa en tu despliegue.")
    for key, entries in globals_.items():
        if len(entries) > 1 and key not in {"port", "listenaddress", "hostkey", "acceptenv", "allowusers", "allowgroups", "denyusers", "denygroups", "authenticationmethods", "authorizedkeysfile", "subsystem", "permitopen", "permitlisten", "setenv", "hostcertificate"}:
            _finding(findings, "low", f"Directiva global repetida: {key}", f"Hay {len(entries)} apariciones. En OpenSSH el orden y las excepciones importan; no se deben asumir sobrescrituras por última aparición.", "Revisa la primera aparición y contrasta el valor efectivo con sshd -T.", entries[1]["line"])
    for item in directives:
        if item["scope"] != "global" and item["key"] in {"permitrootlogin", "passwordauthentication", "pubkeyauthentication", "permitopen", "allowtcpforwarding", "x11forwarding", "authenticationmethods", "forcecommand", "allowagentforwarding"}:
            _finding(findings, "info", f"Excepción Match: {item['key']}", f"Línea en bloque Match ({item['scope']}). El valor puede cambiar por conexión.", "Verifica el contexto con sshd -T -C antes de aplicar cambios.", item["line"])
    if not directives:
        _finding(findings, "medium", "Sin directivas activas", "El contenido solo contiene comentarios o líneas sin interpretar.", "Proporciona un sshd_config con directivas activas.")
    scores = Counter(f["severity"] for f in findings)
    return {"summary": {"directives": len(directives), "global_directives": sum(1 for d in directives if d["scope"] == "global"),
                        "match_blocks": len(matches), "includes": len(includes), "unparsed_lines": len(invalid),
                        "high": scores["high"], "medium": scores["medium"], "low": scores["low"], "info": scores["info"]},
            "findings": findings, "directives": directives,
            "limitations": "Análisis estático y parcial: no valida semántica según versión, no resuelve Include, ni calcula ajustes por Match o valores por defecto. No sustituye sshd -t ni sshd -T."}

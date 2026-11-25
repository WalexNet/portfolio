"""Offline best-effort Compose linting; not a replacement for `docker compose config`."""
import re
from collections import defaultdict
from ipaddress import ip_address
import yaml

MAX_BYTES = 200_000
KEYS = {'name', 'services', 'networks', 'volumes', 'configs', 'secrets', 'version', 'include', 'models'}
VAR = re.compile(r'\$\{[^}]+\}')
PORT = re.compile(r'^(?:(?P<host>[^:]+):)?(?P<target>\d{1,5})(?:/(?P<proto>tcp|udp|sctp))?$', re.I)

class UniqueKeyLoader(yaml.SafeLoader):
    pass

def construct_mapping(loader, node):
    loader.flatten_mapping(node)
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=True)
        if not isinstance(key, (str, int, float, bool, tuple)):
            raise yaml.constructor.ConstructorError(None, None, 'Clave YAML no válida', key_node.start_mark)
        if key in mapping:
            raise yaml.constructor.ConstructorError(None, None, f'Clave duplicada: {key}', key_node.start_mark)
        mapping[key] = loader.construct_object(value_node, deep=True)
    return mapping

UniqueKeyLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, construct_mapping)


def analyze_compose(source):
    findings = []
    def add(level, code, path, message):
        findings.append({'level': level, 'code': code, 'path': str(path), 'message': message})

    if not isinstance(source, str) or not source.strip():
        add('error', 'EMPTY', 'compose', 'Introduce una configuración YAML.')
        return result(findings, 0)
    if len(source.encode('utf-8')) > MAX_BYTES:
        add('error', 'SIZE', 'compose', 'Límite de 200 KB por análisis.')
        return result(findings, 0)
    try:
        data = yaml.load(source, Loader=UniqueKeyLoader)
    except yaml.YAMLError as exc:
        mark = getattr(exc, 'problem_mark', None)
        where = f'Línea {mark.line + 1}, columna {mark.column + 1}' if mark else 'YAML'
        add('error', 'YAML', where, str(getattr(exc, 'problem', exc)))
        return result(findings, 0)
    except (ValueError, TypeError, RecursionError) as exc:
        add('error', 'YAML', 'compose', f'No se pudo interpretar el YAML: {type(exc).__name__}')
        return result(findings, 0)
    if not isinstance(data, dict):
        add('error', 'ROOT', 'compose', 'La raíz debe ser un objeto YAML.')
        return result(findings, 0)
    for key in data:
        if not isinstance(key, str):
            add('error', 'ROOT_KEY', 'compose', 'Las claves principales deben ser texto.')
        elif key not in KEYS and not key.startswith('x-'):
            add('warning', 'ROOT_UNKNOWN', key, 'Clave principal no habitual; revisa la especificación Compose.')
    if 'version' in data:
        add('info', 'VERSION', 'version', 'La propiedad version es obsoleta en Docker Compose actual; puede eliminarse.')
    services = data.get('services')
    if not isinstance(services, dict) or not services:
        add('error', 'SERVICES', 'services', 'services debe contener al menos un servicio.')
        return result(findings, 0)
    for section in ('networks', 'volumes', 'secrets', 'configs'):
        if section in data and not isinstance(data[section], dict):
            add('error', 'SECTION', section, 'La sección debe ser un mapa.')
    networks = data.get('networks', {}) if isinstance(data.get('networks', {}), dict) else {}
    volumes = data.get('volumes', {}) if isinstance(data.get('volumes', {}), dict) else {}
    secrets = data.get('secrets', {}) if isinstance(data.get('secrets', {}), dict) else {}
    configs = data.get('configs', {}) if isinstance(data.get('configs', {}), dict) else {}
    occupied = defaultdict(list)
    dependency_graph = {}
    for name, service in services.items():
        path = f'services.{name}'
        if not isinstance(name, str) or not name:
            add('error', 'NAME', path, 'El nombre del servicio debe ser texto no vacío.')
            continue
        if not isinstance(service, dict):
            add('error', 'SERVICE_TYPE', path, 'La definición del servicio debe ser un objeto.')
            continue
        if not service.get('image') and not service.get('build') and not service.get('extends') and not service.get('provider'):
            add('warning', 'IMAGE', path, 'No declara image, build, extends ni provider.')
        image = service.get('image')
        if isinstance(image, str) and (image.endswith(':latest') or ':' not in image.rsplit('/', 1)[-1] and '@sha256:' not in image):
            add('warning', 'LATEST', path + '.image', 'Imagen sin versión fija: considera utilizar un tag específico o digest.')
        if service.get('privileged') is True:
            add('warning', 'PRIVILEGED', path + '.privileged', 'privileged habilita privilegios elevados.')
        if service.get('network_mode') == 'host':
            add('warning', 'HOST_NET', path + '.network_mode', 'La red host reduce el aislamiento de red.')
        if service.get('pid') == 'host':
            add('warning', 'HOST_PID', path + '.pid', 'Compartir el espacio de procesos del host reduce el aislamiento.')
        if service.get('user') in (None, '0', 'root'):
            add('info', 'USER', path + '.user', 'Comprueba si este servicio puede ejecutarse como usuario no privilegiado.')
        if service.get('restart') == 'always':
            add('info', 'RESTART', path + '.restart', 'Valora unless-stopped si deseas respetar detenciones manuales.')
        if service.get('read_only') is not True:
            add('info', 'READ_ONLY', path + '.read_only', 'Considera read_only: true cuando el servicio lo permita.')
        depends = service.get('depends_on', [])
        if not isinstance(depends, (list, dict)):
            add('error', 'DEPENDS_TYPE', path + '.depends_on', 'depends_on debe ser una lista o un mapa.')
            depends = []
        deps = list(depends)
        dependency_graph[name] = []
        for dep in deps:
            if not isinstance(dep, str):
                add('error', 'DEPENDS_NAME', path, 'Las dependencias deben tener nombres de servicio.')
                continue
            dependency_graph[name].append(dep)
            if dep not in services:
                add('error', 'DEPENDS_MISSING', path + '.depends_on', f'No existe el servicio dependiente {dep}.')
            if dep == name:
                add('error', 'DEPENDS_SELF', path + '.depends_on', 'Un servicio no puede depender de sí mismo.')
            if isinstance(depends, dict) and isinstance(depends[dep], dict) and depends[dep].get('condition') == 'service_healthy':
                target = services.get(dep)
                if isinstance(target, dict) and 'healthcheck' not in target:
                    add('warning', 'HEALTH', path + '.depends_on', f'{dep} no define healthcheck para service_healthy.')
        for section, declarations in (('networks', networks), ('secrets', secrets), ('configs', configs)):
            refs = service.get(section, [])
            if isinstance(refs, dict):
                refs = list(refs)
            if not isinstance(refs, list):
                add('error', 'REF_TYPE', path + '.' + section, 'Debe ser una lista o mapa.')
                continue
            for entry in refs:
                ref = entry.get('source') if isinstance(entry, dict) else entry
                if isinstance(ref, str) and ref not in declarations and not (section == 'networks' and ref == 'default'):
                    add('error', 'REF_MISSING', path + '.' + section, f'{section}: {ref} no está declarado.')
        mounts = service.get('volumes', [])
        if not isinstance(mounts, list):
            add('error', 'VOLUMES_TYPE', path + '.volumes', 'volumes debe ser una lista.')
        else:
            for mount in mounts:
                source_mount = ''
                if isinstance(mount, str):
                    chunks = mount.split(':')
                    if len(chunks) >= 2:
                        source_mount = chunks[0]
                elif isinstance(mount, dict) and mount.get('type') == 'volume':
                    source_mount = mount.get('source', '')
                if source_mount and not source_mount.startswith(('.', '/', '~', '$')) and source_mount not in volumes:
                    add('error', 'VOLUME_MISSING', path + '.volumes', f'Volumen con nombre no declarado: {source_mount}.')
                if isinstance(mount, str) and ('/var/run/docker.sock' in mount):
                    add('warning', 'SOCKET', path + '.volumes', 'Montar docker.sock da acceso sensible al daemon Docker.')
        ports = service.get('ports', [])
        if not isinstance(ports, list):
            add('error', 'PORTS_TYPE', path + '.ports', 'ports debe ser una lista.')
        else:
            for port in ports:
                if isinstance(port, int):
                    port = str(port)
                if isinstance(port, dict):
                    published = port.get('published')
                    if published is None:
                        continue
                    host_ip = str(port.get('host_ip', '*'))
                    proto = str(port.get('protocol', 'tcp'))
                    port_string = str(published)
                elif isinstance(port, str):
                    if VAR.search(port) or '-' in port:
                        add('info', 'PORT_DYNAMIC', path + '.ports', f'Puerto dinámico/rango {port}: no se comprueban colisiones.')
                        continue
                    p = port.rsplit(':', 1)
                    if len(p) == 1:
                        continue  # only container port
                    left, right = p
                    proto = right.split('/')[-1] if '/' in right else 'tcp'
                    if left.startswith('[') and ']:' in port:
                        host_ip, port_string = left.rsplit(']:', 1) if ']:' in left else ('*', left)
                    else:
                        host_ip, port_string = ('*', left) if left.isdigit() else (left.rsplit(':', 1)[0], left.rsplit(':', 1)[-1])
                else:
                    add('error', 'PORT_TYPE', path + '.ports', 'Entrada de puerto no válida.')
                    continue
                if not port_string.isdigit() or not 1 <= int(port_string) <= 65535:
                    add('error', 'PORT', path + '.ports', f'Puerto publicado no válido: {port_string}.')
                    continue
                if host_ip in ('0.0.0.0', '::', ''):
                    host_ip = '*'
                occupied[(host_ip, int(port_string), proto.lower())].append(name)
                if host_ip == '*':
                    add('info', 'EXPOSURE', path + '.ports', f'El puerto {port_string}/{proto} se publica en todas las interfaces.')
        env = service.get('environment', {})
        if not isinstance(env, (list, dict)):
            add('error', 'ENV_TYPE', path + '.environment', 'environment debe ser un mapa o lista.')
        if isinstance(env, dict):
            for key, value in env.items():
                if any(token in str(key).upper() for token in ('PASSWORD', 'TOKEN', 'SECRET', 'PRIVATE_KEY')) and value is not None and str(value) and not VAR.search(str(value)):
                    add('warning', 'SECRET_ENV', path + '.environment.' + str(key), 'Posible secreto literal en el YAML; usa variables o Docker secrets.')
    visited, stack = set(), set()
    def visit(n):
        if n in stack:
            add('error', 'DEPENDS_CYCLE', 'services.' + n, 'Existe un ciclo de dependencias.')
            return
        if n in visited:
            return
        visited.add(n)
        stack.add(n)
        for dep in dependency_graph.get(n, []):
            if dep in dependency_graph:
                visit(dep)
        stack.remove(n)
    for n in dependency_graph:
        visit(n)
    for (host, number, proto), names in occupied.items():
        if len(set(names)) > 1:
            add('error', 'PORT_COLLISION', 'services.*.ports', f'Puerto publicado {host}:{number}/{proto} repetido en {", ".join(sorted(set(names)))}.')
    return result(findings, len(services))


def result(findings, count):
    return {'findings': findings, 'services': count,
            'errors': sum(f['level'] == 'error' for f in findings),
            'warnings': sum(f['level'] == 'warning' for f in findings),
            'infos': sum(f['level'] == 'info' for f in findings)}

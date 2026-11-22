"""Pure network calculations for the CIDR route summarizer."""
from __future__ import annotations

import ipaddress
import re

MAX_NETWORKS = 256
MAX_INPUT_CHARS = 16000


def _display(network):
    return str(network)


def analyze(raw: str) -> dict:
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError('Introduce al menos una red en notación CIDR.')
    if len(raw) > MAX_INPUT_CHARS:
        raise ValueError('El texto de entrada es demasiado largo.')
    entries = []
    for line_number, line in enumerate(raw.splitlines(), 1):
        line = line.split('#', 1)[0].strip()
        if not line:
            continue
        for piece in re.split(r'[\s,;]+', line):
            if not piece:
                continue
            if '/' not in piece:
                raise ValueError(f'Línea {line_number}: «{piece}» necesita un prefijo CIDR (por ejemplo, /24).')
            try:
                net = ipaddress.ip_network(piece, strict=True)
            except ValueError as error:
                raise ValueError(f'Línea {line_number}: red inválida «{piece}»: {error}') from error
            entries.append(net)
            if len(entries) > MAX_NETWORKS:
                raise ValueError(f'Se admiten hasta {MAX_NETWORKS} redes por análisis.')
    if not entries:
        raise ValueError('Introduce al menos una red en notación CIDR.')
    versions = {n.version for n in entries}
    if len(versions) != 1:
        raise ValueError('Analiza IPv4 e IPv6 por separado; no mezcles ambas familias.')

    unique = list(dict.fromkeys(entries))
    ordered = sorted(unique, key=lambda n: (int(n.network_address), n.prefixlen))
    exact = list(ipaddress.collapse_addresses(ordered))
    lowest = min(int(n.network_address) for n in ordered)
    highest = max(int(n.broadcast_address) for n in ordered)
    bits = ordered[0].max_prefixlen
    prefix = bits - (lowest ^ highest).bit_length()
    supernet = ipaddress.ip_network((lowest, prefix), strict=False)
    original_count = len(entries)
    duplicates = original_count - len(unique)
    contained = []
    for n in ordered:
        containers = [parent for parent in ordered if parent != n and n.subnet_of(parent)]
        if containers:
            # Prefer the smallest containing network (largest prefix).
            parent = max(containers, key=lambda p: p.prefixlen)
            contained.append({'network': str(n), 'inside': str(parent)})
    covered = sum(n.num_addresses for n in exact)
    extra = supernet.num_addresses - covered
    return {
        'version': ordered[0].version,
        'original': [str(n) for n in entries],
        'exact': [_display(n) for n in exact],
        'supernet': str(supernet),
        'supernet_extra': str(extra),
        'covered_addresses': str(covered),
        'original_count': original_count,
        'optimized_count': len(exact),
        'reduction_pct': round((1 - len(exact) / original_count) * 100, 1),
        'duplicate_count': duplicates,
        'contained': contained,
        'is_supernet_exact': extra == 0,
    }


def routes(networks: list[str], vendor: str, gateway: str, interface: str = '') -> str:
    if not isinstance(networks, list) or not networks or len(networks) > MAX_NETWORKS:
        raise ValueError('No hay rutas válidas para generar la configuración.')
    permitted = {'cisco', 'huawei', 'aruba', 'fortinet'}
    if vendor not in permitted:
        raise ValueError('Fabricante no admitido.')
    try:
        hop = ipaddress.ip_address(gateway.strip())
    except (ValueError, AttributeError) as error:
        raise ValueError('Introduce una dirección IP de siguiente salto válida.') from error
    if not isinstance(interface, str) or len(interface) > 64 or (interface and not re.fullmatch(r'[A-Za-z0-9_./:-]+', interface)):
        raise ValueError('Nombre de interfaz no válido.')
    parsed = []
    for value in networks:
        try:
            net = ipaddress.ip_network(value, strict=True)
        except ValueError as error:
            raise ValueError('La lista de rutas contiene un prefijo no válido.') from error
        if net.version != hop.version:
            raise ValueError('El siguiente salto debe ser de la misma familia IP que las redes.')
        parsed.append(net)
    if len(set(parsed)) != len(parsed):
        raise ValueError('La lista de rutas contiene duplicados.')
    if vendor == 'fortinet' and hop.version != 4:
        raise ValueError('Este generador FortiOS admite únicamente rutas IPv4.')
    if vendor == 'huawei' and hop.version != 4:
        raise ValueError('Este generador Huawei VRP admite únicamente rutas IPv4.')
    if interface and vendor not in {'fortinet'}:
        raise ValueError('La interfaz opcional solo se admite en la configuración FortiOS.')
    lines = []
    if vendor == 'fortinet':
        lines = ['config router static']
        for index, net in enumerate(parsed, 1):
            lines += [f'    edit {index}', f'        set dst {net.network_address} {net.netmask}', f'        set gateway {hop}']
            if interface:
                lines.append(f'        set device "{interface}"')
            lines.append('    next')
        lines.append('end')
    elif vendor == 'huawei':
        lines = [f'ip route-static {net.network_address} {net.netmask} {hop}' for net in parsed]
    elif vendor == 'aruba':
        lines = [f'ip route {net} {hop}' if hop.version == 4 else f'ipv6 route {net} {hop}' for net in parsed]
    else:
        lines = [f'ip route {net.network_address} {net.netmask} {hop}' if hop.version == 4 else f'ipv6 route {net} {hop}' for net in parsed]
    return '\n'.join(lines)

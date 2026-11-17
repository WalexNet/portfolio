"""Cálculos IPv6 de la calculadora IP de PortfolioWeb."""

import ipaddress

MAX_SUBNETS = 256


def get_ipv6_type(address):
    """Clasificación básica por bloques IPv6 (no comprueba conectividad)."""
    if address.is_loopback:
        return "Loopback"
    if address.is_unspecified:
        return "Unspecified"
    if address in ipaddress.ip_network("fe80::/10"):
        return "Link-local"
    if address in ipaddress.ip_network("fc00::/7"):
        return "Unique Local Address (ULA)"
    if address.is_multicast:
        return "Multicast"
    if address in ipaddress.ip_network("2001:db8::/32"):
        return "Documentación (RFC 3849)"
    if address in ipaddress.ip_network("2000::/3"):
        return "Global Unicast (rango 2000::/3)"
    return "Otros rangos IPv6"


def calculate_ipv6(ip_cidr, subnet_prefix=None):
    """Analiza una interfaz IPv6 y, opcionalmente, subdivide su red."""
    try:
        interface = ipaddress.IPv6Interface(ip_cidr)
    except ValueError as exc:
        raise ValueError("Introduce una dirección IPv6 válida en formato IP/CIDR.") from exc

    address = interface.ip
    network = interface.network
    result = {
        "address": str(address),
        "address_exploded": address.exploded,
        "network": str(network),
        "network_address": str(network.network_address),
        "network_exploded": network.network_address.exploded,
        "prefix": network.prefixlen,
        "total_addresses": network.num_addresses,
        "address_type": get_ipv6_type(address),
        "is_multicast": address.is_multicast,
        "is_link_local": address.is_link_local,
        "is_loopback": address.is_loopback,
    }

    subnets = None
    subnet_info = None
    subnet_summary = None

    if subnet_prefix is not None and str(subnet_prefix).strip():
        prefix_text = str(subnet_prefix).strip().lstrip("/")
        if not prefix_text.isascii() or not prefix_text.isdecimal():
            raise ValueError("El prefijo de subdivisión IPv6 debe ser un número entre /0 y /128.")
        new_prefix = int(prefix_text)
        if not network.prefixlen < new_prefix <= 128:
            raise ValueError(
                f"El prefijo IPv6 debe ser mayor que /{network.prefixlen} y como máximo /128."
            )

        subnet_count = 1 << (new_prefix - network.prefixlen)
        if subnet_count > MAX_SUBNETS:
            raise ValueError(
                f"La división generaría {subnet_count} subredes; "
                f"el máximo permitido es {MAX_SUBNETS}."
            )

        addresses_per_subnet = 1 << (128 - new_prefix)
        subnets = [
            {
                "network": str(child),
                "network_address": str(child.network_address),
                "prefix": child.prefixlen,
                "addresses": child.num_addresses,
                "first_address": str(child.network_address),
                "last_address": str(child.broadcast_address),
            }
            for child in network.subnets(new_prefix=new_prefix)
        ]
        subnet_info = {"prefix": new_prefix, "addresses_per_subnet": addresses_per_subnet}
        subnet_summary = {
            "subnets": subnet_count,
            "addresses": network.num_addresses,
            "addresses_per_subnet": addresses_per_subnet,
        }

    return {
        "result": result,
        "subnets": subnets,
        "subnet_info": subnet_info,
        "subnet_summary": subnet_summary,
    }

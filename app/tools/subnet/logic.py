"""Punto de entrada para los motores IPv4 e IPv6."""

import ipaddress

from .ipv4 import calculate_subnet as calculate_ipv4
from .ipv6 import calculate_ipv6


def calculate_subnet(ip_cidr, subnet_prefix=None):
    try:
        interface = ipaddress.ip_interface(ip_cidr)
    except ValueError as exc:
        raise ValueError("Introduce una dirección IP válida en formato IP/CIDR.") from exc

    if interface.version == 4:
        return calculate_ipv4(ip_cidr, subnet_prefix)

    return calculate_ipv6(ip_cidr, subnet_prefix)

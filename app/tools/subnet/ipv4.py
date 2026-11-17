import ipaddress


MAX_SUBNETS = 256


def get_ip_description(address):
    first_octet = int(str(address).split(".")[0])

    # Rangos especiales
    if address in ipaddress.ip_network("127.0.0.0/8"):
        return "Class A, Loopback"

    if address in ipaddress.ip_network("169.254.0.0/16"):
        return "Class B, Link-local"

    if address in ipaddress.ip_network("224.0.0.0/4"):
        return "Class D, Multicast"

    if address in ipaddress.ip_network("240.0.0.0/4"):
        return "Class E, Reserved"

    # Clasificación histórica por clases
    if 0 <= first_octet <= 126:
        ip_class = "Class A"
    elif 128 <= first_octet <= 191:
        ip_class = "Class B"
    elif 192 <= first_octet <= 223:
        ip_class = "Class C"
    else:
        ip_class = "Reserved"

    # RFC1918
    private_networks = (
        ipaddress.ip_network("10.0.0.0/8"),
        ipaddress.ip_network("172.16.0.0/12"),
        ipaddress.ip_network("192.168.0.0/16"),
    )

    is_private = any(
        address in private_network
        for private_network in private_networks
    )

    if is_private:
        return f"{ip_class}, Private Internet"

    return ip_class


def get_host_info(network):
    if network.prefixlen == 32:
        return (
            network.network_address,
            network.network_address,
            1
        )

    if network.prefixlen == 31:
        return (
            network.network_address,
            network.broadcast_address,
            2
        )

    return (
        network.network_address + 1,
        network.broadcast_address - 1,
        network.num_addresses - 2
    )


def binary_ip(address, prefix):
    bits = f"{int(address):032b}"

    result = ""
    for i, bit in enumerate(bits):
        if i == prefix:
            result += " "
        result += bit
        if (i + 1) % 8 == 0 and i != 31:
            result += "."

    return result


def calculate_subnet(ip_cidr, subnet_prefix=None):
    try:
        interface = ipaddress.ip_interface(ip_cidr)
    except ValueError:
        raise ValueError(
            "Introduce una dirección IPv4 válida en formato IP/CIDR."
        )

    if interface.version != 4:
        raise ValueError(
            "Esta herramienta actualmente solo admite direcciones IPv4."
        )

    network = interface.network

    main_host_min, main_host_max, main_hosts_count = get_host_info(
        network
    )

    result = {
        "address": str(interface.ip),
        "network": str(network.network_address),
        "broadcast": str(network.broadcast_address),
        "netmask": str(network.netmask),
        "wildcard": str(network.hostmask),
        "prefix": network.prefixlen,
        "host_min": str(main_host_min),
        "host_max": str(main_host_max),
        "hosts": main_hosts_count,

        "address_binary": binary_ip(
            interface.ip,
            network.prefixlen
        ),
        "netmask_binary": binary_ip(
            network.netmask,
            network.prefixlen
        ),
        "wildcard_binary": binary_ip(
            network.hostmask,
            network.prefixlen
        ),
        "network_binary": binary_ip(
            network.network_address,
            network.prefixlen
        ),
        "host_min_binary": binary_ip(
            main_host_min,
            network.prefixlen
        ),
        "host_max_binary": binary_ip(
            main_host_max,
            network.prefixlen
        ),
        "broadcast_binary": binary_ip(
            network.broadcast_address,
            network.prefixlen
        ),

        "description": get_ip_description(interface.ip)
    }

    subnets = None
    subnet_info = None
    subnet_summary = None

    if subnet_prefix:
        prefix_value = str(subnet_prefix).strip().lstrip("/")

        if not prefix_value.isdigit():
            raise ValueError(
                "El CIDR de subnetting debe ser un número entre /0 y /32."
            )

        new_prefix = int(prefix_value)

        if new_prefix <= network.prefixlen:
            raise ValueError(
                "El CIDR de subnetting debe ser mayor que "
                "el CIDR de la red original."
            )

        if new_prefix > 32:
            raise ValueError(
                "El CIDR de subnetting no puede ser mayor que /32."
            )

        subnet_count = 2 ** (
            new_prefix - network.prefixlen
        )

        if subnet_count > MAX_SUBNETS:
            raise ValueError(
                f"El subnetting generaría {subnet_count} subredes. "
                f"El máximo permitido es {MAX_SUBNETS}."
            )

        subnet_mask_network = ipaddress.ip_network(
            f"0.0.0.0/{new_prefix}"
        )

        subnet_info = {
            "prefix": new_prefix,
            "netmask": str(subnet_mask_network.netmask),
            "wildcard": str(subnet_mask_network.hostmask),

            "netmask_binary": binary_ip(
                subnet_mask_network.netmask,
                new_prefix
            ),

            "wildcard_binary": binary_ip(
                subnet_mask_network.hostmask,
                new_prefix
            )
        }

        subnets = []

        for subnet in network.subnets(
            new_prefix=new_prefix
        ):
            (
                subnet_host_min,
                subnet_host_max,
                subnet_hosts_count
            ) = get_host_info(subnet)

            subnets.append({
                "network": str(subnet),
                "host_min": str(subnet_host_min),
                "host_max": str(subnet_host_max),
                "broadcast": str(
                    subnet.broadcast_address
                ),
                "hosts": subnet_hosts_count,

                "description": get_ip_description(
                    subnet.network_address
                ),

                "network_binary": binary_ip(
                    subnet.network_address,
                    subnet.prefixlen
                ),

                "host_min_binary": binary_ip(
                    subnet_host_min,
                    subnet.prefixlen
                ),

                "host_max_binary": binary_ip(
                    subnet_host_max,
                    subnet.prefixlen
                ),

                "broadcast_binary": binary_ip(
                    subnet.broadcast_address,
                    subnet.prefixlen
                )
            })

        subnet_summary = {
            "subnets": len(subnets),
            "hosts": sum(
                subnet["hosts"]
                for subnet in subnets
            )
        }

    return {
        "result": result,
        "subnets": subnets,
        "subnet_info": subnet_info,
        "subnet_summary": subnet_summary
    }
from app.tools.subnet.logic import calculate_subnet
import pytest


def test_calculate_main_network():
    calculation = calculate_subnet("10.25.14.2/19")

    result = calculation["result"]

    assert result["address"] == "10.25.14.2"
    assert result["network"] == "10.25.0.0"
    assert result["broadcast"] == "10.25.31.255"
    assert result["netmask"] == "255.255.224.0"
    assert result["prefix"] == 19
    assert result["host_min"] == "10.25.0.1"
    assert result["host_max"] == "10.25.31.254"
    assert result["hosts"] == 8190

def test_subnet_19_to_20():
    calculation = calculate_subnet(
        "10.25.14.2/19",
        "20"
    )

    subnets = calculation["subnets"]
    summary = calculation["subnet_summary"]

    assert len(subnets) == 2

    assert subnets[0]["network"] == "10.25.0.0/20"
    assert subnets[0]["host_min"] == "10.25.0.1"
    assert subnets[0]["host_max"] == "10.25.15.254"
    assert subnets[0]["broadcast"] == "10.25.15.255"
    assert subnets[0]["hosts"] == 4094

    assert subnets[1]["network"] == "10.25.16.0/20"
    assert subnets[1]["host_min"] == "10.25.16.1"
    assert subnets[1]["host_max"] == "10.25.31.254"
    assert subnets[1]["broadcast"] == "10.25.31.255"
    assert subnets[1]["hosts"] == 4094

    assert summary["subnets"] == 2
    assert summary["hosts"] == 8188


def test_network_31():
    calculation = calculate_subnet("10.0.0.1/31")

    result = calculation["result"]

    assert result["network"] == "10.0.0.0"
    assert result["host_min"] == "10.0.0.0"
    assert result["host_max"] == "10.0.0.1"
    assert result["broadcast"] == "10.0.0.1"
    assert result["hosts"] == 2

def test_reject_ipv6():
    with pytest.raises(
        ValueError,
        match="Esta herramienta actualmente solo admite direcciones IPv4."
    ):
        calculate_subnet("2001:db8::1/64")


def test_special_ipv4_classification():
    assert (
        calculate_subnet("127.0.0.1/8")["result"]["description"]
        == "Class A, Loopback"
    )

    assert (
        calculate_subnet("169.254.10.20/16")["result"]["description"]
        == "Class B, Link-local"
    )

    assert (
        calculate_subnet("224.0.0.1/24")["result"]["description"]
        == "Class D, Multicast"
    )

    assert (
        calculate_subnet("10.25.14.2/19")["result"]["description"]
        == "Class A, Private Internet"
    )
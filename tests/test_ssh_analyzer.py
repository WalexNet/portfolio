"""Ejecutar: python -m pytest tests/test_ssh_analyzer.py -q"""
import pytest
from app.tools.ssh_analyzer.logic import analyze_config


def test_findings():
    result = analyze_config('PermitRootLogin yes\nPasswordAuthentication yes\n')
    assert result['summary']['high'] == 1
    assert result['summary']['medium'] == 1


def test_match_does_not_count_as_global():
    result = analyze_config('PermitRootLogin no\nMatch User deploy\n  PermitRootLogin yes\n')
    assert result['summary']['high'] == 0
    assert result['summary']['match_blocks'] == 1


def test_includes_not_resolved():
    result = analyze_config('Include /etc/ssh/sshd_config.d/*.conf\n')
    assert result['summary']['includes'] == 1
    assert result['summary']['info'] >= 1


def test_invalid_input():
    with pytest.raises(ValueError):
        analyze_config('')
    with pytest.raises(ValueError):
        analyze_config('A' * (256 * 1024 + 1))

"""Ejecutar: pytest -q tests/test_sql_formatter.py (con dependencias instaladas)."""
import pytest
from app.tools.sql.logic import SqlInputError, process_sql


def test_format_postgres():
    result = process_sql('select id, name from users where id = 1;', 'postgres', 'format')
    assert result['valid'] is True
    assert 'SELECT' in result['result']
    assert '\n' in result['result']


def test_validate_invalid():
    result = process_sql('SELECT FROM WHERE', 'postgres', 'validate')
    assert result['valid'] is False


def test_mysql():
    result = process_sql('SELECT `name` FROM `users`;', 'mysql', 'validate')
    assert result['valid'] is True


def test_empty_rejected():
    with pytest.raises(SqlInputError):
        process_sql('', 'postgres', 'format')


def test_invalid_dialect():
    with pytest.raises(SqlInputError):
        process_sql('select 1', 'oracle', 'format')


def test_preserves_literal():
    result = process_sql("SELECT 'hello   world' AS greeting;", 'postgres', 'minify')
    assert "'hello   world'" in result['result']

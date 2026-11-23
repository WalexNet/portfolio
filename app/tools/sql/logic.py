"""Formato y análisis estático de SQL. Nunca ejecuta consultas."""

import sqlparse
from sqlglot import parse
from sqlglot.errors import ParseError, TokenError, ErrorLevel

DIALECTS = {"postgres": "PostgreSQL", "mysql": "MySQL / MariaDB", "sqlite": "SQLite"}
MAX_SQL_LENGTH = 100_000


class SqlInputError(ValueError):
    pass


def process_sql(sql: str, dialect: str, action: str, keyword_case: str = "upper") -> dict:
    if not isinstance(sql, str) or not sql.strip():
        raise SqlInputError("Introduce una consulta SQL.")
    if len(sql) > MAX_SQL_LENGTH:
        raise SqlInputError("La consulta supera el límite de 100.000 caracteres.")
    if dialect not in DIALECTS:
        raise SqlInputError("Selecciona un dialecto válido.")
    if action not in {"format", "validate", "minify"}:
        raise SqlInputError("Operación no admitida.")
    if keyword_case not in {"upper", "lower", "capitalize"}:
        raise SqlInputError("Estilo de palabras clave no admitido.")

    # SQLGlot detecta muchos errores sintácticos, pero NO es un validador semántico
    # ni garantiza detectar todos los errores específicos de cada motor.
    try:
        expressions = parse(sql, read=dialect, error_level=ErrorLevel.RAISE)
        if not any(expression is not None for expression in expressions):
            return {"valid": False, "message": "No se detectó ninguna sentencia SQL.", "result": "", "statements": 0}
        valid, message = True, "Análisis sintáctico completado. No se ejecutó ninguna consulta."
    except (ParseError, TokenError) as exc:
        valid, message = False, f"Posible error de sintaxis: {str(exc)[:450]}"
        expressions = []

    if action == "validate":
        return {"valid": valid, "message": message, "result": "", "statements": len([e for e in expressions if e is not None])}

    if action == "format":
        result = sqlparse.format(
            sql, reindent=True, reindent_aligned=False, keyword_case=keyword_case,
            indent_width=4, wrap_after=88, strip_whitespace=True,
        )
    else:
        # strip_whitespace evita modificar literales entre comillas.
        # SQLParse no garantiza una sola línea para todo SQL válido.
        result = sqlparse.format(sql, strip_whitespace=True, reindent=False, keyword_case=None)
        result = result.strip()

    return {
        "valid": valid,
        "message": message if valid else message + " Revisa la consulta antes de utilizar el resultado.",
        "result": result,
        "statements": len([e for e in expressions if e is not None]),
    }

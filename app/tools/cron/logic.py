
from datetime import datetime
from zoneinfo import ZoneInfo

from croniter import croniter


CRON_FIELDS = (
    "minuto",
    "hora",
    "día del mes",
    "mes",
    "día de la semana",
)


def validate_cron(expression: str) -> bool:
    """Valida una expresión crontab Linux de cinco campos."""

    expression = expression.strip()
    fields = expression.split()

    if len(fields) != 5:
        raise ValueError(
            "La expresión debe contener exactamente cinco campos: "
            "minuto, hora, día del mes, mes y día de la semana."
        )

    if not croniter.is_valid(expression):
        raise ValueError(
            "La expresión cron contiene valores u operadores no válidos."
        )

    return True


def next_executions(
    expression: str,
    count: int = 5,
    timezone: str = "Europe/Madrid",
) -> list[datetime]:
    """Calcula las próximas ejecuciones de una expresión cron."""

    validate_cron(expression)

    if not isinstance(count, int) or not 1 <= count <= 20:
        raise ValueError(
            "El número de ejecuciones debe estar entre 1 y 20."
        )

    try:
        tz = ZoneInfo(timezone)
    except (KeyError, ValueError) as exc:
        raise ValueError("Zona horaria no válida.") from exc

    now = datetime.now(tz)
    schedule = croniter(expression, now, day_or=True)

    try:
        return [
            schedule.get_next(datetime)
            for _ in range(count)
        ]
    except (ValueError, OverflowError) as exc:
        raise ValueError(
            "No se han podido calcular las próximas ejecuciones."
        ) from exc

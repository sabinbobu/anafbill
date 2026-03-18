import logging
from datetime import date, timedelta

logger = logging.getLogger(__name__)

# Romanian legal holidays for 2025 and 2026
HOLIDAYS: set[str] = {
    # 2025
    "2025-01-01",
    "2025-01-02",
    "2025-01-24",
    "2025-04-18",
    "2025-04-20",
    "2025-04-21",
    "2025-05-01",
    "2025-06-08",
    "2025-06-09",
    "2025-08-15",
    "2025-11-30",
    "2025-12-01",
    "2025-12-25",
    "2025-12-26",
    # 2026
    "2026-01-01",
    "2026-01-02",
    "2026-01-24",
    "2026-04-10",
    "2026-04-12",
    "2026-04-13",
    "2026-05-01",
    "2026-05-31",
    "2026-06-01",
    "2026-08-15",
    "2026-11-30",
    "2026-12-01",
    "2026-12-25",
    "2026-12-26",
}


def is_working_day(d: date) -> bool:
    """Return True if *d* is a Romanian working day (Mon–Fri, not a public holiday)."""
    if d.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
        return False
    return d.isoformat() not in HOLIDAYS


def add_working_days(start: date, days: int) -> date:
    """Return the date that is *days* Romanian working days after *start*.

    The start date itself is not counted — we begin counting from the next day.
    """
    current = start
    counted = 0
    while counted < days:
        current += timedelta(days=1)
        if is_working_day(current):
            counted += 1
    return current


def calculate_deadline(issue_date: date) -> date:
    """Return the e-Factura submission deadline: 5 working days from *issue_date*."""
    return add_working_days(issue_date, 5)


def days_until_deadline(issue_date: date, today: date | None = None) -> int:
    """Return the number of calendar days until the submission deadline.

    A negative value means the deadline has already passed (overdue).
    """
    if today is None:
        today = date.today()
    deadline = calculate_deadline(issue_date)
    return (deadline - today).days

from datetime import datetime, timedelta
from typing import Tuple


def get_month_range(year: int, month: int) -> Tuple[datetime, datetime]:
    """Get the start and end datetime for a given month"""
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1) - timedelta(seconds=1)
    else:
        end_date = datetime(year, month + 1, 1) - timedelta(seconds=1)
    return start_date, end_date


def get_week_range(date: datetime) -> Tuple[datetime, datetime]:
    """Get the start and end datetime for the week containing the given date"""
    week_start = date - timedelta(days=date.weekday())
    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    return week_start, week_end


def format_currency(amount: float, currency: str = "USD") -> str:
    """Format amount as currency"""
    if currency == "USD":
        return f"${amount:,.2f}"
    elif currency == "EUR":
        return f"€{amount:,.2f}"
    else:
        return f"{amount:,.2f} {currency}"

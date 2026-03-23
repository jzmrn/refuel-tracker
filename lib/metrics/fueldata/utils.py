"""Shared utilities for fueldata clients.

All stored timestamps follow UTC ISO 8601 with ``Z`` suffix.
"""

import math
import sqlite3
from collections.abc import Generator
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Protocol

ISO_8601_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


class SQLiteResource(Protocol):
    """Protocol for a resource that provides SQLite connections."""

    @contextmanager
    def get_connection(self) -> Generator[sqlite3.Connection, None, None]:
        ...


def to_utc_iso(dt: datetime) -> str:
    """Format a datetime as UTC ISO 8601 with Z suffix.

    - Naive datetimes are assumed UTC.
    - Aware datetimes are converted to UTC.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime(ISO_8601_FORMAT)


def utc_now_iso() -> str:
    """Return the current UTC time as ISO 8601 with Z suffix."""
    return datetime.now(timezone.utc).strftime(ISO_8601_FORMAT)


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lng2 - lng1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    )
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

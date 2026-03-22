"""
SQLite client for kilometer entries storage.
"""

import calendar
import logging
from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from fueldata.utils import to_utc_iso

from .models import KilometerEntry
from .sqlite_resource import BackendSQLiteResource

logger = logging.getLogger(__name__)


class KilometerClient:
    """Client for storing kilometer entries in SQLite."""

    def __init__(self, db: BackendSQLiteResource):
        """
        Initialize the KilometerClient.

        Args:
            db: BackendSQLiteResource for database operations
        """
        self._db = db
        with self._db.get_connection() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS kilometer_entries (
                    id TEXT PRIMARY KEY,
                    car_id TEXT NOT NULL,
                    total_kilometers REAL NOT NULL,
                    timestamp TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT NOT NULL
                )
            """
            )
            # Create indexes for common query patterns
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_kilometer_car_timestamp
                ON kilometer_entries(car_id, timestamp DESC)
            """
            )

    def add_entry(
        self,
        car_id: str,
        total_kilometers: float,
        user_id: str,
        timestamp: datetime | None = None,
    ) -> KilometerEntry:
        """Add a single kilometer entry and return the created entry."""
        entry_id = str(uuid4())
        now = datetime.now(UTC)
        entry_timestamp = timestamp if timestamp else now

        entry = KilometerEntry(
            id=entry_id,
            car_id=car_id,
            total_kilometers=total_kilometers,
            timestamp=entry_timestamp,
            created_at=now,
            created_by=user_id,
        )

        with self._db.get_connection() as con:
            con.execute(
                """
                INSERT INTO kilometer_entries (id, car_id, total_kilometers, timestamp, created_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    entry.id,
                    entry.car_id,
                    entry.total_kilometers,
                    to_utc_iso(entry.timestamp),
                    to_utc_iso(entry.created_at),
                    entry.created_by,
                ],
            )

        return entry

    def get_entries(
        self,
        car_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int | None = None,
    ) -> list[KilometerEntry]:
        """Get kilometer entries for a car with optional filters."""
        conditions = ["car_id = ?"]
        params: list = [car_id]

        if start_date is not None:
            conditions.append("timestamp >= ?")
            params.append(start_date.isoformat())

        if end_date is not None:
            conditions.append("timestamp <= ?")
            params.append(end_date.isoformat())

        query = "SELECT * FROM kilometer_entries"
        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY timestamp DESC"

        if limit is not None:
            query += f" LIMIT {limit}"

        with self._db.get_connection() as con:
            cursor = con.execute(query, params)
            columns = [desc[0] for desc in cursor.description]
            results = cursor.fetchall()

        return [KilometerEntry(**dict(zip(columns, row))) for row in results]

    def delete_entry(self, entry_id: str, car_id: str) -> bool:
        """Delete a specific kilometer entry by ID."""
        with self._db.get_connection() as con:
            cursor = con.execute(
                "DELETE FROM kilometer_entries WHERE id = ? AND car_id = ?",
                [entry_id, car_id],
            )
            return cursor.rowcount > 0

    def delete_entries_for_car(self, car_id: str) -> int:
        """Delete all kilometer entries for a car. Returns count of deleted entries."""
        with self._db.get_connection() as con:
            cursor = con.execute(
                "DELETE FROM kilometer_entries WHERE car_id = ?",
                [car_id],
            )
            return cursor.rowcount

    @staticmethod
    def _add_months(dt: datetime, months: int) -> datetime:
        """Add months to a datetime, clamping the day to the valid range."""
        month = dt.month - 1 + months
        year = dt.year + month // 12
        month = month % 12 + 1
        day = min(dt.day, calendar.monthrange(year, month)[1])
        return dt.replace(year=year, month=month, day=day)

    @staticmethod
    def _interpolate_km(
        target: datetime,
        entries: list[KilometerEntry],
    ) -> float | None:
        """Linearly interpolate the odometer value at a given timestamp.

        Returns None if the target is outside the range of entries.
        """
        target_ts = target.timestamp()

        # If target matches or is outside range, use boundary values
        first_ts = entries[0].timestamp.timestamp()
        last_ts = entries[-1].timestamp.timestamp()

        if target_ts <= first_ts:
            return entries[0].total_kilometers
        if target_ts >= last_ts:
            return entries[-1].total_kilometers

        # Find the two surrounding entries
        for i in range(len(entries) - 1):
            t1 = entries[i].timestamp.timestamp()
            t2 = entries[i + 1].timestamp.timestamp()
            if t1 <= target_ts <= t2:
                if t2 == t1:
                    return entries[i].total_kilometers
                ratio = (target_ts - t1) / (t2 - t1)
                km1 = entries[i].total_kilometers
                km2 = entries[i + 1].total_kilometers
                return km1 + (km2 - km1) * ratio

        return None

    def get_period_aggregates(
        self,
        car_id: str,
        aggregation: Literal["monthly", "yearly"],
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> list[dict]:
        """Compute interpolated kilometer aggregates per period.

        Returns a list of dicts with period_label, period_start, kilometers_driven.
        Requires at least 2 entries to interpolate.
        """
        # Fetch all entries for the car sorted ascending (no limit)
        entries = self.get_entries(
            car_id=car_id,
            start_date=start_date,
            end_date=end_date,
            limit=None,
        )
        # Sort ascending by timestamp
        entries.sort(key=lambda e: e.timestamp)

        if len(entries) < 2:
            return []

        first_ts = entries[0].timestamp
        last_ts = entries[-1].timestamp

        # Generate period boundaries
        boundaries: list[datetime] = []
        if aggregation == "yearly":
            # Start from Jan 1 of the first entry's year
            current = datetime(first_ts.year, 1, 1, tzinfo=UTC)
            while current <= last_ts:
                boundaries.append(current)
                current = current.replace(year=current.year + 1)
            # Ensure we have one boundary past the last entry
            if not boundaries or boundaries[-1] <= last_ts:
                boundaries.append(current)
        else:  # monthly
            # Start from 1st of the first entry's month
            current = datetime(first_ts.year, first_ts.month, 1, tzinfo=UTC)
            while current <= last_ts:
                boundaries.append(current)
                current = self._add_months(current, 1)
            if not boundaries or boundaries[-1] <= last_ts:
                boundaries.append(current)

        # Calculate km driven between consecutive boundaries
        aggregates = []
        for i in range(len(boundaries) - 1):
            period_start = boundaries[i]
            period_end = boundaries[i + 1]

            km_at_start = self._interpolate_km(period_start, entries)
            km_at_end = self._interpolate_km(period_end, entries)

            if km_at_start is None or km_at_end is None:
                continue

            km_driven = km_at_end - km_at_start
            if km_driven < 0:
                continue

            aggregates.append(
                {
                    "period_start": period_start.strftime("%Y-%m-%d"),
                    "kilometers_driven": round(km_driven, 1),
                }
            )

        return aggregates

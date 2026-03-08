"""
SQLite client for kilometer entries storage.
"""

import logging
from datetime import UTC, datetime
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

"""
DuckDB client for time spans storage.
"""

from datetime import datetime
from typing import Any

import pandas as pd

from .duckdb_resource import BackendDuckDBResource


class TimeSpanClient:
    """Client for storing time spans in DuckDB."""

    def __init__(self, duckdb: BackendDuckDBResource):
        """
        Initialize the TimeSpanClient.

        Args:
            duckdb: BackendDuckDBResource for database operations
        """
        self._duckdb = duckdb
        with self._duckdb.get_connection() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS time_spans (
                    id VARCHAR NOT NULL,
                    user_id VARCHAR NOT NULL,
                    start_date TIMESTAMP NOT NULL,
                    end_date TIMESTAMP,
                    label VARCHAR NOT NULL,
                    "group" VARCHAR NOT NULL,
                    notes VARCHAR,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL,
                    PRIMARY KEY (user_id, id)
                )
            """
            )
            # Create indexes for common query patterns
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_time_spans_user_start
                ON time_spans(user_id, start_date DESC)
            """
            )
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_time_spans_user_label
                ON time_spans(user_id, label)
            """
            )
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_time_spans_user_group
                ON time_spans(user_id, "group")
            """
            )

    def _calculate_duration(
        self, start_date: datetime, end_date: datetime | None
    ) -> dict:
        """Calculate duration in days, hours, and minutes."""
        if end_date is None or pd.isna(end_date):
            # For ongoing spans (None or NaT), calculate duration up to now
            end_date = datetime.now()

        duration = end_date - start_date
        total_minutes = int(duration.total_seconds() / 60)

        days = total_minutes // (24 * 60)
        hours = (total_minutes % (24 * 60)) // 60
        minutes = total_minutes % 60

        return {
            "duration_days": days,
            "duration_hours": hours,
            "duration_minutes": minutes,
        }

    def add_time_span(
        self,
        start_date: datetime,
        end_date: datetime | None,
        label: str,
        group: str,
        notes: str | None,
        user_id: str,
    ) -> dict[str, Any]:
        """Add a new time span and return the created record."""
        # Generate ID based on timestamp and label hash
        span_id = f"{start_date.isoformat()}_{abs(hash(label))}"
        current_time = datetime.now()

        df = pd.DataFrame(  # noqa: F841 DuckDB reads the value internally
            [
                {
                    "id": span_id,
                    "user_id": user_id,
                    "start_date": start_date,
                    "end_date": end_date,
                    "label": label,
                    "group": group,
                    "notes": notes if notes else None,
                    "created_at": current_time,
                    "updated_at": current_time,
                }
            ]
        )

        try:
            with self._duckdb.get_connection() as con:
                con.execute("INSERT INTO time_spans SELECT * FROM df")

            # Calculate duration if end_date is provided
            duration_info = {}
            if end_date:
                duration_info = self._calculate_duration(start_date, end_date)

            return {
                "id": span_id,
                "user_id": user_id,
                "start_date": start_date,
                "end_date": end_date,
                "label": label,
                "group": group,
                "notes": notes,
                "created_at": current_time,
                "updated_at": current_time,
                **duration_info,
            }
        except Exception as e:
            print(f"Error adding time span: {e}")
            raise Exception("Failed to add time span")

    def get_time_spans(
        self,
        user_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        label: str | None = None,
        group: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """Get time spans with optional filtering."""
        query = "SELECT * FROM time_spans WHERE user_id = ?"
        params = [user_id]

        if start_date is not None:
            query += " AND start_date >= ?"
            params.append(start_date)

        if end_date is not None:
            query += " AND start_date <= ?"
            params.append(end_date)

        if label is not None:
            query += " AND LOWER(label) LIKE ?"
            params.append(f"%{label.lower()}%")

        if group is not None:
            query += ' AND LOWER("group") LIKE ?'
            params.append(f"%{group.lower()}%")

        query += " ORDER BY start_date DESC"

        if limit is not None:
            query += f" LIMIT {limit}"

        with self._duckdb.get_connection() as con:
            df = con.execute(query, tuple(params)).df()

        if df.empty:
            return []

        # Convert to list of dicts and add duration info
        results = []
        for record in df.to_dict(orient="records"):
            # Convert pandas Timestamps to Python datetime objects
            if hasattr(record["start_date"], "to_pydatetime"):
                record["start_date"] = record["start_date"].to_pydatetime()

            # Handle end_date - convert NaT to None, otherwise convert Timestamp
            if pd.isna(record["end_date"]):
                record["end_date"] = None
            elif hasattr(record["end_date"], "to_pydatetime"):
                record["end_date"] = record["end_date"].to_pydatetime()

            # Calculate duration
            duration_info = self._calculate_duration(
                record["start_date"], record["end_date"]
            )
            results.append({**record, **duration_info})

        return results

    def delete_time_span(self, user_id: str, span_id: str) -> bool:
        """Delete a time span by ID."""
        try:
            with self._duckdb.get_connection() as con:
                result = con.execute(
                    "DELETE FROM time_spans WHERE user_id = ? AND id = ?",
                    (user_id, span_id),
                )
                return result.fetchone()[0] > 0
        except Exception as e:
            print(f"Error deleting time span: {e}")
            return False

    def update_time_span(
        self, span_id: str, user_id: str, updates: dict[str, Any]
    ) -> bool:
        """Update a time span."""
        # Build UPDATE query dynamically
        set_clauses = []
        params = []

        for key, value in updates.items():
            if key == "group":
                set_clauses.append('"group" = ?')
            else:
                set_clauses.append(f"{key} = ?")
            params.append(value)

        # Always update updated_at
        set_clauses.append("updated_at = ?")
        params.append(datetime.now())

        # Add WHERE clause params
        params.extend([user_id, span_id])

        query = f"""
            UPDATE time_spans
            SET {", ".join(set_clauses)}
            WHERE user_id = ? AND id = ?
        """

        try:
            with self._duckdb.get_connection() as con:
                result = con.execute(query, tuple(params))
                return result.fetchone()[0] > 0
        except Exception as e:
            print(f"Error updating time span: {e}")
            return False

    def get_existing_labels(self, user_id: str) -> list[str]:
        """Get all unique labels from existing time spans."""
        query = """
            SELECT DISTINCT label
            FROM time_spans
            WHERE user_id = ?
            ORDER BY label
        """

        with self._duckdb.get_connection() as con:
            df = con.execute(query, (user_id,)).df()

        if df.empty:
            return []

        return df["label"].tolist()

    def get_existing_groups(self, user_id: str) -> list[str]:
        """Get all unique groups from existing time spans."""
        query = """
            SELECT DISTINCT "group"
            FROM time_spans
            WHERE user_id = ?
            ORDER BY "group"
        """

        with self._duckdb.get_connection() as con:
            df = con.execute(query, (user_id,)).df()

        if df.empty:
            return []

        return df["group"].tolist()

    def get_summary_stats(self, user_id: str) -> dict:
        """Get summary statistics for time spans."""
        query = """
            SELECT
                COUNT(*) as total_entries,
                COUNT(DISTINCT label) as unique_labels,
                SUM(CASE WHEN end_date IS NOT NULL THEN 1 ELSE 0 END) as completed_entries,
                SUM(CASE WHEN end_date IS NULL THEN 1 ELSE 0 END) as ongoing_entries,
                MIN(start_date) as earliest,
                MAX(start_date) as latest,
                SUM(
                    CASE WHEN end_date IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (end_date - start_date)) / 60
                    ELSE 0 END
                ) as total_minutes,
                AVG(
                    CASE WHEN end_date IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (end_date - start_date)) / 60
                    ELSE NULL END
                ) as average_minutes,
                MIN(
                    CASE WHEN end_date IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (end_date - start_date)) / 60
                    ELSE NULL END
                ) as min_minutes,
                MAX(
                    CASE WHEN end_date IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (end_date - start_date)) / 60
                    ELSE NULL END
                ) as max_minutes
            FROM time_spans
            WHERE user_id = ?
        """

        try:
            with self._duckdb.get_connection() as con:
                result = con.execute(query, (user_id,)).fetchone()

            if result and result[0] > 0:
                return {
                    "total_entries": result[0],
                    "unique_labels": result[1],
                    "completed_entries": result[2],
                    "ongoing_entries": result[3],
                    "date_range": {
                        "earliest": result[4].isoformat() if result[4] else None,
                        "latest": result[5].isoformat() if result[5] else None,
                    },
                    "duration_stats": {
                        "total_minutes": result[6],
                        "average_minutes": result[7],
                        "min_minutes": result[8],
                        "max_minutes": result[9],
                    },
                }
            else:
                return {
                    "total_entries": 0,
                    "unique_labels": 0,
                    "completed_entries": 0,
                    "ongoing_entries": 0,
                    "date_range": {"earliest": None, "latest": None},
                    "duration_stats": {
                        "total_minutes": None,
                        "average_minutes": None,
                        "min_minutes": None,
                        "max_minutes": None,
                    },
                }
        except Exception as e:
            print(f"Error getting time span summary: {e}")
            return {
                "total_entries": 0,
                "unique_labels": 0,
                "completed_entries": 0,
                "ongoing_entries": 0,
                "date_range": {"earliest": None, "latest": None},
                "duration_stats": {
                    "total_minutes": None,
                    "average_minutes": None,
                    "min_minutes": None,
                    "max_minutes": None,
                },
            }

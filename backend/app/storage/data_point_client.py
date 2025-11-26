"""
DuckDB client for data points storage.
"""

from datetime import datetime
from typing import Any

from .duckdb_resource import BackendDuckDBResource
from .models import DataPoint


class DataPointClient:
    """Client for storing data points in DuckDB."""

    def __init__(self, duckdb: BackendDuckDBResource):
        """
        Initialize the DataPointClient.

        Args:
            duckdb: BackendDuckDBResource for database operations
        """

        self._duckdb = duckdb
        with self._duckdb.get_connection() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS data_points (
                    id VARCHAR NOT NULL,
                    user_id VARCHAR NOT NULL,
                    timestamp TIMESTAMP NOT NULL,
                    value DOUBLE NOT NULL,
                    label VARCHAR NOT NULL,
                    notes VARCHAR,
                    PRIMARY KEY (user_id, id)
                )
            """
            )

            # Create indexes for common query patterns
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_data_points_user_timestamp
                ON data_points(user_id, timestamp DESC)
            """
            )
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_data_points_user_label
                ON data_points(user_id, label)
            """
            )

    def add_data_point(
        self,
        timestamp: datetime,
        value: float,
        label: str,
        notes: str | None,
        user_id: str,
    ) -> str:
        """Add a data point and return its ID."""
        point_id = f"{timestamp.isoformat()}_{abs(hash(label))}"

        data_point = DataPoint(
            id=point_id,
            user_id=user_id,
            timestamp=timestamp,
            value=value,
            label=label,
            notes=notes,
        )

        try:
            with self._duckdb.get_connection() as con:
                con.execute(
                    """
                    INSERT INTO data_points (id, user_id, timestamp, value, label, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    [
                        data_point.id,
                        data_point.user_id,
                        data_point.timestamp,
                        data_point.value,
                        data_point.label,
                        data_point.notes,
                    ],
                )
            return point_id
        except Exception as e:
            print(f"Error adding data point: {e}")
            raise Exception("Failed to add data point")

    def get_data_points(
        self,
        user_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        label: str | None = None,
        limit: int | None = None,
    ) -> list[DataPoint]:
        """Get data points with optional filtering."""

        query = "SELECT * FROM data_points WHERE user_id = ?"
        params = [user_id]

        if start_date is not None:
            query += " AND timestamp >= ?"
            params.append(start_date)

        if end_date is not None:
            query += " AND timestamp <= ?"
            params.append(end_date)

        if label is not None:
            query += " AND LOWER(label) LIKE ?"
            params.append(f"%{label.lower()}%")

        query += " ORDER BY timestamp DESC"

        if limit is not None:
            query += f" LIMIT {limit}"

        with self._duckdb.get_connection() as con:
            results = con.execute(query, params).fetchall()
            columns = [desc[0] for desc in con.description]

        return [DataPoint(**dict(zip(columns, row))) for row in results]

    def delete_data_point(self, user_id: str, point_id: str) -> bool:
        """Delete a data point by ID."""
        try:
            with self._duckdb.get_connection() as con:
                result = con.execute(
                    "DELETE FROM data_points WHERE user_id = ? AND id = ?",
                    [user_id, point_id],
                )
                # DuckDB DELETE returns a relation, check rowcount
                return result.fetchone()[0] > 0
        except Exception as e:
            print(f"Error deleting data point: {e}")
            return False

    def get_existing_labels(self, user_id: str) -> list[str]:
        """Get all unique labels from existing data points."""
        query = """
            SELECT DISTINCT label
            FROM data_points
            WHERE user_id = ?
            ORDER BY label
        """

        with self._duckdb.get_connection() as con:
            results = con.execute(query, (user_id,)).fetchall()

        return [row[0] for row in results]

    def get_summary(self, user_id: str) -> dict[str, Any]:
        """Get summary statistics for data points."""
        query = """
            SELECT
                COUNT(*) as total_entries,
                COUNT(DISTINCT label) as unique_labels,
                MIN(timestamp) as earliest,
                MAX(timestamp) as latest,
                MIN(value) as min_value,
                MAX(value) as max_value,
                AVG(value) as avg_value
            FROM data_points
            WHERE user_id = ?
        """

        try:
            with self._duckdb.get_connection() as con:
                result = con.execute(query, (user_id,)).fetchone()

            if result and result[0] > 0:
                return {
                    "total_entries": result[0],
                    "unique_labels": result[1],
                    "date_range": {
                        "earliest": result[2].isoformat() if result[2] else None,
                        "latest": result[3].isoformat() if result[3] else None,
                    },
                    "value_stats": {
                        "min": result[4],
                        "max": result[5],
                        "average": result[6],
                    },
                }
            else:
                return {
                    "total_entries": 0,
                    "unique_labels": 0,
                    "date_range": {"earliest": None, "latest": None},
                    "value_stats": {"min": None, "max": None, "average": None},
                }
        except Exception as e:
            print(f"Error getting data point summary: {e}")
            return {
                "total_entries": 0,
                "unique_labels": 0,
                "date_range": {"earliest": None, "latest": None},
                "value_stats": {"min": None, "max": None, "average": None},
            }

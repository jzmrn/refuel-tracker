"""
DuckDB client for refuel metrics storage.
"""

from datetime import datetime
from typing import Any

import pandas as pd
from pydantic import BaseModel

from .duckdb_resource import BackendDuckDBResource


class RefuelMetric(BaseModel):
    """Refuel metric model"""

    timestamp: datetime
    price: float
    amount: float
    kilometers_since_last_refuel: float
    estimated_fuel_consumption: float
    notes: str | None = None


class RefuelDataClient:
    """Client for storing refuel metrics in DuckDB."""

    def __init__(self, duckdb: BackendDuckDBResource):
        """
        Initialize the RefuelDataClient.

        Args:
            duckdb: BackendDuckDBResource for database operations
        """
        self._duckdb = duckdb
        with self._duckdb.get_connection() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS refuel_metrics (
                    timestamp TIMESTAMP NOT NULL,
                    user_id VARCHAR NOT NULL,
                    price DOUBLE NOT NULL,
                    amount DOUBLE NOT NULL,
                    kilometers_since_last_refuel DOUBLE NOT NULL,
                    estimated_fuel_consumption DOUBLE NOT NULL,
                    notes VARCHAR,
                    PRIMARY KEY (user_id, timestamp)
                )
            """
            )
            # Create indexes for common query patterns
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_refuel_user_timestamp
                ON refuel_metrics(user_id, timestamp DESC)
            """
            )

    def add_metric(self, metric: RefuelMetric, user_id: str) -> bool:
        """Add a single refuel metric."""
        return self.add_metrics([metric], user_id)

    def add_metrics(self, metrics: list[RefuelMetric], user_id: str) -> bool:
        """Add multiple refuel metrics efficiently."""
        if not metrics:
            return True

        # Convert to DataFrame
        rows = []
        for metric in metrics:
            rows.append(
                {
                    "timestamp": metric.timestamp,
                    "user_id": user_id,
                    "price": metric.price,
                    "amount": metric.amount,
                    "kilometers_since_last_refuel": metric.kilometers_since_last_refuel,
                    "estimated_fuel_consumption": metric.estimated_fuel_consumption,
                    "notes": metric.notes if metric.notes else None,
                }
            )

        df = pd.DataFrame(rows)  # noqa: F841 DuckDB reads the value internally

        try:
            with self._duckdb.get_connection() as con:
                con.execute("INSERT INTO refuel_metrics SELECT * FROM df")
            return True
        except Exception as e:
            print(f"Error adding refuel metrics: {e}")
            return False

    def get_metrics(
        self,
        user_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int | None = None,
    ) -> list[RefuelMetric]:
        """Get refuel metrics with optional filters."""
        query = "SELECT * FROM refuel_metrics WHERE user_id = ?"
        params = [user_id]

        if start_date is not None:
            query += " AND timestamp >= ?"
            params.append(start_date)

        if end_date is not None:
            query += " AND timestamp <= ?"
            params.append(end_date)

        query += " ORDER BY timestamp DESC"

        if limit is not None:
            query += f" LIMIT {limit}"

        with self._duckdb.get_connection() as con:
            df = con.execute(query, params).df()

        if df.empty:
            return []

        records = df.to_dict(orient="records")
        return [
            RefuelMetric(
                timestamp=record["timestamp"],
                price=record["price"],
                amount=record["amount"],
                kilometers_since_last_refuel=record["kilometers_since_last_refuel"],
                estimated_fuel_consumption=record["estimated_fuel_consumption"],
                notes=record["notes"] if record["notes"] else None,
            )
            for record in records
        ]

    def delete_metric(self, user_id: str, timestamp: datetime) -> bool:
        """Delete a specific metric by timestamp."""
        try:
            with self._duckdb.get_connection() as con:
                result = con.execute(
                    "DELETE FROM refuel_metrics WHERE user_id = ? AND timestamp = ?",
                    [user_id, timestamp],
                )
                return result.fetchone()[0] > 0  # Returns number of deleted rows
        except Exception as e:
            print(f"Error deleting refuel metric: {e}")
            return False

    def get_total_cost_by_period(
        self,
        user_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> dict[str, Any]:
        """Get aggregated cost statistics for a time period."""
        query = """
            SELECT
                COALESCE(SUM(price * amount), 0) as total_cost,
                COALESCE(SUM(amount), 0) as total_liters,
                COUNT(*) as fill_up_count,
                CASE
                    WHEN SUM(amount) > 0 THEN SUM(price * amount) / SUM(amount)
                    ELSE 0
                END as average_price_per_liter
            FROM refuel_metrics
            WHERE user_id = ?
        """
        params = [user_id]

        if start_date is not None:
            query += " AND timestamp >= ?"
            params.append(start_date)

        if end_date is not None:
            query += " AND timestamp <= ?"
            params.append(end_date)

        try:
            with self._duckdb.get_connection() as con:
                result = con.execute(query, params).fetchone()

            return {
                "total_cost": round(result[0], 2),
                "total_liters": round(result[1], 2),
                "fill_up_count": result[2],
                "average_price_per_liter": round(result[3], 3),
            }
        except Exception as e:
            print(f"Error calculating refuel statistics: {e}")
            return {
                "total_cost": 0.0,
                "total_liters": 0.0,
                "average_price_per_liter": 0.0,
                "fill_up_count": 0,
            }

    def get_price_trends(
        self,
        user_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> list[dict[str, Any]]:
        """Get price trends over time."""
        query = """
            SELECT
                CAST(timestamp AS DATE) as date,
                timestamp,
                price,
                amount,
                price * amount as total_cost
            FROM refuel_metrics
            WHERE user_id = ?
        """
        params = [user_id]

        if start_date is not None:
            query += " AND timestamp >= ?"
            params.append(start_date)

        if end_date is not None:
            query += " AND timestamp <= ?"
            params.append(end_date)

        query += " ORDER BY timestamp ASC"

        try:
            with self._duckdb.get_connection() as con:
                df = con.execute(query, params).df()

            if df.empty:
                return []

            trends = []
            for _, row in df.iterrows():
                trends.append(
                    {
                        "date": row["date"].isoformat(),
                        "timestamp": row["timestamp"],
                        "price": row["price"],
                        "amount": row["amount"],
                        "total_cost": round(row["total_cost"], 2),
                    }
                )

            return trends
        except Exception as e:
            print(f"Error getting refuel price trends: {e}")
            return []

    def get_monthly_summary(
        self, user_id: str, year: int, month: int
    ) -> dict[str, Any]:
        """Get monthly fuel statistics."""
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        # Get cost statistics for the month
        cost_stats = self.get_total_cost_by_period(user_id, start_date, end_date)

        # Get additional statistics
        query = """
            SELECT
                MAX(price) as max_price,
                MIN(price) as min_price,
                MAX(amount) as largest_fillup,
                MIN(amount) as smallest_fillup
            FROM refuel_metrics
            WHERE user_id = ? AND timestamp >= ? AND timestamp < ?
        """

        try:
            with self._duckdb.get_connection() as con:
                result = con.execute(query, (user_id, start_date, end_date)).fetchone()

            if result and result[0] is not None:
                return {
                    **cost_stats,
                    "max_price": round(result[0], 3),
                    "min_price": round(result[1], 3),
                    "largest_fillup": round(result[2], 2),
                    "smallest_fillup": round(result[3], 2),
                }
            else:
                return {
                    **cost_stats,
                    "max_price": 0.0,
                    "min_price": 0.0,
                    "largest_fillup": 0.0,
                    "smallest_fillup": 0.0,
                }
        except Exception as e:
            print(f"Error getting monthly summary: {e}")
            return {
                **cost_stats,
                "max_price": 0.0,
                "min_price": 0.0,
                "largest_fillup": 0.0,
                "smallest_fillup": 0.0,
            }

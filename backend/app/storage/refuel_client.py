"""
DuckDB client for refuel metrics storage.
"""

import logging
from datetime import datetime
from typing import Any

from .duckdb_resource import BackendDuckDBResource
from .models import RefuelMetric

logger = logging.getLogger(__name__)


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
                    car_id VARCHAR,
                    price DOUBLE NOT NULL,
                    amount DOUBLE NOT NULL,
                    kilometers_since_last_refuel DOUBLE NOT NULL,
                    estimated_fuel_consumption DOUBLE NOT NULL,
                    notes VARCHAR,
                    station_id VARCHAR,
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

        with self._duckdb.get_connection() as con:
            for metric in metrics:
                con.execute(
                    """
                    INSERT INTO refuel_metrics (timestamp, user_id, car_id, price, amount,
                    kilometers_since_last_refuel, estimated_fuel_consumption, notes, station_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [
                        metric.timestamp,
                        user_id,
                        metric.car_id,
                        metric.price,
                        metric.amount,
                        metric.kilometers_since_last_refuel,
                        metric.estimated_fuel_consumption,
                        metric.notes,
                        metric.station_id,
                    ],
                )
        return True

    def get_metrics(
        self,
        user_id: str | None = None,
        car_id: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int | None = None,
    ) -> list[RefuelMetric]:
        """Get refuel metrics with optional filters.

        If car_id is provided, returns all refuels for that car (for shared car access).
        If only user_id is provided, returns refuels for that user.
        """
        conditions = []
        params: list = []

        # When car_id is provided, get all refuels for that car (regardless of user)
        # This supports the shared car use case where all users can see all refuels
        if car_id is not None:
            conditions.append("car_id = ?")
            params.append(car_id)
        elif user_id is not None:
            # Fallback to user-based filtering if no car_id
            conditions.append("user_id = ?")
            params.append(user_id)

        if start_date is not None:
            conditions.append("timestamp >= ?")
            params.append(start_date)

        if end_date is not None:
            conditions.append("timestamp <= ?")
            params.append(end_date)

        query = "SELECT * FROM refuel_metrics"
        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY timestamp DESC"

        if limit is not None:
            query += f" LIMIT {limit}"

        with self._duckdb.get_connection() as con:
            results = con.execute(query, params).fetchall()
            columns = [desc[0] for desc in con.description]

        return [RefuelMetric(**dict(zip(columns, row))) for row in results]

    def delete_metric(self, user_id: str, timestamp: datetime) -> bool:
        """Delete a specific metric by timestamp."""
        with self._duckdb.get_connection() as con:
            result = con.execute(
                "DELETE FROM refuel_metrics WHERE user_id = ? AND timestamp = ?",
                [user_id, timestamp],
            )
            return result.fetchone()[0] > 0  # Returns number of deleted rows

    def get_total_cost_by_period(
        self,
        user_id: str | None = None,
        car_id: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> dict[str, Any]:
        """Get aggregated cost statistics for a time period.

        If car_id is provided, returns stats for all refuels for that car.
        If only user_id is provided, returns stats for that user.
        """
        conditions = []
        params: list = []

        # When car_id is provided, get stats for all refuels for that car
        if car_id is not None:
            conditions.append("car_id = ?")
            params.append(car_id)
        elif user_id is not None:
            conditions.append("user_id = ?")
            params.append(user_id)

        if start_date is not None:
            conditions.append("timestamp >= ?")
            params.append(start_date)

        if end_date is not None:
            conditions.append("timestamp <= ?")
            params.append(end_date)

        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

        query = f"""
            SELECT
                COALESCE(SUM(price * amount), 0) as total_cost,
                COALESCE(SUM(amount), 0) as total_liters,
                COUNT(*) as fill_up_count,
                CASE
                    WHEN SUM(amount) > 0 THEN SUM(price * amount) / SUM(amount)
                    ELSE 0
                END as average_price_per_liter
            FROM refuel_metrics
            {where_clause}
        """

        with self._duckdb.get_connection() as con:
            result = con.execute(query, params).fetchone()

        return {
            "total_cost": round(result[0], 2),
            "total_liters": round(result[1], 2),
            "fill_up_count": result[2],
            "average_price_per_liter": round(result[3], 3),
        }

    def get_price_trends(
        self,
        user_id: str | None = None,
        car_id: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> list[dict[str, Any]]:
        """Get price trends over time.

        If car_id is provided, returns trends for all refuels for that car.
        If only user_id is provided, returns trends for that user.
        """
        conditions = []
        params: list = []

        # When car_id is provided, get trends for all refuels for that car
        if car_id is not None:
            conditions.append("car_id = ?")
            params.append(car_id)
        elif user_id is not None:
            conditions.append("user_id = ?")
            params.append(user_id)

        if start_date is not None:
            conditions.append("timestamp >= ?")
            params.append(start_date)

        if end_date is not None:
            conditions.append("timestamp <= ?")
            params.append(end_date)

        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

        query = f"""
            SELECT
                CAST(timestamp AS DATE) as date,
                timestamp,
                price,
                amount,
                price * amount as total_cost
            FROM refuel_metrics
            {where_clause}
            ORDER BY timestamp ASC
        """

        with self._duckdb.get_connection() as con:
            results = con.execute(query, params).fetchall()

        trends = []
        for row in results:
            trends.append(
                {
                    "date": row[0].isoformat(),
                    "timestamp": row[1],
                    "price": row[2],
                    "amount": row[3],
                    "total_cost": round(row[4], 2),
                }
            )
        return trends

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

    def get_favorite_stations_for_dropdown(
        self, user_id: str, fuel_station_client
    ) -> list[dict[str, Any]]:
        """
        Get user's favorite stations with basic info for dropdown selection.
        Returns station information without fuel prices.

        Args:
            user_id: The user ID
            fuel_station_client: FuelStationClient instance for fetching station data

        Returns:
            List of dictionaries with station_id, brand, street, house_number, and place
        """
        # Get favorite stations with full info using the FuelStationClient
        stations = fuel_station_client.get_favorite_stations_with_info(user_id)

        # Convert to simplified format for dropdown
        dropdown_stations = []
        for station in stations:
            dropdown_stations.append(
                {
                    "station_id": station.station_id,
                    "brand": station.brand,
                    "street": station.street,
                    "house_number": station.house_number,
                    "place": station.place,
                }
            )

        return dropdown_stations

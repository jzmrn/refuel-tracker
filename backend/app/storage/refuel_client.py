"""
SQLite client for refuel metrics storage.
"""

import logging
from datetime import datetime
from typing import Any

from fueldata.utils import to_utc_iso

from ..models import FavoriteStationsDropdownResponse, StationDropdownItem
from .models import RefuelMetric
from .sqlite_resource import BackendSQLiteResource

logger = logging.getLogger(__name__)


class RefuelDataClient:
    """Client for storing refuel metrics in SQLite."""

    def __init__(self, db: BackendSQLiteResource):
        """
        Initialize the RefuelDataClient.

        Args:
            db: BackendSQLiteResource for database operations
        """
        self._db = db
        with self._db.get_connection() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS refuel_metrics (
                    timestamp TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    car_id TEXT,
                    price REAL NOT NULL,
                    amount REAL NOT NULL,
                    kilometers_since_last_refuel REAL NOT NULL,
                    estimated_fuel_consumption REAL NOT NULL,
                    notes TEXT,
                    station_id TEXT,
                    fuel_type TEXT,
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
            # Add fuel_type column if it doesn't exist (migration for existing databases)
            columns = {
                row[1] for row in con.execute("PRAGMA table_info(refuel_metrics)")
            }
            if "fuel_type" not in columns:
                logger.info("Migrating refuel_metrics: adding fuel_type column")
                con.execute("ALTER TABLE refuel_metrics ADD COLUMN fuel_type TEXT")

    def add_metric(self, metric: RefuelMetric, user_id: str) -> bool:
        """Add a single refuel metric."""
        return self.add_metrics([metric], user_id)

    def add_metrics(self, metrics: list[RefuelMetric], user_id: str) -> bool:
        """Add multiple refuel metrics efficiently."""
        if not metrics:
            return True

        with self._db.get_connection() as con:
            for metric in metrics:
                con.execute(
                    """
                    INSERT INTO refuel_metrics (timestamp, user_id, car_id, price, amount,
                    kilometers_since_last_refuel, estimated_fuel_consumption, notes, station_id, fuel_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [
                        to_utc_iso(metric.timestamp),
                        user_id,
                        metric.car_id,
                        metric.price,
                        metric.amount,
                        metric.kilometers_since_last_refuel,
                        metric.estimated_fuel_consumption,
                        metric.notes,
                        metric.station_id,
                        metric.fuel_type,
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

        with self._db.get_connection() as con:
            cursor = con.execute(query, params)
            columns = [desc[0] for desc in cursor.description]
            results = cursor.fetchall()

        return [RefuelMetric(**dict(zip(columns, row))) for row in results]

    def delete_metric(self, user_id: str, timestamp: datetime) -> bool:
        """Delete a specific metric by timestamp."""
        with self._db.get_connection() as con:
            cursor = con.execute(
                "DELETE FROM refuel_metrics WHERE user_id = ? AND timestamp = ?",
                [user_id, to_utc_iso(timestamp)],
            )
            return cursor.rowcount > 0

    def update_metric(
        self,
        user_id: str,
        timestamp: datetime,
        updates: dict[str, Any],
    ) -> RefuelMetric | None:
        """Update a specific refuel metric by timestamp.

        Args:
            user_id: The user ID who owns the metric
            timestamp: The timestamp of the metric to update
            updates: Dictionary of fields to update (only non-None values)

        Returns:
            The updated RefuelMetric if found and updated, None otherwise
        """
        # Only allow updating these fields (not primary key fields or station_id)
        allowed_fields = {
            "price",
            "amount",
            "kilometers_since_last_refuel",
            "estimated_fuel_consumption",
            "notes",
            "fuel_type",
        }

        # Filter to only allowed fields with non-None values
        filtered_updates = {
            k: v for k, v in updates.items() if k in allowed_fields and v is not None
        }

        if not filtered_updates:
            # No valid updates, just return the existing metric
            metrics = self.get_metrics(user_id=user_id)
            for m in metrics:
                if to_utc_iso(m.timestamp) == to_utc_iso(timestamp):
                    return m
            return None

        # Build the SET clause
        set_clause = ", ".join(f"{k} = ?" for k in filtered_updates.keys())
        params = list(filtered_updates.values()) + [user_id, to_utc_iso(timestamp)]

        with self._db.get_connection() as con:
            cursor = con.execute(
                f"""
                UPDATE refuel_metrics
                SET {set_clause}
                WHERE user_id = ? AND timestamp = ?
                """,
                params,
            )

            if cursor.rowcount == 0:
                return None

            # Fetch and return the updated metric
            cursor = con.execute(
                "SELECT * FROM refuel_metrics WHERE user_id = ? AND timestamp = ?",
                [user_id, to_utc_iso(timestamp)],
            )
            columns = [desc[0] for desc in cursor.description]
            row = cursor.fetchone()

            if row:
                return RefuelMetric(**dict(zip(columns, row)))
            return None

    def get_filter_options(self, car_id: str) -> dict[str, Any]:
        """Get available filter options for refuel entries of a car.

        Returns:
            Dictionary with:
            - stations: List of unique stations used for this car
            - years: List of years with refuel entries
            - fuel_types: List of fuel types used
        """
        with self._db.get_connection() as con:
            # Get unique station IDs
            stations_cursor = con.execute(
                """
                SELECT DISTINCT station_id
                FROM refuel_metrics
                WHERE car_id = ? AND station_id IS NOT NULL
                """,
                [car_id],
            )
            station_ids = [row[0] for row in stations_cursor.fetchall()]

            # Get unique years
            years_cursor = con.execute(
                """
                SELECT DISTINCT strftime('%Y', timestamp) as year
                FROM refuel_metrics
                WHERE car_id = ?
                ORDER BY year DESC
                """,
                [car_id],
            )
            years = [int(row[0]) for row in years_cursor.fetchall()]

            # Get unique fuel types
            fuel_types_cursor = con.execute(
                """
                SELECT DISTINCT fuel_type
                FROM refuel_metrics
                WHERE car_id = ? AND fuel_type IS NOT NULL
                """,
                [car_id],
            )
            fuel_types = [row[0] for row in fuel_types_cursor.fetchall()]

        return {
            "station_ids": station_ids,
            "years": years,
            "fuel_types": fuel_types,
        }

    def get_metrics_paginated(
        self,
        car_id: str,
        offset: int = 0,
        limit: int = 20,
        sort_by: str = "timestamp",
        sort_order: str = "desc",
        station_id: str | None = None,
        fuel_type: str | None = None,
        year: int | None = None,
    ) -> tuple[list[RefuelMetric], int]:
        """Get refuel metrics with pagination, sorting, and filtering.

        Args:
            car_id: The car ID to filter by
            offset: Number of records to skip
            limit: Maximum number of records to return
            sort_by: Field to sort by (timestamp, price, amount, consumption, total_cost)
            sort_order: Sort order (asc or desc)
            station_id: Optional station ID filter
            fuel_type: Optional fuel type filter
            year: Optional year filter

        Returns:
            Tuple of (list of metrics, total count)
        """
        # Map sort_by to actual columns/expressions
        sort_mapping = {
            "timestamp": "timestamp",
            "price": "price",
            "amount": "amount",
            "consumption": "(amount / kilometers_since_last_refuel) * 100",
            "total_cost": "price * amount",
            "kilometers": "kilometers_since_last_refuel",
        }

        sort_column = sort_mapping.get(sort_by, "timestamp")
        sort_dir = "ASC" if sort_order.lower() == "asc" else "DESC"

        conditions = ["car_id = ?"]
        params: list[Any] = [car_id]

        if station_id:
            conditions.append("station_id = ?")
            params.append(station_id)

        if fuel_type:
            conditions.append("fuel_type = ?")
            params.append(fuel_type)

        if year:
            conditions.append("strftime('%Y', timestamp) = ?")
            params.append(str(year))

        where_clause = " AND ".join(conditions)

        # Get total count
        count_query = f"SELECT COUNT(*) FROM refuel_metrics WHERE {where_clause}"
        with self._db.get_connection() as con:
            total_count = con.execute(count_query, params).fetchone()[0]

            # Get paginated results
            query = f"""
                SELECT *
                FROM refuel_metrics
                WHERE {where_clause}
                ORDER BY {sort_column} {sort_dir}
                LIMIT ? OFFSET ?
            """
            cursor = con.execute(query, params + [limit, offset])
            columns = [desc[0] for desc in cursor.description]
            results = cursor.fetchall()

        metrics = [RefuelMetric(**dict(zip(columns, row))) for row in results]
        return metrics, total_count

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

        with self._db.get_connection() as con:
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
                DATE(timestamp) as date,
                timestamp,
                price,
                amount,
                price * amount as total_cost
            FROM refuel_metrics
            {where_clause}
            ORDER BY timestamp ASC
        """

        with self._db.get_connection() as con:
            results = con.execute(query, params).fetchall()

        trends = []
        for row in results:
            trends.append(
                {
                    "date": row[0],
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

        with self._db.get_connection() as con:
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

    @staticmethod
    def _station_to_dropdown(station) -> StationDropdownItem:
        return StationDropdownItem(
            station_id=station.station_id,
            brand=station.brand,
            street=station.street,
            house_number=station.house_number,
            place=station.place,
        )

    def get_favorite_stations_for_dropdown(
        self,
        user_id: str,
        fuel_station_client,
        user_lat: float | None = None,
        user_lng: float | None = None,
    ) -> FavoriteStationsDropdownResponse:
        """
        Get user's favorite stations with basic info for dropdown selection,
        and optionally the closest station to the user's position.
        """
        stations = fuel_station_client.get_favorite_stations_with_info(user_id)

        dropdown_stations = [self._station_to_dropdown(s) for s in stations]

        closest = None
        if user_lat is not None and user_lng is not None:
            closest_station = fuel_station_client.find_closest_station(
                user_lat, user_lng
            )
            if closest_station is not None:
                closest = self._station_to_dropdown(closest_station)

        return FavoriteStationsDropdownResponse(
            favorites=dropdown_stations, closest=closest
        )

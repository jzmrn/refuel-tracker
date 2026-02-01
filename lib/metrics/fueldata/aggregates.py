import logging
from datetime import date, datetime

import numpy as np
import pandas as pd
from dagster_duckdb import DuckDBResource
from pydantic import BaseModel, field_validator

logger = logging.getLogger(__name__)


class DailyAggregate(BaseModel):
    """Represents daily aggregated fuel price data for a station."""

    date: date
    station_id: str
    type: str
    n_samples: int
    n_unique_prices: int
    price_mean: float
    price_min: float
    price_max: float
    price_std: float | None
    ts_min: datetime
    ts_max: datetime

    @field_validator("price_mean", "price_min", "price_max", "price_std", mode="before")
    @classmethod
    def convert_nan_to_none(cls, v):
        """Convert NaN values to None for JSON serialization."""
        if isinstance(v, float) and np.isnan(v):
            return None
        return v


class AggregatedFuelDataClient:
    """Client for storing fuel data."""

    def __init__(self, duckdb: DuckDBResource):
        """
        Initialize the FuelPriceData client.

        Args:
            con: DuckDBResource for database operations
        """

        self._duckdb = duckdb
        with self._duckdb.get_connection() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS daily_aggregates (
                    date DATE NOT NULL,
                    station_id VARCHAR NOT NULL,
                    type VARCHAR NOT NULL,
                    n_samples INTEGER NOT NULL,
                    n_unique_prices INTEGER NOT NULL DEFAULT 0,
                    price_mean DOUBLE NOT NULL,
                    price_min DOUBLE NOT NULL,
                    price_max DOUBLE NOT NULL,
                    price_std DOUBLE,
                    ts_min TIMESTAMP NOT NULL,
                    ts_max TIMESTAMP NOT NULL,
                    PRIMARY KEY (date, station_id, type)
                )
            """
            )
        self._run_migrations()

    def _run_migrations(self) -> None:
        """Run any pending migrations for the daily_aggregates table."""
        self._migrate_add_n_unique_prices()
        self._migrate_price_std_nullable()

    def _migrate_add_n_unique_prices(self) -> None:
        """Add n_unique_prices column if it doesn't exist."""
        with self._duckdb.get_connection() as con:
            result = con.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'daily_aggregates' AND column_name = 'n_unique_prices'
                """
            ).fetchone()

            if not result:
                logger.info("Adding n_unique_prices column to daily_aggregates table")
                con.execute(
                    """
                    ALTER TABLE daily_aggregates
                    ADD COLUMN n_unique_prices INTEGER
                    """
                )
                # Set default value for existing rows
                con.execute(
                    """
                    UPDATE daily_aggregates SET n_unique_prices = 0 WHERE n_unique_prices IS NULL
                    """
                )
                logger.info("n_unique_prices column added successfully")

    def _migrate_price_std_nullable(self) -> None:
        """Make price_std column nullable to handle single-sample aggregates."""
        with self._duckdb.get_connection() as con:
            # Check if the column is currently NOT NULL
            result = con.execute(
                """
                SELECT is_nullable
                FROM information_schema.columns
                WHERE table_name = 'daily_aggregates' AND column_name = 'price_std'
                """
            ).fetchone()

            if result and result[0] == "NO":
                logger.info(
                    "Making price_std column nullable in daily_aggregates table"
                )
                # DuckDB doesn't support ALTER COLUMN directly, need to recreate
                con.execute(
                    """
                    ALTER TABLE daily_aggregates ALTER COLUMN price_std DROP NOT NULL
                    """
                )
                logger.info("price_std column is now nullable")

    def _ensure_table_exists(self) -> None:
        """Ensure the daily_aggregates table exists (no-op since created in __init__)."""
        pass

    def store_daily_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Store daily aggregate data into the database.

        Args:
            df: DataFrame with daily aggregate data
        """
        logger.info(
            "Storing daily aggregates", extra={"row_count": len(df), "empty": df.empty}
        )

        if not df.empty:
            with self._duckdb.get_connection() as con:
                con.execute(
                    """
                    INSERT OR REPLACE INTO daily_aggregates
                        (date, station_id, type, n_samples, n_unique_prices,
                         price_mean, price_min, price_max, price_std,
                         ts_min, ts_max)
                    SELECT df.date, df.station_id, df.type, df.n_samples, df.n_unique_prices,
                           df.price_mean, df.price_min, df.price_max, df.price_std,
                           df.ts_min, df.ts_max
                    FROM df
                """
                )

        return df

    def read_daily_aggregates(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        station_id: str | None = None,
        fuel_type: str | None = None,
    ) -> pd.DataFrame:
        """
        Read daily aggregate data from the database.

        Args:
            start_date: Optional start date for filtering (inclusive)
            end_date: Optional end date for filtering (inclusive)
            station_id: Optional station ID to filter by
            fuel_type: Optional fuel type to filter by (e5, e10, diesel)

        Returns:
            DataFrame with daily aggregate data
        """

        self._ensure_table_exists()

        query = "SELECT * FROM daily_aggregates"
        params = []
        conditions = []

        if start_date is not None:
            conditions.append("date >= ?")
            params.append(start_date.date())

        if end_date is not None:
            conditions.append("date <= ?")
            params.append(end_date.date())

        if station_id is not None:
            conditions.append("station_id = ?")
            params.append(station_id)

        if fuel_type is not None:
            conditions.append("type = ?")
            params.append(fuel_type)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY date DESC"

        with self._duckdb.get_connection() as con:
            df = con.execute(query, params).df()

        return df

    def get_daily_aggregates(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        station_id: str | None = None,
        fuel_type: str | None = None,
    ) -> list[DailyAggregate]:
        """
        Get daily aggregate data from the database within the specified date range.

        Args:
            start_date: Optional start date for filtering (inclusive)
            end_date: Optional end date for filtering (inclusive)
            station_id: Optional station ID to filter by
            fuel_type: Optional fuel type to filter by (e5, e10, diesel)

        Returns:
            List of DailyAggregate objects
        """

        df = self.read_daily_aggregates(start_date, end_date, station_id, fuel_type)
        records = df.to_dict(orient="records")
        return [DailyAggregate.model_validate(record) for record in records]

    def get_station_daily_aggregates(
        self,
        station_id: str,
        fuel_type: str,
        days: int = 7,
    ) -> list[DailyAggregate]:
        """
        Get daily aggregate data for a specific station and fuel type.

        Args:
            station_id: The station ID to filter by
            fuel_type: The fuel type to filter by (e5, e10, diesel)
            days: Number of days to look back (default 7)

        Returns:
            List of DailyAggregate objects sorted by date descending
        """
        self._ensure_table_exists()

        query = """
            SELECT * FROM daily_aggregates
            WHERE station_id = ?
              AND type = ?
              AND date >= CURRENT_DATE - INTERVAL ? DAY
            ORDER BY date DESC
        """

        with self._duckdb.get_connection() as con:
            df = con.execute(query, [station_id, fuel_type, days]).df()

        records = df.to_dict(orient="records")
        return [DailyAggregate.model_validate(record) for record in records]

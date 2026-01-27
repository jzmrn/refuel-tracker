"""Client for compressed fuel price data - stores only price changes."""

import logging
from datetime import date, datetime

import numpy as np
import pandas as pd
from dagster_duckdb import DuckDBResource
from pydantic import BaseModel, field_validator

logger = logging.getLogger(__name__)


class CompressedPriceEntry(BaseModel):
    """Represents a single fuel price change event."""

    timestamp: datetime
    station_id: str
    fuel_type: str
    price: float

    @field_validator("price", mode="before")
    @classmethod
    def convert_nan_to_none(cls, v):
        """Convert NaN values to None for JSON serialization."""
        if isinstance(v, float) and np.isnan(v):
            return None
        return v


class CompressedFuelDataClient:
    """Client for compressed fuel data - stores only price changes."""

    def __init__(self, duckdb: DuckDBResource):
        """
        Initialize the CompressedFuelData client.

        Args:
            duckdb: DuckDBResource for database operations
        """

        self._duckdb = duckdb
        self._ensure_table_exists()

    def _ensure_table_exists(self) -> None:
        """Create the compressed fuel prices table if it doesn't exist."""
        with self._duckdb.get_connection() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS compressed_fuel_prices (
                    timestamp TIMESTAMP NOT NULL,
                    station_id VARCHAR NOT NULL,
                    fuel_type VARCHAR NOT NULL,
                    price DOUBLE NOT NULL,
                    PRIMARY KEY (timestamp, station_id, fuel_type)
                )
            """
            )

    def store_compressed_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Store compressed fuel data into the database.

        Args:
            df: DataFrame with compressed fuel price data
                Expected columns: timestamp, station_id, fuel_type, price
        """
        logger.info(
            "Storing compressed fuel data",
            extra={"row_count": len(df), "empty": df.empty},
        )

        if not df.empty:
            with self._duckdb.get_connection() as con:
                con.execute(
                    """
                    INSERT OR REPLACE INTO compressed_fuel_prices
                    SELECT timestamp, station_id, fuel_type, price
                    FROM df
                """
                )

        return df

    def read_compressed_data(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        station_id: str | None = None,
        fuel_type: str | None = None,
    ) -> pd.DataFrame:
        """
        Read compressed fuel data from the database.

        Args:
            start_date: Optional start date for filtering (inclusive)
            end_date: Optional end date for filtering (inclusive)
            station_id: Optional station ID for filtering
            fuel_type: Optional fuel type for filtering (e5, e10, diesel)

        Returns:
            DataFrame with compressed fuel price data
        """

        self._ensure_table_exists()

        query = "SELECT * FROM compressed_fuel_prices"
        params = []
        conditions = []

        if start_date is not None:
            conditions.append("timestamp >= ?")
            params.append(start_date)

        if end_date is not None:
            conditions.append("timestamp <= ?")
            params.append(end_date)

        if station_id is not None:
            conditions.append("station_id = ?")
            params.append(station_id)

        if fuel_type is not None:
            conditions.append("fuel_type = ?")
            params.append(fuel_type)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY timestamp ASC"

        with self._duckdb.get_connection() as con:
            df = con.execute(query, params).df()

        return df

    def get_compressed_data(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        station_id: str | None = None,
        fuel_type: str | None = None,
    ) -> list[CompressedPriceEntry]:
        """
        Get compressed fuel data from the database within the specified filters.

        Args:
            start_date: Optional start date for filtering (inclusive)
            end_date: Optional end date for filtering (inclusive)
            station_id: Optional station ID for filtering
            fuel_type: Optional fuel type for filtering (e5, e10, diesel)

        Returns:
            List of CompressedPriceEntry objects
        """

        df = self.read_compressed_data(start_date, end_date, station_id, fuel_type)
        records = df.to_dict(orient="records")
        return [CompressedPriceEntry.model_validate(record) for record in records]

    def get_latest_prices(
        self,
        station_ids: list[str] | None = None,
    ) -> pd.DataFrame:
        """
        Get the most recent price for each station and fuel type.

        Args:
            station_ids: Optional list of station IDs to filter

        Returns:
            DataFrame with latest prices per station and fuel type
        """

        self._ensure_table_exists()

        query = """
            SELECT timestamp, station_id, fuel_type, price
            FROM compressed_fuel_prices
            WHERE (station_id, fuel_type, timestamp) IN (
                SELECT station_id, fuel_type, MAX(timestamp)
                FROM compressed_fuel_prices
                GROUP BY station_id, fuel_type
            )
        """
        params = []

        if station_ids:
            placeholders = ", ".join(["?" for _ in station_ids])
            query = f"""
                SELECT timestamp, station_id, fuel_type, price
                FROM compressed_fuel_prices
                WHERE station_id IN ({placeholders})
                  AND (station_id, fuel_type, timestamp) IN (
                    SELECT station_id, fuel_type, MAX(timestamp)
                    FROM compressed_fuel_prices
                    WHERE station_id IN ({placeholders})
                    GROUP BY station_id, fuel_type
                )
            """
            params = station_ids + station_ids

        with self._duckdb.get_connection() as con:
            df = con.execute(query, params).df()

        return df

    def delete_data_for_date(self, target_date: date) -> int:
        """
        Delete all compressed data for a specific date.

        Args:
            target_date: The date to delete data for

        Returns:
            Number of rows deleted
        """
        with self._duckdb.get_connection() as con:
            con.execute(
                """
                DELETE FROM compressed_fuel_prices
                WHERE DATE(timestamp) = ?
            """,
                [target_date],
            )
            # DuckDB doesn't return row count from DELETE directly
            return 0

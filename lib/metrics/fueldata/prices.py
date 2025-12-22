import logging
from datetime import datetime

import numpy as np
import pandas as pd
from dagster_duckdb import DuckDBResource
from pydantic import BaseModel, field_validator

logger = logging.getLogger(__name__)


class PriceEntry(BaseModel):
    """Represents a price entry for a gas station."""

    timestamp: datetime
    station_id: str
    station_status: str
    price_e5: float | None
    price_e10: float | None
    price_diesel: float | None

    @field_validator("price_e5", "price_e10", "price_diesel", mode="before")
    @classmethod
    def convert_nan_to_none(cls, v):
        """Convert NaN values to None for JSON serialization."""
        if isinstance(v, float) and np.isnan(v):
            return None
        return v


class FuelPriceDataClient:
    """Client for storing fuel data."""

    def __init__(self, duckdb: DuckDBResource):
        """
        Initialize the FuelPriceData client.

        Args:
            duckdb: DuckDBResource for database operations
        """

        self._duckdb = duckdb
        with self._duckdb.get_connection() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS fuel_prices (
                    timestamp TIMESTAMP NOT NULL,
                    station_id VARCHAR NOT NULL,
                    station_status VARCHAR NOT NULL,
                    price_e5 DOUBLE,
                    price_e10 DOUBLE,
                    price_diesel DOUBLE,
                    PRIMARY KEY (timestamp, station_id)
                )
            """
            )

    def store_fuel_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Store fuel data into the database.

        Args:
            df: DataFrame with fuel price data in wide format
        """
        logger.info(
            "Storing fuel price data", extra={"row_count": len(df), "empty": df.empty}
        )

        if not df.empty:
            with self._duckdb.get_connection() as con:
                con.execute("INSERT INTO fuel_prices SELECT * FROM df")

        return df

    def read_fuel_data(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> pd.DataFrame:
        """
        Read fuel data from the database.

        Args:
            start_date: Optional start date for filtering (inclusive)
            end_date: Optional end date for filtering (inclusive)

        Returns:
            DataFrame in wide format (timestamp, station_id, station_status, price_e5, price_e10, price_diesel)
        """

        query = "SELECT * FROM fuel_prices"
        params = []

        if start_date is not None and end_date is not None:
            query += " WHERE timestamp >= ? AND timestamp <= ?"
            params = [start_date, end_date]
        elif start_date is not None:
            query += " WHERE timestamp >= ?"
            params = [start_date]
        elif end_date is not None:
            query += " WHERE timestamp <= ?"
            params = [end_date]

        with self._duckdb.get_connection() as con:
            df = con.execute(query, params).df()

        return df

    def get_fuel_data(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> list[PriceEntry]:
        """
        Get fuel data from the database within the specified date range.

        Args:
            start_date: Optional start date for filtering (inclusive)
            end_date: Optional end date for filtering (inclusive)

        Returns:
            List of PriceEntry objects in wide format
        """

        query = "SELECT * FROM fuel_prices"
        params = []

        if start_date is not None and end_date is not None:
            query += " WHERE timestamp >= ? AND timestamp <= ?"
            params = [start_date, end_date]
        elif start_date is not None:
            query += " WHERE timestamp >= ?"
            params = [start_date]
        elif end_date is not None:
            query += " WHERE timestamp <= ?"
            params = [end_date]

        with self._duckdb.get_connection() as con:
            df = con.execute(query, params).df()

        records = df.to_dict(orient="records")
        return [PriceEntry.model_validate(record) for record in records]

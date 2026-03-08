import logging
from datetime import datetime

import numpy as np
import pandas as pd
from pydantic import BaseModel, field_validator

from .utils import SQLiteResource, to_utc_iso

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


class PriceHistoryPoint(BaseModel):
    """Represents a price data point in history."""

    timestamp: datetime
    price_e5: float | None = None
    price_e10: float | None = None
    price_diesel: float | None = None

    @field_validator("price_e5", "price_e10", "price_diesel", mode="before")
    @classmethod
    def convert_nan_to_none(cls, v):
        """Convert NaN values to None for JSON serialization."""
        if isinstance(v, float) and np.isnan(v):
            return None
        return v


class FuelPriceDataClient:
    """Client for storing fuel data in SQLite."""

    def __init__(self, db: SQLiteResource) -> None:
        """
        Initialize the FuelPriceData client.

        Args:
            db: A resource with a ``get_connection()`` context-manager that
                yields a sqlite3.Connection.
        """

        self._db: SQLiteResource = db
        with self._db.get_connection() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS fuel_prices (
                    timestamp TEXT NOT NULL,
                    station_id TEXT NOT NULL,
                    station_status TEXT NOT NULL,
                    price_e5 REAL,
                    price_e10 REAL,
                    price_diesel REAL,
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
            with self._db.get_connection() as con:
                # Convert timestamp to UTC ISO 8601 with Z suffix for SQLite
                write_df = df.copy()
                if "timestamp" in write_df.columns:
                    write_df["timestamp"] = write_df["timestamp"].apply(
                        lambda t: to_utc_iso(t) if isinstance(t, datetime) else t
                    )

                write_df.to_sql(
                    "fuel_prices",
                    con,
                    if_exists="append",
                    index=False,
                    method="multi",
                )

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
            DataFrame in wide format
        """

        query = "SELECT * FROM fuel_prices"
        params = []

        if start_date is not None and end_date is not None:
            query += " WHERE timestamp >= ? AND timestamp <= ?"
            params = [to_utc_iso(start_date), to_utc_iso(end_date)]
        elif start_date is not None:
            query += " WHERE timestamp >= ?"
            params = [to_utc_iso(start_date)]
        elif end_date is not None:
            query += " WHERE timestamp <= ?"
            params = [to_utc_iso(end_date)]

        with self._db.get_connection() as con:
            df = pd.read_sql_query(query, con, params=params)

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

        df = self.read_fuel_data(start_date, end_date)
        records = df.to_dict(orient="records")
        return [PriceEntry.model_validate(record) for record in records]

    def get_price_history(
        self,
        station_id: str,
        hours: int = 24,
    ) -> list[PriceHistoryPoint]:
        """
        Get price history for a station for the specified number of hours.

        Args:
            station_id: The station ID to get price history for
            hours: Number of hours to look back (default: 24)

        Returns:
            List of PriceHistoryPoint objects sorted by timestamp in ascending order
        """

        query = """
            SELECT
                timestamp,
                price_e5,
                price_e10,
                price_diesel
            FROM fuel_prices
            WHERE station_id = ?
                AND timestamp >= datetime('now', ?)
            ORDER BY timestamp ASC
        """

        with self._db.get_connection() as con:
            df = pd.read_sql_query(
                query,
                con,
                params=[station_id, f"-{hours} hours"],
            )

        records = df.to_dict(orient="records")
        return [PriceHistoryPoint.model_validate(record) for record in records]

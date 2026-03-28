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


class LatestStationPrice(BaseModel):
    """Latest price for a station with timestamps when each price was first seen."""

    station_id: str
    station_status: str
    price_e5: float | None = None
    price_e10: float | None = None
    price_diesel: float | None = None
    since_e5: datetime | None = None
    since_e10: datetime | None = None
    since_diesel: datetime | None = None
    updated_at: datetime | None = None


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

    def get_latest_prices(
        self,
        station_ids: list[str],
    ) -> list[LatestStationPrice]:
        """
        Get the latest price for each station along with the timestamp when
        each fuel type's current price was first observed (consecutive run
        backwards from the latest row).

        Args:
            station_ids: List of station IDs to query

        Returns:
            List of LatestStationPrice objects, one per station that has data.
            Stations without any data in the table are omitted.
        """
        if not station_ids:
            return []

        placeholders = ",".join("?" * len(station_ids))

        # Step 1: Get the latest row per station
        latest_query = f"""
            SELECT fp.station_id, fp.station_status,
                   fp.price_e5, fp.price_e10, fp.price_diesel, fp.timestamp
            FROM fuel_prices fp
            INNER JOIN (
                SELECT station_id, MAX(timestamp) as max_ts
                FROM fuel_prices
                WHERE station_id IN ({placeholders})
                GROUP BY station_id
            ) latest ON fp.station_id = latest.station_id
                    AND fp.timestamp = latest.max_ts
        """

        with self._db.get_connection() as con:
            con.row_factory = _dict_factory
            latest_rows = con.execute(latest_query, station_ids).fetchall()

        if not latest_rows:
            return []

        results: list[LatestStationPrice] = []

        for row in latest_rows:
            sid = row["station_id"]
            since_e5 = self._find_price_since(sid, "price_e5", row["price_e5"])
            since_e10 = self._find_price_since(sid, "price_e10", row["price_e10"])
            since_diesel = self._find_price_since(
                sid, "price_diesel", row["price_diesel"]
            )

            updated_at = (
                datetime.fromisoformat(row["timestamp"])
                if row.get("timestamp")
                else None
            )

            results.append(
                LatestStationPrice(
                    station_id=sid,
                    station_status=row["station_status"],
                    price_e5=row["price_e5"],
                    price_e10=row["price_e10"],
                    price_diesel=row["price_diesel"],
                    since_e5=since_e5,
                    since_e10=since_e10,
                    since_diesel=since_diesel,
                    updated_at=updated_at,
                )
            )

        return results

    def _find_price_since(
        self,
        station_id: str,
        column: str,
        current_value: float | None,
    ) -> datetime | None:
        """
        Find the timestamp when the current price was first seen in a
        consecutive run backwards from the latest observation.

        If the price is None (station closed / fuel type unavailable),
        returns None.
        """
        if current_value is None:
            return None

        with self._db.get_connection() as con:
            con.row_factory = _dict_factory

            # Find the latest row where the price was different
            last_diff = con.execute(
                f"""
                SELECT MAX(timestamp) as last_different
                FROM fuel_prices
                WHERE station_id = ?
                  AND ({column} != ? OR {column} IS NULL)
                """,
                [station_id, current_value],
            ).fetchone()

            if last_diff and last_diff["last_different"] is not None:
                # Price changed at some point — find the first row after that
                # where it matches the current price
                since_row = con.execute(
                    f"""
                    SELECT MIN(timestamp) as price_since
                    FROM fuel_prices
                    WHERE station_id = ?
                      AND timestamp > ?
                      AND {column} = ?
                    """,
                    [station_id, last_diff["last_different"], current_value],
                ).fetchone()

                if since_row and since_row["price_since"] is not None:
                    return datetime.fromisoformat(since_row["price_since"])

            # Price has been the same for the entire history — return earliest
            earliest = con.execute(
                f"""
                SELECT MIN(timestamp) as earliest_ts
                FROM fuel_prices
                WHERE station_id = ?
                  AND {column} = ?
                """,
                [station_id, current_value],
            ).fetchone()

            if earliest and earliest["earliest_ts"] is not None:
                return datetime.fromisoformat(earliest["earliest_ts"])

        return None


def _dict_factory(cursor, row):
    """sqlite3 row_factory that returns dicts."""
    return {col[0]: row[i] for i, col in enumerate(cursor.description)}

from datetime import datetime
from duckdb import DuckDBPyConnection
import pandas as pd

from .models import PriceEntry, DailyAggregate


class FuelDataClient:
    """Client for storing fuel data."""

    def __init__(self, con: DuckDBPyConnection):
        """
        Initialize the FuelData client.

        Args:
            con: DuckDBPyConnection for database operations
        """
        self._con = con

    def store_fuel_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Store fuel data into the database.

        Args:
            df: DataFrame with fuel price data
        """

        print(f"Storing {len(df)} rows of fuel data")

        if not df.empty:
            self._con.execute(
                """
                CREATE TABLE IF NOT EXISTS raw_fuel_prices (
                    timestamp TIMESTAMP,
                    station_id VARCHAR,
                    type VARCHAR,
                    price DOUBLE
                )
            """
            )
            self._con.execute("INSERT INTO raw_fuel_prices SELECT * FROM df")

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
            List of PriceEntry objects
        """

        query = "SELECT * FROM raw_fuel_prices"
        conditions = []

        if start_date is not None:
            conditions.append(f"timestamp >= '{start_date.isoformat()}'")

        if end_date is not None:
            conditions.append(f"timestamp <= '{end_date.isoformat()}'")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        df = self._con.execute(query).df()
        print(f"Read {len(df)} rows of fuel data")

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
            List of PriceEntry objects
        """

        df = self.read_fuel_data(start_date, end_date)
        records = df.to_dict(orient="records")
        return [PriceEntry.model_validate(record) for record in records]

    def store_daily_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Store daily aggregate data into the database.

        Args:
            df: DataFrame with daily aggregate data
        """

        print(f"Storing {len(df)} rows of daily aggregate data")

        if not df.empty:
            self._con.execute(
                """
                CREATE TABLE IF NOT EXISTS daily_aggregates (
                    date DATE,
                    station_id VARCHAR,
                    type VARCHAR,
                    n_samples INTEGER,
                    price_mean DOUBLE,
                    price_min DOUBLE,
                    price_max DOUBLE,
                    price_std DOUBLE,
                    ts_min TIMESTAMP,
                    ts_max TIMESTAMP,
                    PRIMARY KEY (date, station_id, type)
                )
            """
            )
            self._con.execute(
                """
                INSERT OR REPLACE INTO daily_aggregates 
                SELECT date, station_id, type, n_samples, 
                       price_mean, price_min, price_max, price_std,
                       ts_min, ts_max
                FROM df
            """
            )

        return df

    def read_daily_aggregates(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> pd.DataFrame:
        """
        Read daily aggregate data from the database.

        Args:
            start_date: Optional start date for filtering (inclusive)
            end_date: Optional end date for filtering (inclusive)

        Returns:
            DataFrame with daily aggregate data
        """

        query = "SELECT * FROM daily_aggregates"
        conditions = []

        if start_date is not None:
            conditions.append(f"date >= '{start_date.date().isoformat()}'")

        if end_date is not None:
            conditions.append(f"date <= '{end_date.date().isoformat()}'")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        df = self._con.execute(query).df()
        print(f"Read {len(df)} rows of daily aggregate data")

        return df

    def get_daily_aggregates(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> list[DailyAggregate]:
        """
        Get daily aggregate data from the database within the specified date range.

        Args:
            start_date: Optional start date for filtering (inclusive)
            end_date: Optional end date for filtering (inclusive)

        Returns:
            List of DailyAggregate objects
        """

        df = self.read_daily_aggregates(start_date, end_date)
        records = df.to_dict(orient="records")
        return [DailyAggregate.model_validate(record) for record in records]

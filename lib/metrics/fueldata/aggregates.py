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
    price_mean: float
    price_min: float
    price_max: float
    price_std: float
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
                    price_mean DOUBLE NOT NULL,
                    price_min DOUBLE NOT NULL,
                    price_max DOUBLE NOT NULL,
                    price_std DOUBLE NOT NULL,
                    ts_min TIMESTAMP NOT NULL,
                    ts_max TIMESTAMP NOT NULL,
                    PRIMARY KEY (date, station_id, type)
                )
            """
            )

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

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        with self._duckdb.get_connection() as con:
            df = con.execute(query, params).df()

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

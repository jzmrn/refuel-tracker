"""Client for daily aggregated fuel price data.

Data is stored as Hive-partitioned Parquet files (partitioned by date)
and read via DuckDB in-memory for efficient predicate push-down.
"""

import logging
import shutil
from datetime import date, datetime, timezone
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
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
    n_price_increased: int | None = None
    n_price_decreased: int | None = None
    ts_min: datetime
    ts_max: datetime

    @field_validator(
        "price_mean",
        "price_min",
        "price_max",
        "price_std",
        mode="before",
    )
    @classmethod
    def convert_nan_to_none(cls, v):
        """Convert NaN values to None for JSON serialization."""
        if isinstance(v, float) and np.isnan(v):
            return None
        return v

    @field_validator(
        "n_price_increased",
        "n_price_decreased",
        mode="before",
    )
    @classmethod
    def convert_price_change_counts(cls, v):
        """Convert NaN to None and float to int for price change counts."""
        if v is None:
            return None
        if isinstance(v, float):
            if np.isnan(v):
                return None
            return int(v)
        return v


def _parquet_glob(base_path: Path) -> str:
    """Return a glob pattern that DuckDB can use with ``read_parquet``."""
    return str(base_path / "**" / "*.parquet")


class AggregatedFuelDataClient:
    """Client for daily aggregated fuel price data.

    Data is stored as Hive-partitioned Parquet
    (``daily_aggregates/date=YYYY-MM-DD/data.parquet``) and queried via
    DuckDB in-memory.
    """

    def __init__(self, base_path: str):
        """
        Initialize the AggregatedFuelData client.

        Args:
            base_path: Root data directory (e.g. ``/app/data``).
                       Parquet files live under ``<base_path>/daily_aggregates/``.
        """
        self._base_path = Path(base_path) / "daily_aggregates"
        self._base_path.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def store_daily_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Store daily aggregate data as Hive-partitioned Parquet.

        The ``date`` column is used as the partition key.

        Args:
            df: DataFrame with daily aggregate data
        """
        logger.info(
            "Storing daily aggregates", extra={"row_count": len(df), "empty": df.empty}
        )

        if not df.empty:
            write_df = df.copy()
            # Ensure date column is a string for partitioning
            write_df["date"] = pd.to_datetime(write_df["date"]).dt.date.astype(str)

            table = pa.Table.from_pandas(write_df, preserve_index=False)
            pq.write_to_dataset(
                table,
                root_path=str(self._base_path),
                partition_cols=["date"],
                existing_data_behavior="delete_matching",
            )

        return df

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------

    def _query(
        self,
        filters: list[str],
        params: list,
        order_by: str = "date DESC",
        columns: str = "*",
    ) -> pd.DataFrame:
        """Run a DuckDB in-memory query against the partitioned parquet."""
        if not self._base_path.exists() or not any(self._base_path.iterdir()):
            return pd.DataFrame()

        glob = _parquet_glob(self._base_path)
        where = f" WHERE {' AND '.join(filters)}" if filters else ""
        # union_by_name=true handles schema evolution (older files may lack new columns)
        sql = (
            f"SELECT {columns} FROM read_parquet('{glob}', hive_partitioning=true, union_by_name=true)"
            f"{where} ORDER BY {order_by}"
        )

        con = duckdb.connect()
        try:
            return con.execute(sql, params).fetchdf()
        finally:
            con.close()

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def read_daily_aggregates(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        station_id: str | None = None,
        fuel_type: str | None = None,
    ) -> pd.DataFrame:
        """
        Read daily aggregate data from Parquet.

        Args:
            start_date: Optional start date for filtering (inclusive)
            end_date: Optional end date for filtering (inclusive)
            station_id: Optional station ID to filter by
            fuel_type: Optional fuel type to filter by (e5, e10, diesel)

        Returns:
            DataFrame with daily aggregate data
        """

        filters: list[str] = []
        params: list = []

        if start_date is not None:
            # Use date-only format (YYYY-MM-DD) to match parquet partition column
            date_str = start_date.strftime("%Y-%m-%d")
            params.append(date_str)
            filters.append(f"date >= ${len(params)}")

        if end_date is not None:
            # Use date-only format (YYYY-MM-DD) to match parquet partition column
            date_str = end_date.strftime("%Y-%m-%d")
            params.append(date_str)
            filters.append(f"date <= ${len(params)}")

        if station_id is not None:
            params.append(station_id)
            filters.append(f"station_id = ${len(params)}")

        if fuel_type is not None:
            params.append(fuel_type)
            filters.append(f"type = ${len(params)}")

        return self._query(filters, params)

    def get_daily_aggregates(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        station_id: str | None = None,
        fuel_type: str | None = None,
    ) -> list[DailyAggregate]:
        """
        Get daily aggregate data within the specified date range.

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

        cutoff = (datetime.now(timezone.utc) - pd.Timedelta(days=days)).strftime(
            "%Y-%m-%d"
        )
        filters = ["station_id = $1", "type = $2", "date >= $3"]
        params = [station_id, fuel_type, cutoff]

        df = self._query(filters, params)
        records = df.to_dict(orient="records")
        return [DailyAggregate.model_validate(record) for record in records]

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    def delete_data_for_date(self, target_date: date) -> int:
        """
        Delete all daily aggregate data for a specific date by removing its
        partition directory.

        Args:
            target_date: The date to delete data for

        Returns:
            0 (row count not tracked for parquet)
        """
        partition_dir = self._base_path / f"date={target_date.isoformat()}"
        if partition_dir.exists():
            shutil.rmtree(partition_dir)
            logger.info("Deleted partition %s", partition_dir)
        return 0


# ---------------------------------------------------------------------------
# Daily brand aggregate
# ---------------------------------------------------------------------------


class DailyBrandAggregate(BaseModel):
    """Daily aggregated fuel price data per brand."""

    date: date
    brand: str
    fuel_type: str
    n_stations: int
    n_samples: int
    n_unique_prices: int
    price_mean: float
    price_min: float
    price_max: float
    price_std: float | None
    n_price_increased: int | None = None
    n_price_decreased: int | None = None

    @field_validator("price_mean", "price_min", "price_max", "price_std", mode="before")
    @classmethod
    def convert_nan_to_none(cls, v):
        if isinstance(v, float) and np.isnan(v):
            return None
        return v


class DailyBrandAggregateClient:
    """Client for daily per-brand fuel price aggregates stored as parquet."""

    def __init__(self, base_path: str):
        self._base_path = Path(base_path) / "daily_agg_price_by_brand"
        self._base_path.mkdir(parents=True, exist_ok=True)

    def store_daily_brand_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        logger.info(
            "Storing daily brand aggregates",
            extra={"row_count": len(df), "empty": df.empty},
        )
        if not df.empty:
            write_df = df.copy()
            write_df["date"] = pd.to_datetime(write_df["date"]).dt.date.astype(str)
            table = pa.Table.from_pandas(write_df, preserve_index=False)
            pq.write_to_dataset(
                table,
                root_path=str(self._base_path),
                partition_cols=["date"],
                existing_data_behavior="delete_matching",
            )
        return df

    def delete_data_for_date(self, target_date: date) -> None:
        partition_dir = self._base_path / f"date={target_date.isoformat()}"
        if partition_dir.exists():
            shutil.rmtree(partition_dir)
            logger.info("Deleted partition %s", partition_dir)

    def _query(
        self,
        filters: list[str],
        params: list,
        order_by: str = "date DESC",
    ) -> pd.DataFrame:
        if not self._base_path.exists() or not any(self._base_path.iterdir()):
            return pd.DataFrame()
        glob = _parquet_glob(self._base_path)
        where = f" WHERE {' AND '.join(filters)}" if filters else ""
        # union_by_name=true handles schema evolution (older files may lack new columns)
        sql = (
            f"SELECT * FROM read_parquet('{glob}', hive_partitioning=true, union_by_name=true)"
            f"{where} ORDER BY {order_by}"
        )
        con = duckdb.connect()
        try:
            return con.execute(sql, params).fetchdf()
        finally:
            con.close()

    def read_daily_brand_aggregates(
        self,
        start_date: datetime | date | None = None,
        end_date: datetime | date | None = None,
        brand: str | None = None,
        fuel_type: str | None = None,
    ) -> pd.DataFrame:
        filters: list[str] = []
        params: list = []
        if start_date is not None:
            params.append(pd.to_datetime(start_date).date().isoformat())
            filters.append(f"date >= ${len(params)}")
        if end_date is not None:
            params.append(pd.to_datetime(end_date).date().isoformat())
            filters.append(f"date <= ${len(params)}")
        if brand is not None:
            params.append(brand)
            filters.append(f"brand = ${len(params)}")
        if fuel_type is not None:
            params.append(fuel_type)
            filters.append(f"fuel_type = ${len(params)}")
        return self._query(filters, params)

    def get_daily_brand_aggregates(
        self,
        start_date: datetime | date | None = None,
        end_date: datetime | date | None = None,
        brand: str | None = None,
        fuel_type: str | None = None,
    ) -> list[DailyBrandAggregate]:
        df = self.read_daily_brand_aggregates(start_date, end_date, brand, fuel_type)
        records = df.to_dict(orient="records")
        return [DailyBrandAggregate.model_validate(r) for r in records]


# ---------------------------------------------------------------------------
# Daily place aggregate
# ---------------------------------------------------------------------------


class DailyPlaceAggregate(BaseModel):
    """Daily aggregated fuel price data per place."""

    date: date
    place: str
    post_code: int
    fuel_type: str
    n_stations: int
    n_samples: int
    n_unique_prices: int
    price_mean: float
    price_min: float
    price_max: float
    price_std: float | None
    n_price_increased: int | None = None
    n_price_decreased: int | None = None

    @field_validator("price_mean", "price_min", "price_max", "price_std", mode="before")
    @classmethod
    def convert_nan_to_none(cls, v):
        if isinstance(v, float) and np.isnan(v):
            return None
        return v


class DailyPlaceAggregateClient:
    """Client for daily per-place fuel price aggregates stored as parquet."""

    def __init__(self, base_path: str):
        self._base_path = Path(base_path) / "daily_agg_price_by_place"
        self._base_path.mkdir(parents=True, exist_ok=True)

    def store_daily_place_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        logger.info(
            "Storing daily place aggregates",
            extra={"row_count": len(df), "empty": df.empty},
        )
        if not df.empty:
            write_df = df.copy()
            write_df["date"] = pd.to_datetime(write_df["date"]).dt.date.astype(str)
            table = pa.Table.from_pandas(write_df, preserve_index=False)
            pq.write_to_dataset(
                table,
                root_path=str(self._base_path),
                partition_cols=["date"],
                existing_data_behavior="delete_matching",
            )
        return df

    def delete_data_for_date(self, target_date: date) -> None:
        partition_dir = self._base_path / f"date={target_date.isoformat()}"
        if partition_dir.exists():
            shutil.rmtree(partition_dir)
            logger.info("Deleted partition %s", partition_dir)

    def _query(
        self,
        filters: list[str],
        params: list,
        order_by: str = "date DESC",
    ) -> pd.DataFrame:
        if not self._base_path.exists() or not any(self._base_path.iterdir()):
            return pd.DataFrame()
        glob = _parquet_glob(self._base_path)
        where = f" WHERE {' AND '.join(filters)}" if filters else ""
        # union_by_name=true handles schema evolution (older files may lack new columns)
        sql = (
            f"SELECT * FROM read_parquet('{glob}', hive_partitioning=true, union_by_name=true)"
            f"{where} ORDER BY {order_by}"
        )
        con = duckdb.connect()
        try:
            return con.execute(sql, params).fetchdf()
        finally:
            con.close()

    def read_daily_place_aggregates(
        self,
        start_date: datetime | date | None = None,
        end_date: datetime | date | None = None,
        place: str | None = None,
        post_code: int | None = None,
        fuel_type: str | None = None,
    ) -> pd.DataFrame:
        filters: list[str] = []
        params: list = []
        if start_date is not None:
            params.append(pd.to_datetime(start_date).date().isoformat())
            filters.append(f"date >= ${len(params)}")
        if end_date is not None:
            params.append(pd.to_datetime(end_date).date().isoformat())
            filters.append(f"date <= ${len(params)}")
        if place is not None:
            params.append(place)
            filters.append(f"place = ${len(params)}")
        if post_code is not None:
            params.append(post_code)
            filters.append(f"post_code = ${len(params)}")
        if fuel_type is not None:
            params.append(fuel_type)
            filters.append(f"fuel_type = ${len(params)}")
        return self._query(filters, params)

    def get_daily_place_aggregates(
        self,
        start_date: datetime | date | None = None,
        end_date: datetime | date | None = None,
        place: str | None = None,
        post_code: int | None = None,
        fuel_type: str | None = None,
    ) -> list[DailyPlaceAggregate]:
        df = self.read_daily_place_aggregates(
            start_date, end_date, place, post_code, fuel_type
        )
        records = df.to_dict(orient="records")
        return [DailyPlaceAggregate.model_validate(r) for r in records]

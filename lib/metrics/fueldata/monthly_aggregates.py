"""Clients for monthly aggregate fuel price data.

Uses DuckDB to query Hive-partitioned parquet files so that predicates
(especially on the ``date`` partition column) are pushed down to the
storage layer instead of filtering in Python after a full scan.
"""

import logging
import shutil
from datetime import date, datetime
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from pydantic import BaseModel, field_validator

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class MonthlyStationAggregate(BaseModel):
    """Monthly aggregated fuel price data per station and fuel type."""

    date: date
    station_id: str
    fuel_type: str
    n_price_changes: int
    n_unique_prices: int
    price_mean: float
    price_min: float
    price_max: float
    price_std: float | None
    n_price_increased: int | None = None
    n_price_decreased: int | None = None
    n_days: int

    @field_validator(
        "price_mean",
        "price_min",
        "price_max",
        "price_std",
        mode="before",
    )
    @classmethod
    def convert_nan_to_none(cls, v):
        if isinstance(v, float) and np.isnan(v):
            return None
        return v

    @field_validator(
        "n_price_increased",
        "n_price_decreased",
        mode="before",
    )
    @classmethod
    def convert_price_direction_counts(cls, v):
        if v is None:
            return None
        if isinstance(v, float):
            if np.isnan(v):
                return None
            return int(v)
        return v


class MonthlyBrandAggregate(BaseModel):
    """Monthly aggregated fuel price data per brand and fuel type."""

    date: date
    brand: str
    fuel_type: str
    n_stations: int
    n_price_changes: int
    n_unique_prices: int
    price_mean: float
    price_min: float
    price_max: float
    price_std: float | None
    n_price_increased: int | None = None
    n_price_decreased: int | None = None
    n_days: int

    @field_validator(
        "price_mean",
        "price_min",
        "price_max",
        "price_std",
        mode="before",
    )
    @classmethod
    def convert_nan_to_none(cls, v):
        if isinstance(v, float) and np.isnan(v):
            return None
        return v

    @field_validator(
        "n_price_increased",
        "n_price_decreased",
        mode="before",
    )
    @classmethod
    def convert_price_direction_counts(cls, v):
        if v is None:
            return None
        if isinstance(v, float):
            if np.isnan(v):
                return None
            return int(v)
        return v


class MonthlyPlaceAggregate(BaseModel):
    """Monthly aggregated fuel price data per place/post_code and fuel type."""

    date: date
    place: str
    post_code: int
    fuel_type: str
    n_stations: int
    n_price_changes: int
    n_unique_prices: int
    price_mean: float
    price_min: float
    price_max: float
    price_std: float | None
    n_price_increased: int | None = None
    n_price_decreased: int | None = None
    n_days: int

    @field_validator(
        "price_mean",
        "price_min",
        "price_max",
        "price_std",
        mode="before",
    )
    @classmethod
    def convert_nan_to_none(cls, v):
        if isinstance(v, float) and np.isnan(v):
            return None
        return v

    @field_validator(
        "n_price_increased",
        "n_price_decreased",
        mode="before",
    )
    @classmethod
    def convert_price_direction_counts(cls, v):
        if v is None:
            return None
        if isinstance(v, float):
            if np.isnan(v):
                return None
            return int(v)
        return v


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parquet_glob(base_path: Path) -> str:
    """Return a glob pattern that DuckDB can use with ``read_parquet``."""
    return str(base_path / "**" / "*.parquet")


def _store_parquet(base_path: Path, df: pd.DataFrame) -> None:
    """Write a DataFrame as Hive-partitioned Parquet (partitioned by ``date``).

    Uses ``pyarrow.parquet.write_to_dataset`` so the ``date`` column is
    stored *only* in the directory structure, not inside the data files.
    """
    if df.empty:
        return

    write_df = df.copy()
    write_df["date"] = pd.to_datetime(write_df["date"]).dt.date.astype(str)

    table = pa.Table.from_pandas(write_df, preserve_index=False)
    pq.write_to_dataset(
        table,
        root_path=str(base_path),
        partition_cols=["date"],
        existing_data_behavior="delete_matching",
    )


def _delete_partition(base_path: Path, target_date: date) -> None:
    """Remove a single date-partition directory."""
    partition_dir = base_path / f"date={target_date.isoformat()}"
    if partition_dir.exists():
        shutil.rmtree(partition_dir)
        logger.info("Deleted partition %s", partition_dir)


def _query_parquet(
    base_path: Path,
    filters: list[str],
    params: list,
    order_by: str = "date DESC",
) -> pd.DataFrame:
    """Execute a DuckDB query against a Hive-partitioned parquet directory.

    Parameters
    ----------
    base_path:
        Root of the partitioned parquet dataset.
    filters:
        SQL WHERE-clause fragments (will be ``AND``-joined).
    params:
        Positional bind parameters (``$1``, ``$2``, …).
    order_by:
        SQL ORDER BY clause (default ``date DESC``).
    """
    if not base_path.exists():
        logger.warning("Parquet directory not found: %s", base_path)
        return pd.DataFrame()

    glob = _parquet_glob(base_path)
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


# ---------------------------------------------------------------------------
# Client: monthly per-station aggregates
# ---------------------------------------------------------------------------


class MonthlyStationAggregateClient:
    """Client for monthly per-station fuel price aggregates stored as parquet."""

    def __init__(self, base_path: str):
        self._base_path = Path(base_path) / "monthly_agg_price_by_station"
        self._base_path.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Write / Delete
    # ------------------------------------------------------------------

    def store_monthly_station_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """Store monthly per-station aggregates as Hive-partitioned Parquet.

        The ``date`` column is used as the partition key and will be
        stripped from the data files (reconstructed via hive_partitioning
        on read).
        """
        logger.info(
            "Storing monthly station aggregates",
            extra={"row_count": len(df), "empty": df.empty},
        )
        _store_parquet(self._base_path, df)
        return df

    def delete_data_for_date(self, target_date: date) -> None:
        """Delete the partition directory for *target_date*."""
        _delete_partition(self._base_path, target_date)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def read_monthly_station_aggregates(
        self,
        start_date: datetime | date | None = None,
        end_date: datetime | date | None = None,
        station_id: str | None = None,
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
        if station_id is not None:
            params.append(station_id)
            filters.append(f"station_id = ${len(params)}")
        if fuel_type is not None:
            params.append(fuel_type)
            filters.append(f"fuel_type = ${len(params)}")

        return _query_parquet(self._base_path, filters, params)

    def get_monthly_station_aggregates(
        self,
        start_date: datetime | date | None = None,
        end_date: datetime | date | None = None,
        station_id: str | None = None,
        fuel_type: str | None = None,
    ) -> list[MonthlyStationAggregate]:
        df = self.read_monthly_station_aggregates(
            start_date, end_date, station_id, fuel_type
        )
        records = df.to_dict(orient="records")
        return [MonthlyStationAggregate.model_validate(r) for r in records]


# ---------------------------------------------------------------------------
# Client: monthly per-brand aggregates
# ---------------------------------------------------------------------------


class MonthlyBrandAggregateClient:
    """Client for monthly per-brand fuel price aggregates stored as parquet."""

    def __init__(self, base_path: str):
        self._base_path = Path(base_path) / "monthly_agg_price_by_brand"
        self._base_path.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Write / Delete
    # ------------------------------------------------------------------

    def store_monthly_brand_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """Store monthly per-brand aggregates as Hive-partitioned Parquet.

        The ``date`` column is used as the partition key and will be
        stripped from the data files.
        """
        logger.info(
            "Storing monthly brand aggregates",
            extra={"row_count": len(df), "empty": df.empty},
        )
        _store_parquet(self._base_path, df)
        return df

    def delete_data_for_date(self, target_date: date) -> None:
        """Delete the partition directory for *target_date*."""
        _delete_partition(self._base_path, target_date)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def read_monthly_brand_aggregates(
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

        return _query_parquet(self._base_path, filters, params)

    def get_monthly_brand_aggregates(
        self,
        start_date: datetime | date | None = None,
        end_date: datetime | date | None = None,
        brand: str | None = None,
        fuel_type: str | None = None,
    ) -> list[MonthlyBrandAggregate]:
        df = self.read_monthly_brand_aggregates(start_date, end_date, brand, fuel_type)
        records = df.to_dict(orient="records")
        return [MonthlyBrandAggregate.model_validate(r) for r in records]


# ---------------------------------------------------------------------------
# Client: monthly per-place aggregates
# ---------------------------------------------------------------------------


class MonthlyPlaceAggregateClient:
    """Client for monthly per-place fuel price aggregates stored as parquet."""

    def __init__(self, base_path: str):
        self._base_path = Path(base_path) / "monthly_agg_price_by_place"
        self._base_path.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Write / Delete
    # ------------------------------------------------------------------

    def store_monthly_place_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """Store monthly per-place aggregates as Hive-partitioned Parquet.

        The ``date`` column is used as the partition key and will be
        stripped from the data files.
        """
        logger.info(
            "Storing monthly place aggregates",
            extra={"row_count": len(df), "empty": df.empty},
        )
        _store_parquet(self._base_path, df)
        return df

    def delete_data_for_date(self, target_date: date) -> None:
        """Delete the partition directory for *target_date*."""
        _delete_partition(self._base_path, target_date)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def read_monthly_place_aggregates(
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

        return _query_parquet(self._base_path, filters, params)

    def get_monthly_place_aggregates(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        place: str | None = None,
        post_code: int | None = None,
        fuel_type: str | None = None,
    ) -> list[MonthlyPlaceAggregate]:
        df = self.read_monthly_place_aggregates(
            start_date, end_date, place, post_code, fuel_type
        )
        records = df.to_dict(orient="records")
        return [MonthlyPlaceAggregate.model_validate(r) for r in records]

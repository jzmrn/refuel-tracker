"""Clients for monthly aggregate fuel price data.

Uses DuckDB to query Hive-partitioned parquet files so that predicates
(especially on the ``date`` partition column) are pushed down to the
storage layer instead of filtering in Python after a full scan.
"""

import logging
from datetime import date, datetime
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parquet_glob(base_path: Path) -> str:
    """Return a glob pattern that DuckDB can use with ``read_parquet``."""
    return str(base_path / "**" / "*.parquet")


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
    sql = (
        f"SELECT * FROM read_parquet('{glob}', hive_partitioning=true)"
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
    """Client for reading monthly per-station fuel price aggregates from parquet."""

    def __init__(self, base_path: str):
        self._base_path = Path(base_path) / "monthly_station_aggregates"

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
    """Client for reading monthly per-brand fuel price aggregates from parquet."""

    def __init__(self, base_path: str):
        self._base_path = Path(base_path) / "monthly_brand_aggregates"

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
    """Client for reading monthly per-place fuel price aggregates from parquet."""

    def __init__(self, base_path: str):
        self._base_path = Path(base_path) / "monthly_place_aggregates"

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

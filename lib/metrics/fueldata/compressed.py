"""Client for compressed fuel price data - stores only price changes.

Data is stored as Hive-partitioned Parquet files (partitioned by date)
and read via DuckDB in-memory for efficient predicate push-down.
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

from .utils import to_utc_iso

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


def _parquet_glob(base_path: Path) -> str:
    """Return a glob pattern that DuckDB can use with ``read_parquet``."""
    return str(base_path / "**" / "*.parquet")


class CompressedFuelDataClient:
    """Client for compressed fuel data - stores only price changes.

    Data is stored as Hive-partitioned Parquet (``compressed_fuel_prices/date=YYYY-MM-DD/data.parquet``)
    and queried via DuckDB in-memory.
    """

    def __init__(self, base_path: str):
        """
        Initialize the CompressedFuelData client.

        Args:
            base_path: Root data directory (e.g. ``/app/data``).
                       Parquet files live under ``<base_path>/compressed_fuel_prices/``.
        """
        self._base_path = Path(base_path) / "compressed_fuel_prices"
        self._base_path.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def store_compressed_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Store compressed fuel data as Hive-partitioned Parquet.

        The ``date`` partition key is derived from the ``timestamp`` column.

        Args:
            df: DataFrame with columns: timestamp, station_id, fuel_type, price
        """
        logger.info(
            "Storing compressed fuel data",
            extra={"row_count": len(df), "empty": df.empty},
        )

        if not df.empty:
            write_df = df.copy()
            # Derive partition column
            write_df["date"] = pd.to_datetime(
                write_df["timestamp"], format="ISO8601"
            ).dt.date.astype(str)

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
        order_by: str = "timestamp ASC",
        columns: str = "* EXCLUDE (date)",
    ) -> pd.DataFrame:
        """Run a DuckDB in-memory query against the partitioned parquet."""
        if not self._base_path.exists() or not any(self._base_path.iterdir()):
            return pd.DataFrame()

        glob = _parquet_glob(self._base_path)
        where = f" WHERE {' AND '.join(filters)}" if filters else ""
        sql = (
            f"SELECT {columns} FROM read_parquet('{glob}', hive_partitioning=true)"
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

    def read_compressed_data(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        station_id: str | None = None,
        fuel_type: str | None = None,
    ) -> pd.DataFrame:
        """
        Read compressed fuel data from Parquet.

        Args:
            start_date: Optional start date for filtering (inclusive)
            end_date: Optional end date for filtering (inclusive)
            station_id: Optional station ID for filtering
            fuel_type: Optional fuel type for filtering (e5, e10, diesel)

        Returns:
            DataFrame with compressed fuel price data
        """

        filters: list[str] = []
        params: list = []

        if start_date is not None:
            params.append(to_utc_iso(start_date))
            filters.append(f"timestamp >= ${len(params)}")

        if end_date is not None:
            params.append(to_utc_iso(end_date))
            filters.append(f"timestamp <= ${len(params)}")

        if station_id is not None:
            params.append(station_id)
            filters.append(f"station_id = ${len(params)}")

        if fuel_type is not None:
            params.append(fuel_type)
            filters.append(f"fuel_type = ${len(params)}")

        return self._query(filters, params)

    def get_compressed_data(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        station_id: str | None = None,
        fuel_type: str | None = None,
    ) -> list[CompressedPriceEntry]:
        """
        Get compressed fuel data within the specified filters.

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

        if not self._base_path.exists() or not any(self._base_path.iterdir()):
            return pd.DataFrame()

        glob = _parquet_glob(self._base_path)
        base_from = f"read_parquet('{glob}', hive_partitioning=true)"

        if station_ids:
            placeholders = ", ".join([f"${i}" for i in range(1, len(station_ids) + 1)])
            sql = f"""
                SELECT timestamp, station_id, fuel_type, price
                FROM {base_from}
                WHERE station_id IN ({placeholders})
                  AND (station_id, fuel_type, timestamp) IN (
                    SELECT station_id, fuel_type, MAX(timestamp)
                    FROM {base_from}
                    WHERE station_id IN ({placeholders})
                    GROUP BY station_id, fuel_type
                )
            """
            params = station_ids + station_ids
        else:
            sql = f"""
                SELECT timestamp, station_id, fuel_type, price
                FROM {base_from}
                WHERE (station_id, fuel_type, timestamp) IN (
                    SELECT station_id, fuel_type, MAX(timestamp)
                    FROM {base_from}
                    GROUP BY station_id, fuel_type
                )
            """
            params = []

        con = duckdb.connect()
        try:
            return con.execute(sql, params).fetchdf()
        finally:
            con.close()

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    def delete_data_for_date(self, target_date: date) -> int:
        """
        Delete all compressed data for a specific date by removing its
        partition directory.

        Args:
            target_date: The date to delete data for

        Returns:
            Number of rows deleted (0 – not tracked for parquet)
        """
        partition_dir = self._base_path / f"date={target_date.isoformat()}"
        if partition_dir.exists():
            shutil.rmtree(partition_dir)
            logger.info("Deleted partition %s", partition_dir)
        return 0

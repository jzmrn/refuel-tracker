"""Custom IO managers for the analytics pipeline."""

from pathlib import Path

import pandas as pd
from dagster import (
    ConfigurableIOManager,
    InputContext,
    OutputContext,
    ResourceDependency,
)
from dagster_duckdb import DuckDBResource
from fueldata import (
    AggregatedFuelDataClient,
    CompressedFuelDataClient,
    FuelPriceDataClient,
)


class RawFuelPriceDataIOManager(ConfigurableIOManager):
    """IO manager for raw fuel price data stored in DuckDB."""

    duckdb: ResourceDependency[DuckDBResource]

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        """
        Append raw fuel data to DuckDB table.

        Args:
            context: Dagster output context
            obj: DataFrame with fuel price data to append (or None to skip)
        """

        client = FuelPriceDataClient(self.duckdb)
        client.store_fuel_data(obj)

        context.log.info(f"Appended {len(obj)} rows to fuel prices table")

        context.add_output_metadata(
            {
                "num_rows": len(obj),
                "num_columns": len(obj.columns),
                "columns": ", ".join(obj.columns),
            }
        )

    def load_input(self, context: InputContext) -> pd.DataFrame:
        """
        Load raw fuel data from DuckDB filtered by partition time window.

        Args:
            context: Dagster input context with partition information

        Returns:
            DataFrame filtered to the partition's time window
        """

        if context.has_partition_key:
            context.log.info(f"Loading data for partition {context.partition_key}")
            start_time = pd.to_datetime(context.partition_key)
            end_time = start_time + pd.Timedelta(days=1)

        else:
            context.log.info("No partition key found; loading all data")
            start_time = None
            end_time = None

        client = FuelPriceDataClient(self.duckdb)
        return client.read_fuel_data(start_time, end_time)


class DailyFuelPriceAggregatesIOManager(ConfigurableIOManager):
    """IO manager for daily aggregate data stored in DuckDB."""

    duckdb: ResourceDependency[DuckDBResource]

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        """
        Store daily aggregate data to DuckDB table.

        Args:
            context: Dagster output context
            obj: DataFrame with daily aggregate data
        """

        client = AggregatedFuelDataClient(self.duckdb)
        client.store_daily_aggregates(obj)

        context.log.info(f"Stored {len(obj)} rows to daily_aggregates table")

        context.add_output_metadata(
            {
                "num_rows": len(obj),
                "num_columns": len(obj.columns),
                "columns": ", ".join(obj.columns),
                "partition_key": context.partition_key
                if context.has_partition_key
                else None,
            }
        )

    def load_input(self, context: InputContext) -> pd.DataFrame:
        """
        Load daily aggregate data from DuckDB filtered by partition time window.

        Args:
            context: Dagster input context with partition information

        Returns:
            DataFrame filtered to the partition's time window
        """

        if context.has_partition_key:
            context.log.info(f"Loading data for partition {context.partition_key}")
            start_time = pd.to_datetime(context.partition_key)
            end_time = start_time + pd.Timedelta(days=1)

        else:
            context.log.info("No partition key found; loading all data")
            start_time = None
            end_time = None

        client = AggregatedFuelDataClient(self.duckdb)
        return client.read_daily_aggregates(start_time, end_time)


class CompressedFuelPriceDataIOManager(ConfigurableIOManager):
    """IO manager for compressed fuel price data stored in DuckDB."""

    duckdb: ResourceDependency[DuckDBResource]

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        """
        Store compressed fuel data to DuckDB table.

        Args:
            context: Dagster output context
            obj: DataFrame with compressed fuel price data
        """

        client = CompressedFuelDataClient(self.duckdb)
        client.store_compressed_data(obj)

        context.log.info(f"Stored {len(obj)} rows to compressed_fuel_prices table")

        context.add_output_metadata(
            {
                "num_rows": len(obj),
                "num_columns": len(obj.columns),
                "columns": ", ".join(obj.columns),
                "partition_key": context.partition_key
                if context.has_partition_key
                else None,
            }
        )

    def load_input(self, context: InputContext) -> pd.DataFrame:
        """
        Load compressed fuel data from DuckDB filtered by partition time window.

        Args:
            context: Dagster input context with partition information

        Returns:
            DataFrame filtered to the partition's time window
        """

        if context.has_partition_key:
            context.log.info(f"Loading data for partition {context.partition_key}")
            start_time = pd.to_datetime(context.partition_key)
            end_time = start_time + pd.Timedelta(days=1)

        else:
            context.log.info("No partition key found; loading all data")
            start_time = None
            end_time = None

        client = CompressedFuelDataClient(self.duckdb)
        return client.read_compressed_data(start_time, end_time)


class PartitionedParquetIOManager(ConfigurableIOManager):
    """IO manager that writes DataFrames as Hive-partitioned parquet files.

    Output path layout:
        {base_path}/{asset_name}/date={partition_key}/data.parquet

    Works with both daily and monthly partitions.  The partition_key is
    expected to be an ISO date string (``YYYY-MM-DD``).
    """

    base_path: str

    def _asset_path(self, asset_key, partition_key: str) -> Path:
        asset_name = asset_key.path[-1]
        return (
            Path(self.base_path) / asset_name / f"date={partition_key}" / "data.parquet"
        )

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        if obj.empty:
            context.log.info("Empty DataFrame — skipping parquet write")
            return

        path = self._asset_path(context.asset_key, context.partition_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        obj.to_parquet(path, engine="pyarrow", index=False)

        context.log.info(f"Wrote {len(obj)} rows to {path}")
        context.add_output_metadata(
            {
                "num_rows": len(obj),
                "num_columns": len(obj.columns),
                "columns": ", ".join(obj.columns),
                "partition_key": context.partition_key,
                "path": str(path),
            }
        )

    def load_input(self, context: InputContext) -> pd.DataFrame:
        path = self._asset_path(
            context.asset_key,
            context.partition_key if context.has_partition_key else "*",
        )

        if context.has_partition_key:
            if not path.exists():
                context.log.warning(f"Parquet file not found: {path}")
                return pd.DataFrame()
            return pd.read_parquet(path)

        # No partition key — read all partitions via glob
        asset_dir = Path(self.base_path) / context.asset_key.path[-1]
        if not asset_dir.exists():
            context.log.warning(f"Asset directory not found: {asset_dir}")
            return pd.DataFrame()
        return pd.read_parquet(asset_dir)

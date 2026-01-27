"""Custom IO managers for the analytics pipeline."""

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

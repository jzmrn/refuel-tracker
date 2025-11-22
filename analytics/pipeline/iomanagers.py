"""Custom IO managers for the analytics pipeline."""

import pandas as pd
from dagster import (
    ConfigurableIOManager,
    InputContext,
    OutputContext,
    ResourceDependency,
)
from dagster_duckdb import DuckDBResource
from fueldata import FuelDataClient


class RawFuelDataIOManager(ConfigurableIOManager):
    """IO manager for raw fuel price data stored in DuckDB."""

    duckdb: ResourceDependency[DuckDBResource]

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        """
        Append raw fuel data to DuckDB table.

        Args:
            context: Dagster output context
            obj: DataFrame with fuel price data to append (or None to skip)
        """

        with self.duckdb.get_connection() as con:
            client = FuelDataClient(con)
            client.store_fuel_data(obj)

            context.log.info(f"Appended {len(obj)} rows to raw_fuel_prices table")

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

        with self.duckdb.get_connection() as con:
            client = FuelDataClient(con)
            return client.read_fuel_data(start_time, end_time)


class DailyAggregatesIOManager(ConfigurableIOManager):
    """IO manager for daily aggregate data stored in DuckDB."""

    duckdb: ResourceDependency[DuckDBResource]

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        """
        Store daily aggregate data to DuckDB table.

        Args:
            context: Dagster output context
            obj: DataFrame with daily aggregate data
        """

        with self.duckdb.get_connection() as con:
            client = FuelDataClient(con)
            client.store_daily_aggregates(obj)

            context.log.info(f"Stored {len(obj)} rows to daily_aggregates table")

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

        with self.duckdb.get_connection() as con:
            client = FuelDataClient(con)
            return client.read_daily_aggregates(start_time, end_time)

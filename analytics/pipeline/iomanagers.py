"""Custom IO managers for the analytics pipeline."""

import pandas as pd
from dagster import (
    ConfigurableIOManager,
    InputContext,
    OutputContext,
    ResourceDependency,
)
from fueldata import (
    AggregatedFuelDataClient,
    CompressedFuelDataClient,
    DailyBrandAggregateClient,
    DailyPlaceAggregateClient,
    FuelPriceDataClient,
    MonthlyBrandAggregateClient,
    MonthlyPlaceAggregateClient,
    MonthlyStationAggregateClient,
)

from .resources import SQLiteResource


class RawFuelPriceDataIOManager(ConfigurableIOManager):
    """IO manager for raw fuel price data stored in SQLite."""

    fueldata_db: ResourceDependency[SQLiteResource]

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        """
        Append raw fuel data to SQLite table.

        Args:
            context: Dagster output context
            obj: DataFrame with fuel price data to append (or None to skip)
        """

        client = FuelPriceDataClient(self.fueldata_db)
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
        Load raw fuel data from SQLite filtered by partition time window.

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

        client = FuelPriceDataClient(self.fueldata_db)
        return client.read_fuel_data(start_time, end_time)


class CompressedFuelPriceDataIOManager(ConfigurableIOManager):
    """IO manager for compressed fuel price data stored as Parquet."""

    base_path: str

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        """
        Store compressed fuel data as Hive-partitioned Parquet.

        Args:
            context: Dagster output context
            obj: DataFrame with compressed fuel price data
        """

        client = CompressedFuelDataClient(self.base_path)
        client.store_compressed_data(obj)

        context.log.info(f"Stored {len(obj)} rows to compressed_fuel_prices parquet")

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
        Load compressed fuel data from Parquet filtered by partition time window.

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

        client = CompressedFuelDataClient(self.base_path)
        return client.read_compressed_data(start_time, end_time)


class DailyFuelPriceAggregatesIOManager(ConfigurableIOManager):
    """IO manager for daily aggregate data stored as Parquet."""

    base_path: str

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        """
        Store daily aggregate data as Hive-partitioned Parquet.

        Args:
            context: Dagster output context
            obj: DataFrame with daily aggregate data
        """

        client = AggregatedFuelDataClient(self.base_path)
        client.store_daily_aggregates(obj)

        context.log.info(f"Stored {len(obj)} rows to daily_aggregates parquet")

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
        Load daily aggregate data from Parquet filtered by partition time window.

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

        client = AggregatedFuelDataClient(self.base_path)
        return client.read_daily_aggregates(start_time, end_time)


class MonthlyStationAggregatesIOManager(ConfigurableIOManager):
    """IO manager for monthly per-station aggregates stored as Parquet."""

    base_path: str

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        client = MonthlyStationAggregateClient(self.base_path)
        client.store_monthly_station_aggregates(obj)

        context.log.info(
            f"Stored {len(obj)} rows to monthly_agg_price_by_station parquet"
        )
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
        if context.has_partition_key:
            context.log.info(f"Loading data for partition {context.partition_key}")
            start = pd.to_datetime(context.partition_key).date()
            end = start
        else:
            context.log.info("No partition key found; loading all data")
            start = None
            end = None

        client = MonthlyStationAggregateClient(self.base_path)
        return client.read_monthly_station_aggregates(start, end)


class MonthlyBrandAggregatesIOManager(ConfigurableIOManager):
    """IO manager for monthly per-brand aggregates stored as Parquet."""

    base_path: str

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        client = MonthlyBrandAggregateClient(self.base_path)
        client.store_monthly_brand_aggregates(obj)

        context.log.info(
            f"Stored {len(obj)} rows to monthly_agg_price_by_brand parquet"
        )
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
        if context.has_partition_key:
            context.log.info(f"Loading data for partition {context.partition_key}")
            start = pd.to_datetime(context.partition_key).date()
            end = start
        else:
            context.log.info("No partition key found; loading all data")
            start = None
            end = None

        client = MonthlyBrandAggregateClient(self.base_path)
        return client.read_monthly_brand_aggregates(start, end)


class MonthlyPlaceAggregatesIOManager(ConfigurableIOManager):
    """IO manager for monthly per-place aggregates stored as Parquet."""

    base_path: str

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        client = MonthlyPlaceAggregateClient(self.base_path)
        client.store_monthly_place_aggregates(obj)

        context.log.info(
            f"Stored {len(obj)} rows to monthly_agg_price_by_place parquet"
        )
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
        if context.has_partition_key:
            context.log.info(f"Loading data for partition {context.partition_key}")
            start = pd.to_datetime(context.partition_key).date()
            end = start
        else:
            context.log.info("No partition key found; loading all data")
            start = None
            end = None

        client = MonthlyPlaceAggregateClient(self.base_path)
        return client.read_monthly_place_aggregates(start, end)


class DailyBrandAggregatesIOManager(ConfigurableIOManager):
    """IO manager for daily per-brand aggregates stored as Parquet."""

    base_path: str

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        client = DailyBrandAggregateClient(self.base_path)
        client.store_daily_brand_aggregates(obj)

        context.log.info(f"Stored {len(obj)} rows to daily_agg_price_by_brand parquet")
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
        if context.has_partition_key:
            context.log.info(f"Loading data for partition {context.partition_key}")
            start = pd.to_datetime(context.partition_key).date()
            end = start
        else:
            context.log.info("No partition key found; loading all data")
            start = None
            end = None

        client = DailyBrandAggregateClient(self.base_path)
        return client.read_daily_brand_aggregates(start, end)


class DailyPlaceAggregatesIOManager(ConfigurableIOManager):
    """IO manager for daily per-place aggregates stored as Parquet."""

    base_path: str

    def handle_output(self, context: OutputContext, obj: pd.DataFrame) -> None:
        client = DailyPlaceAggregateClient(self.base_path)
        client.store_daily_place_aggregates(obj)

        context.log.info(f"Stored {len(obj)} rows to daily_agg_price_by_place parquet")
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
        if context.has_partition_key:
            context.log.info(f"Loading data for partition {context.partition_key}")
            start = pd.to_datetime(context.partition_key).date()
            end = start
        else:
            context.log.info("No partition key found; loading all data")
            start = None
            end = None

        client = DailyPlaceAggregateClient(self.base_path)
        return client.read_daily_place_aggregates(start, end)

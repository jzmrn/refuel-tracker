from datetime import timedelta

from dagster import (
    AssetSelection,
    RunRequest,
    ScheduleDefinition,
    define_asset_job,
    schedule,
)

from .assets import daily_partitions, monthly_partitions
from .jobs import cleanup_raw_fuel_data_job

## Fetch Raw Fuel Prices

fetch_fuel_prices_job = define_asset_job(
    name="fetch_fuel_prices_job",
    description="Fetch raw fuel prices every 10 minutes.",
    selection=AssetSelection.keys("raw_fuel_prices"),
)

schedule_fetch_fuel_prices = ScheduleDefinition(
    job=fetch_fuel_prices_job,
    cron_schedule="3-53/10 * * * *",
    name="fetch_fuel_prices",
    description="Fetch fuel prices every 10 minutes.",
)


## Compressed Fuel Prices

compressed_fuel_prices_job = define_asset_job(
    name="compressed_fuel_prices_job",
    description="Compress raw fuel prices daily.",
    selection=AssetSelection.keys("compressed_fuel_prices"),
    partitions_def=daily_partitions,
)


@schedule(
    cron_schedule="0 6 * * *",
    job=compressed_fuel_prices_job,
    name="compressed_fuel_prices",
    description="Compress fuel prices at 6:00 AM every day for the previous day.",
)
def schedule_compressed_fuel_prices(context):
    """Run compression for yesterday's partition."""
    scheduled_time = context.scheduled_execution_time
    yesterday = (scheduled_time - timedelta(days=1)).strftime("%Y-%m-%d")
    return RunRequest(partition_key=yesterday)


## Daily Aggregates

daily_aggregates_job = define_asset_job(
    name="daily_aggregates_job",
    description="Compute daily aggregates for fuel prices.",
    selection=AssetSelection.keys("daily_aggregates"),
    partitions_def=daily_partitions,
)


@schedule(
    cron_schedule="0 7 * * *",
    job=daily_aggregates_job,
    name="daily_aggregates",
    description="Compute daily aggregates at 7:00 AM every day for the previous day.",
)
def schedule_daily_aggregates(context):
    """Run aggregation for yesterday's partition."""
    scheduled_time = context.scheduled_execution_time
    yesterday = (scheduled_time - timedelta(days=1)).strftime("%Y-%m-%d")
    return RunRequest(partition_key=yesterday)


## Cleanup Raw Fuel Data

schedule_cleanup_raw_fuel_data = ScheduleDefinition(
    job=cleanup_raw_fuel_data_job,
    cron_schedule="0 9 * * *",
    name="cleanup_raw_fuel_data",
    description="Delete raw fuel data older than 7 days (after compression verified).",
)


## Monthly Aggregates

monthly_aggregates_fuel_prices = define_asset_job(
    name="monthly_aggregates_fuel_prices",
    description="Compute monthly aggregates for fuel prices.",
    selection=AssetSelection.keys(
        "monthly_agg_price_by_station",
        "monthly_agg_price_by_brand",
        "monthly_agg_price_by_place",
    ),
    partitions_def=monthly_partitions,
)


@schedule(
    cron_schedule="0 8 * * *",
    job=monthly_aggregates_fuel_prices,
    name="monthly_aggregates_fuel_prices",
    description="Compute monthly aggregates daily for the previous day's month.",
)
def schedule_monthly_aggregates(context):
    """Run monthly aggregation for yesterday's month partition."""
    scheduled_time = context.scheduled_execution_time
    yesterday = scheduled_time - timedelta(days=1)
    partition_key = yesterday.replace(day=1).strftime("%Y-%m-%d")
    return RunRequest(partition_key=partition_key)

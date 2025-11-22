from dagster import AssetSelection, ScheduleDefinition, define_asset_job

fetch_fuel_prices_job = define_asset_job(
    name="fetch_fuel_prices_job",
    selection=AssetSelection.keys("raw_fuel_prices"),
)

schedule_fetch_fuel_prices = ScheduleDefinition(
    job=fetch_fuel_prices_job,
    cron_schedule="3-53/10 * * * *",
    name="fetch_fuel_prices",
    description="Fetch fuel prices every 10 minutes.",
)

daily_aggregates_job = define_asset_job(
    name="daily_aggregates_job",
    selection=AssetSelection.keys("daily_aggregates"),
)

schedule_daily_aggregates = ScheduleDefinition(
    job=daily_aggregates_job,
    cron_schedule="0 6 * * *",
    name="daily_aggregates",
    description="Compute daily aggregates at 6:00 AM every day.",
)

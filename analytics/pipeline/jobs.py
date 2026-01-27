"""Cleanup jobs for removing stale raw data after compression."""

from datetime import datetime, timedelta

from dagster import (
    AssetKey,
    DagsterInstance,
    OpExecutionContext,
    ResourceParam,
    job,
    op,
)
from dagster_duckdb import DuckDBResource

RETENTION_DAYS = 28  # Default retention period for raw data


@op
def cleanup_stale_raw_fuel_data(
    context: OpExecutionContext,
    duckdb: ResourceParam[DuckDBResource],
) -> None:
    """
    Delete raw fuel data that has been successfully compressed.

    Only deletes data for dates where:
    1. The compressed_fuel_prices partition is materialized
    2. The data is older than the retention period
    """

    cutoff_date = (datetime.now() - timedelta(days=RETENTION_DAYS)).date()

    instance: DagsterInstance = context.instance

    # Get all materialized partitions for compressed_fuel_prices
    materialized_partitions = instance.get_materialized_partitions(
        asset_key=AssetKey("compressed_fuel_prices")
    )

    # Convert partition keys to dates and filter by retention period
    safe_to_delete_dates = set()
    for partition_key in materialized_partitions:
        try:
            partition_date = datetime.strptime(partition_key, "%Y-%m-%d").date()
            if partition_date <= cutoff_date:
                safe_to_delete_dates.add(partition_date)
        except ValueError:
            context.log.warning(f"Invalid partition key format: {partition_key}")
            continue

    if not safe_to_delete_dates:
        context.log.info(
            f"No partitions older than {cutoff_date} found with materialized "
            "compressed data. Nothing to delete."
        )
        return

    context.log.info(
        f"Found {len(safe_to_delete_dates)} dates with materialized compressed data "
        f"older than {RETENTION_DAYS} days: {sorted(safe_to_delete_dates)}"
    )

    # Delete raw data for each safe date
    total_deleted = 0
    with duckdb.get_connection() as conn:
        for target_date in sorted(safe_to_delete_dates):
            # Count rows before deletion
            count_result = conn.execute(
                "SELECT COUNT(*) FROM fuel_prices WHERE DATE(timestamp) = ?",
                [target_date],
            ).fetchone()
            row_count = count_result[0] if count_result else 0

            if row_count > 0:
                conn.execute(
                    "DELETE FROM fuel_prices WHERE DATE(timestamp) = ?",
                    [target_date],
                )
                context.log.info(f"Deleted {row_count} raw records for {target_date}")
                total_deleted += row_count

            else:
                context.log.info(f"No raw data found for {target_date}")

    context.log.info(f"Cleanup complete. Total rows deleted: {total_deleted}")


@job
def cleanup_raw_fuel_data_job():
    """Job to clean up stale raw fuel data after compression."""
    cleanup_stale_raw_fuel_data()

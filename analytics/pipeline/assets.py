from datetime import datetime

import pandas as pd
from dagster import (
    AssetIn,
    DailyPartitionsDefinition,
    OpExecutionContext,
    asset,
)

from .resources import TankerkoenigResource


@asset(
    group_name="fuel",
    description="Fetch live fuel prices from API and append to storage",
    io_manager_key="raw_fuel_io_manager",
)
def raw_fuel_prices(
    context: OpExecutionContext,
    tankerkoenig: TankerkoenigResource,
) -> pd.DataFrame:
    """
    Fetch raw fuel prices data from Tankerkönig API.
    Unpartitioned - each scheduled run appends new live data with timestamp.
    Returns DataFrame which IO manager appends to DuckDB.
    """

    try:
        data = tankerkoenig.get_client().get_gas_station_prices(
            station_ids=["24a381e3-0d72-416d-bfd8-b2f65f6e5802"]
        )

    except Exception as e:
        context.log.error(f"Failed to fetch gas station data: {str(e)}")
        raise

    context.log.info(f"Successfully fetched data for {len(data)} gas stations")

    timestamp = datetime.now()
    rows = [
        {
            "timestamp": timestamp,
            "station_id": entry.station_id,
            "type": fuel_type,
            "price": price,
        }
        for entry in data
        for fuel_type, price in [
            ("e5", entry.e5),
            ("e10", entry.e10),
            ("diesel", entry.diesel),
        ]
        if price is not None
    ]

    df = pd.DataFrame(rows)
    context.log.info(f"Prepared {len(df)} rows of fuel data for storage")

    return df


@asset(
    partitions_def=DailyPartitionsDefinition(start_date="2025-11-01", end_offset=1),
    ins={"raw_fuel_prices": AssetIn()},
    group_name="fuel",
    description="Daily per-station-per-fuel-type aggregates computed from raw data",
    io_manager_key="daily_aggregates_io_manager",
)
def daily_aggregates(
    context: OpExecutionContext,
    raw_fuel_prices: pd.DataFrame,
) -> pd.DataFrame:
    """
    Compute daily aggregates from raw fuel prices.
    IO manager automatically filters raw data by partition time window.
    """

    if raw_fuel_prices.empty:
        context.log.info("No raw data available for this partition")
        return pd.DataFrame()

    context.log.info(
        f"Processing {len(raw_fuel_prices)} rows from "
        f"{raw_fuel_prices['timestamp'].min()} to {raw_fuel_prices['timestamp'].max()}"
    )

    aggregates = (
        raw_fuel_prices.groupby(["station_id", "type"])
        .agg(
            n_samples=("timestamp", "count"),
            price_mean=("price", "mean"),
            price_min=("price", "min"),
            price_max=("price", "max"),
            price_std=("price", "std"),
            ts_min=("timestamp", "min"),
            ts_max=("timestamp", "max"),
        )
        .reset_index()
    )

    aggregates["date"] = pd.to_datetime(context.partition_key).date()
    context.log.info(f"Created {len(aggregates)} aggregate records")

    return aggregates

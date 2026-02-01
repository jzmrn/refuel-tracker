from datetime import datetime

import pandas as pd
from dagster import (
    AssetIn,
    DailyPartitionsDefinition,
    OpExecutionContext,
    asset,
)
from dagster_duckdb import DuckDBResource
from fueldata import FuelStationClient
from tankerkoenig import TankerkoenigClient
from tankerkoenig.models import GasStationPrice

from .resources import TankerkoenigResource

# Shared partition definition for daily assets
daily_partitions = DailyPartitionsDefinition(start_date="2025-11-24", end_offset=1)


@asset(
    group_name="fuel",
    description="Fetch live fuel prices from API and append to storage",
    io_manager_key="raw_fuel_io_manager",
)
def raw_fuel_prices(
    context: OpExecutionContext,
    tankerkoenig: TankerkoenigResource,
    duckdb: DuckDBResource,
) -> pd.DataFrame:
    """
    Fetch raw fuel prices data from Tankerkönig API.
    Unpartitioned - each scheduled run appends new live data with timestamp.
    Returns DataFrame which IO manager appends to DuckDB.
    """

    client = FuelStationClient(duckdb)
    favorites = client.get_favorite_stations()
    station_ids = set([station.station_id for station in favorites])

    context.log.info(f"Read {len(station_ids)} favorite stations")

    if len(station_ids) == 0:
        context.log.info("No favorite stations configured, skipping data fetch")
        return pd.DataFrame()

    try:
        client: TankerkoenigClient = tankerkoenig.get_client()
        data: list[GasStationPrice] = []

        # API allows max 10 station IDs per request, so chunk requests
        for chunk_start in range(0, len(station_ids), 10):
            chunk_ids = list(station_ids)[chunk_start : chunk_start + 10]
            chunk_data = client.get_gas_station_prices(station_ids=chunk_ids)
            data.extend(chunk_data)

    except Exception as e:
        context.log.error(f"Failed to fetch gas station data: {str(e)}")
        raise

    context.log.info(f"Successfully fetched data for {len(data)} gas stations")

    timestamp = datetime.now()
    rows = [{"timestamp": timestamp, **entry.model_dump()} for entry in data]
    df = pd.DataFrame(rows)

    context.log.info(f"Prepared {len(df)} rows of fuel data prices for storage")

    return df


@asset(
    partitions_def=daily_partitions,
    ins={"raw_fuel_prices": AssetIn()},
    group_name="fuel",
    description="Compressed fuel prices - stores only actual price changes",
    io_manager_key="compressed_fuel_io_manager",
)
def compressed_fuel_prices(
    context: OpExecutionContext,
    raw_fuel_prices: pd.DataFrame,
) -> pd.DataFrame:
    """
    Compress raw fuel prices by removing consecutive duplicate prices.
    Transforms from wide format (all fuel types per row) to long format
    (one row per price change per fuel type).

    IO manager automatically filters raw data by partition time window.
    """

    if raw_fuel_prices.empty:
        context.log.info("No raw data available for this partition")
        return pd.DataFrame()

    context.log.info(
        f"Processing {len(raw_fuel_prices)} raw rows from "
        f"{raw_fuel_prices['timestamp'].min()} to {raw_fuel_prices['timestamp'].max()}"
    )

    # Sort by station and timestamp for proper change detection
    df = raw_fuel_prices.sort_values(["station_id", "timestamp"]).copy()

    # Transform from wide to long format (melt fuel types into rows)
    fuel_types = ["e5", "e10", "diesel"]
    price_columns = [f"price_{ft}" for ft in fuel_types]

    # Melt the dataframe to get one row per station/timestamp/fuel_type
    melted = df.melt(
        id_vars=["timestamp", "station_id"],
        value_vars=price_columns,
        var_name="fuel_type",
        value_name="price",
    )

    # Clean up fuel_type names (remove 'price_' prefix)
    melted["fuel_type"] = melted["fuel_type"].str.replace("price_", "")

    # Remove rows with null prices
    melted = melted.dropna(subset=["price"])

    if melted.empty:
        context.log.info("No valid price data after transformation")
        return pd.DataFrame()

    # Sort for change detection
    melted = melted.sort_values(["station_id", "fuel_type", "timestamp"])

    # Detect price changes: keep first row of each group and rows where price changed
    melted["prev_price"] = melted.groupby(["station_id", "fuel_type"])["price"].shift(1)
    melted["price_changed"] = (melted["price"] != melted["prev_price"]) | melted[
        "prev_price"
    ].isna()

    # Keep only rows where price changed
    compressed = melted[melted["price_changed"]][
        ["timestamp", "station_id", "fuel_type", "price"]
    ].copy()

    compression_ratio = (
        (1 - len(compressed) / len(melted)) * 100 if len(melted) > 0 else 0
    )

    context.log.info(
        f"Compressed {len(melted)} price records to {len(compressed)} "
        f"({compression_ratio:.1f}% reduction)"
    )

    return compressed


@asset(
    partitions_def=daily_partitions,
    ins={"compressed_fuel_prices": AssetIn()},
    group_name="fuel",
    description="Daily per-station-per-fuel-type aggregates from compressed data",
    io_manager_key="daily_aggregates_io_manager",
)
def daily_aggregates(
    context: OpExecutionContext,
    compressed_fuel_prices: pd.DataFrame,
) -> pd.DataFrame:
    """
    Compute daily aggregates from compressed fuel prices.
    Automatically triggered after compressed_fuel_prices partition is materialized.
    IO manager automatically filters compressed data by partition time window.
    """

    if compressed_fuel_prices.empty:
        context.log.info("No compressed data available for this partition")
        return pd.DataFrame()

    context.log.info(
        f"Processing {len(compressed_fuel_prices)} compressed price records from "
        f"{compressed_fuel_prices['timestamp'].min()} to "
        f"{compressed_fuel_prices['timestamp'].max()}"
    )

    partition_date = pd.to_datetime(context.partition_key).date()

    # Group by station_id and fuel_type (compressed data is already in long format)
    grouped = compressed_fuel_prices.groupby(["station_id", "fuel_type"])

    aggregates = grouped.agg(
        n_samples=("price", "count"),
        n_unique_prices=("price", "nunique"),
        price_mean=("price", "mean"),
        price_min=("price", "min"),
        price_max=("price", "max"),
        price_std=("price", "std"),
        ts_min=("timestamp", "min"),
        ts_max=("timestamp", "max"),
    ).reset_index()

    # Rename fuel_type to type and add date
    aggregates = aggregates.rename(columns={"fuel_type": "type"})
    aggregates["date"] = partition_date

    context.log.info(f"Created {len(aggregates)} aggregate records")

    return aggregates

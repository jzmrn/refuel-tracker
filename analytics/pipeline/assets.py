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

    grouped_fuel_prices = raw_fuel_prices.groupby("station_id")
    partition_date = pd.to_datetime(context.partition_key).date()

    df = pd.DataFrame()

    for fuel_type in ["e5", "e10", "diesel"]:
        agg_dict = {}
        agg_dict[f"n_samples"] = (f"price_{fuel_type}", "count")
        agg_dict[f"price_mean"] = (f"price_{fuel_type}", "mean")
        agg_dict[f"price_min"] = (f"price_{fuel_type}", "min")
        agg_dict[f"price_max"] = (f"price_{fuel_type}", "max")
        agg_dict[f"price_std"] = (f"price_{fuel_type}", "std")

        agg_dict["ts_min"] = ("timestamp", "min")
        agg_dict["ts_max"] = ("timestamp", "max")

        aggregates = grouped_fuel_prices.agg(**agg_dict).reset_index()
        aggregates["date"] = partition_date
        aggregates["type"] = fuel_type
        df = pd.concat([df, aggregates], ignore_index=True)

    context.log.info(f"Created {len(df)} aggregate records")

    return df

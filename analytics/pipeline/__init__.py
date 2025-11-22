from pathlib import Path

from dagster import Definitions, EnvVar
from dagster_duckdb import DuckDBResource

from .assets import daily_aggregates, raw_fuel_prices
from .iomanagers import DailyAggregatesIOManager, RawFuelDataIOManager
from .resources import TankerkoenigResource
from .schedules import (
    daily_aggregates_job,
    fetch_fuel_prices_job,
    schedule_daily_aggregates,
    schedule_fetch_fuel_prices,
)

duckdb = DuckDBResource(
    database=str(Path(EnvVar("DATA_OUTPUT_PATH").get_value()) / "fueldata.duckdb")
)

defs = Definitions(
    assets=[
        raw_fuel_prices,
        daily_aggregates,
    ],
    resources={
        "tankerkoenig": TankerkoenigResource(
            api_key=EnvVar("TANKERKOENIG_API_KEY"),
        ),
        "raw_fuel_io_manager": RawFuelDataIOManager(duckdb=duckdb),
        "daily_aggregates_io_manager": DailyAggregatesIOManager(duckdb=duckdb),
    },
    jobs=[
        fetch_fuel_prices_job,
        daily_aggregates_job,
    ],
    schedules=[
        schedule_fetch_fuel_prices,
        schedule_daily_aggregates,
    ],
)

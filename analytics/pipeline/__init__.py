from pathlib import Path

from dagster import Definitions, EnvVar
from dagster_duckdb import DuckDBResource

from .assets import (
    compressed_fuel_prices,
    daily_aggregates,
    monthly_agg_price_by_brand,
    monthly_agg_price_by_place,
    monthly_agg_price_by_station,
    raw_fuel_prices,
)
from .iomanagers import (
    CompressedFuelPriceDataIOManager,
    DailyFuelPriceAggregatesIOManager,
    PartitionedParquetIOManager,
    RawFuelPriceDataIOManager,
)
from .jobs import cleanup_raw_fuel_data_job
from .resources import TankerkoenigResource
from .schedules import (
    compressed_fuel_prices_job,
    daily_aggregates_job,
    fetch_fuel_prices_job,
    monthly_aggregates_fuel_prices,
    schedule_cleanup_raw_fuel_data,
    schedule_compressed_fuel_prices,
    schedule_daily_aggregates,
    schedule_fetch_fuel_prices,
    schedule_monthly_aggregates,
)

duckdb = DuckDBResource(
    database=str(Path(EnvVar("DATA_OUTPUT_PATH").get_value()) / "fueldata.duckdb")
)

data_output_path = EnvVar("DATA_OUTPUT_PATH").get_value()

defs = Definitions(
    assets=[
        raw_fuel_prices,
        daily_aggregates,
        compressed_fuel_prices,
        monthly_agg_price_by_station,
        monthly_agg_price_by_brand,
        monthly_agg_price_by_place,
    ],
    resources={
        "tankerkoenig": TankerkoenigResource(
            api_key=EnvVar("TANKERKOENIG_API_KEY"),
        ),
        "duckdb": duckdb,
        "raw_fuel_io_manager": RawFuelPriceDataIOManager(duckdb=duckdb),
        "daily_aggregates_io_manager": DailyFuelPriceAggregatesIOManager(duckdb=duckdb),
        "compressed_fuel_io_manager": CompressedFuelPriceDataIOManager(duckdb=duckdb),
        "partitioned_parquet_io_manager": PartitionedParquetIOManager(
            base_path=data_output_path
        ),
    },
    jobs=[
        fetch_fuel_prices_job,
        daily_aggregates_job,
        compressed_fuel_prices_job,
        cleanup_raw_fuel_data_job,
        monthly_aggregates_fuel_prices,
    ],
    schedules=[
        schedule_fetch_fuel_prices,
        schedule_daily_aggregates,
        schedule_compressed_fuel_prices,
        schedule_cleanup_raw_fuel_data,
        schedule_monthly_aggregates,
    ],
)

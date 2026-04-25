from pathlib import Path

from dagster import Definitions, EnvVar

from .assets import (
    compressed_fuel_prices,
    daily_agg_price_by_brand,
    daily_agg_price_by_place,
    daily_aggregates,
    monthly_agg_price_by_brand,
    monthly_agg_price_by_place,
    monthly_agg_price_by_station,
    raw_fuel_prices,
)
from .iomanagers import (
    CompressedFuelPriceDataIOManager,
    DailyBrandAggregatesIOManager,
    DailyFuelPriceAggregatesIOManager,
    DailyPlaceAggregatesIOManager,
    MonthlyBrandAggregatesIOManager,
    MonthlyPlaceAggregatesIOManager,
    MonthlyStationAggregatesIOManager,
    RawFuelPriceDataIOManager,
)
from .jobs import cleanup_raw_fuel_data_job
from .resources import CompressedFuelDataResource, SQLiteResource, TankerkoenigResource
from .schedules import (
    compressed_fuel_prices_job,
    daily_aggregates_job,
    daily_brand_aggregates_job,
    daily_place_aggregates_job,
    fetch_fuel_prices_job,
    monthly_aggregates_fuel_prices,
    schedule_cleanup_raw_fuel_data,
    schedule_compressed_fuel_prices,
    schedule_daily_aggregates,
    schedule_daily_brand_aggregates,
    schedule_daily_place_aggregates,
    schedule_fetch_fuel_prices,
    schedule_monthly_aggregates,
)

data_output_path = EnvVar("DATA_OUTPUT_PATH").get_value()

userdata_db = SQLiteResource(database=str(Path(data_output_path) / "userdata.sqlite"))

fueldata_db = SQLiteResource(database=str(Path(data_output_path) / "fueldata.sqlite"))

defs = Definitions(
    assets=[
        raw_fuel_prices,
        daily_aggregates,
        daily_agg_price_by_brand,
        daily_agg_price_by_place,
        compressed_fuel_prices,
        monthly_agg_price_by_station,
        monthly_agg_price_by_brand,
        monthly_agg_price_by_place,
    ],
    resources={
        "tankerkoenig": TankerkoenigResource(
            api_key=EnvVar("TANKERKOENIG_API_KEY"),
        ),
        "userdata_db": userdata_db,
        "fueldata_db": fueldata_db,
        "compressed_fuel_data": CompressedFuelDataResource(),
        "raw_fuel_io_manager": RawFuelPriceDataIOManager(fueldata_db=fueldata_db),
        "daily_aggregates_io_manager": DailyFuelPriceAggregatesIOManager(
            base_path=data_output_path
        ),
        "compressed_fuel_io_manager": CompressedFuelPriceDataIOManager(
            base_path=data_output_path
        ),
        "monthly_station_agg_io_manager": MonthlyStationAggregatesIOManager(
            base_path=data_output_path
        ),
        "monthly_brand_agg_io_manager": MonthlyBrandAggregatesIOManager(
            base_path=data_output_path
        ),
        "monthly_place_agg_io_manager": MonthlyPlaceAggregatesIOManager(
            base_path=data_output_path
        ),
        "daily_brand_agg_io_manager": DailyBrandAggregatesIOManager(
            base_path=data_output_path
        ),
        "daily_place_agg_io_manager": DailyPlaceAggregatesIOManager(
            base_path=data_output_path
        ),
    },
    jobs=[
        fetch_fuel_prices_job,
        daily_aggregates_job,
        daily_brand_aggregates_job,
        daily_place_aggregates_job,
        compressed_fuel_prices_job,
        cleanup_raw_fuel_data_job,
        monthly_aggregates_fuel_prices,
    ],
    schedules=[
        schedule_fetch_fuel_prices,
        schedule_daily_aggregates,
        schedule_daily_brand_aggregates,
        schedule_daily_place_aggregates,
        schedule_compressed_fuel_prices,
        schedule_cleanup_raw_fuel_data,
        schedule_monthly_aggregates,
    ],
)

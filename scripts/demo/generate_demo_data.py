"""Generate a self-contained demo dataset for screenshots.

The script writes a complete data directory (SQLite databases + Hive
partitioned Parquet datasets) that the backend can serve via ``DATA_PATH``.
It does not touch the real ``data/`` directory and does not require the
Dagster pipeline or the Tankerkoenig API.

Usage:
    cd backend
    uv run python ../scripts/demo/generate_demo_data.py [--out ../data-demo]
"""

from __future__ import annotations

import argparse
import math
import random
import shutil
import sys
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.storage.car_client import CarClient  # noqa: E402
from app.storage.kilometer_client import KilometerClient  # noqa: E402
from app.storage.models import RefuelMetric  # noqa: E402
from app.storage.refuel_client import RefuelDataClient  # noqa: E402
from app.storage.sqlite_resource import BackendSQLiteResource  # noqa: E402
from fueldata.aggregates import (  # noqa: E402
    AggregatedFuelDataClient,
    DailyBrandAggregateClient,
    DailyPlaceAggregateClient,
)
from fueldata.compressed import CompressedFuelDataClient  # noqa: E402
from fueldata.monthly_aggregates import (  # noqa: E402
    MonthlyBrandAggregateClient,
    MonthlyPlaceAggregateClient,
    MonthlyStationAggregateClient,
)
from fueldata.prices import FuelPriceDataClient  # noqa: E402
from fueldata.stations import FuelStationClient, GasStationInfo  # noqa: E402

SEED = 20260815
DAYS_OF_HISTORY = 460
RAW_PRICE_DAYS = 21  # raw 10-minute samples kept in fueldata.sqlite

DEMO_USER_ID = "104608675968934509626"
DEMO_USER_EMAIL = "demo@refuel-tracker.app"
DEMO_USER_NAME = "Demo User"

FUEL_TYPES = ("e5", "e10", "diesel")

# ---------------------------------------------------------------------------
# Stations (real Berlin Kreuzberg / Neukoelln locations)
# ---------------------------------------------------------------------------

STATIONS = [
    {
        "station_id": "8a1b0c31-1111-4a01-9c01-000000000001",
        "brand": "ARAL",
        "name": "Aral Tankstelle Berlin Skalitzer Strasse",
        "street": "Skalitzer Straße",
        "house_number": "26",
        "post_code": 10999,
        "lat": 52.4996,
        "lng": 13.4261,
    },
    {
        "station_id": "8a1b0c31-2222-4a02-9c02-000000000002",
        "brand": "ARAL",
        "name": "Aral Tankstelle Berlin Prinzenstrasse",
        "street": "Prinzenstraße",
        "house_number": "29",
        "post_code": 10969,
        "lat": 52.5029,
        "lng": 13.4117,
    },
    {
        "station_id": "8a1b0c31-3333-4a03-9c03-000000000003",
        "brand": "Shell",
        "name": "Shell Berlin Skalitzer Str. 48",
        "street": "Skalitzer Str.",
        "house_number": "48",
        "post_code": 10997,
        "lat": 52.5007,
        "lng": 13.4336,
    },
    {
        "station_id": "8a1b0c31-4444-4a04-9c04-000000000004",
        "brand": "Shell",
        "name": "Shell Berlin Oranienstr. 138",
        "street": "Oranienstr.",
        "house_number": "138",
        "post_code": 10969,
        "lat": 52.5031,
        "lng": 13.4181,
    },
    {
        "station_id": "8a1b0c31-5555-4a05-9c05-000000000005",
        "brand": "ARAL",
        "name": "Aral Tankstelle Berlin Holzmarktstrasse",
        "street": "Holzmarktstraße",
        "house_number": "12/14",
        "post_code": 10179,
        "lat": 52.5141,
        "lng": 13.4201,
    },
    {
        "station_id": "8a1b0c31-6666-4a06-9c06-000000000006",
        "brand": "Sprint",
        "name": "Sprint Berlin Reuterstrasse",
        "street": "Reuter Str.",
        "house_number": "18-19",
        "post_code": 12043,
        "lat": 52.4823,
        "lng": 13.4371,
    },
    {
        "station_id": "8a1b0c31-7777-4a07-9c07-000000000007",
        "brand": "ARAL",
        "name": "Aral Tankstelle Berlin Schlesisches Tor",
        "street": "Vor Dem Schlesischen Tor",
        "house_number": "3",
        "post_code": 10997,
        "lat": 52.4999,
        "lng": 13.4451,
    },
    {
        "station_id": "8a1b0c31-8888-4a08-9c08-000000000008",
        "brand": "ESSO",
        "name": "Esso Station Berlin Gneisenaustr.",
        "street": "Gneisenaustr.",
        "house_number": "104-106",
        "post_code": 10961,
        "lat": 52.4916,
        "lng": 13.3901,
    },
    {
        "station_id": "8a1b0c31-9999-4a09-9c09-000000000009",
        "brand": "ARAL",
        "name": "Aral Tankstelle Berlin Sonnenallee",
        "street": "Sonnenallee",
        "house_number": "113",
        "post_code": 12045,
        "lat": 52.4781,
        "lng": 13.4462,
    },
    {
        "station_id": "8a1b0c31-aaaa-4a10-9c10-000000000010",
        "brand": "TotalEnergies",
        "name": "TotalEnergies Berlin Tempelhofer Ufer",
        "street": "Tempelhofer Ufer",
        "house_number": "33-35",
        "post_code": 10963,
        "lat": 52.4986,
        "lng": 13.3831,
    },
]

PLACE = "Berlin"

# Brand price positioning (EUR per liter, relative to the city average).
BRAND_OFFSET = {
    "ARAL": 0.040,
    "Shell": 0.035,
    "ESSO": 0.008,
    "TotalEnergies": -0.020,
    "Sprint": -0.058,
}

# Small, stable per-station deviation on top of the brand offset.
STATION_OFFSET = {
    s["station_id"]: round(((i * 37) % 11 - 5) * 0.0035, 4)
    for i, s in enumerate(STATIONS)
}

FUEL_BASE = {"e10": 1.699, "e5": 1.759, "diesel": 1.639}

# Typical German intraday price cycle: expensive in the morning,
# cheapest in the evening. (hour, minute, delta)
INTRADAY_CYCLE = [
    (5, 0, 0.055),
    (7, 0, 0.048),
    (8, 30, 0.030),
    (10, 0, 0.014),
    (12, 0, 0.004),
    (14, 0, 0.010),
    (15, 30, -0.008),
    (17, 0, -0.020),
    (18, 0, -0.034),
    (19, 0, -0.048),
    (20, 0, -0.062),
    (21, 0, -0.036),
    (22, 0, 0.004),
]


def price_ending(value: float) -> float:
    """Round to a realistic German price ending (x.xx9)."""
    return round(round(value - 0.009, 2) + 0.009, 3)


class PriceModel:
    """Deterministic yet realistic fuel price model for the demo dataset."""

    def __init__(self, start: date, days: int, rng: random.Random):
        self.start = start
        self.days = days
        self.rng = rng
        self.daily_base: dict[str, dict[date, float]] = {}

        for fuel in FUEL_TYPES:
            level = 0.0
            series: dict[date, float] = {}
            for offset in range(days + 2):
                day = start + timedelta(days=offset)
                # slow random walk + yearly seasonality + mild upward drift
                level += rng.gauss(0, 0.006)
                level = max(-0.13, min(0.13, level * 0.995))
                seasonal = 0.055 * math.sin(
                    2 * math.pi * (day.timetuple().tm_yday - 40) / 365
                )
                if fuel == "diesel":
                    # diesel is relatively more expensive in winter
                    seasonal += 0.035 * math.cos(
                        2 * math.pi * (day.timetuple().tm_yday - 10) / 365
                    )
                drift = 0.00006 * offset
                weekday = 0.012 if day.weekday() in (4, 6) else 0.0
                series[day] = FUEL_BASE[fuel] + level + seasonal + drift + weekday
            self.daily_base[fuel] = series

    def station_price(
        self, station_id: str, brand: str, fuel: str, ts: datetime
    ) -> float:
        base = self.daily_base[fuel][ts.date()]
        cycle = min(
            INTRADAY_CYCLE,
            key=lambda c: abs((c[0] * 60 + c[1]) - (ts.hour * 60 + ts.minute)),
        )[2]
        value = (
            base
            + BRAND_OFFSET[brand]
            + STATION_OFFSET[station_id]
            + cycle
            + self.rng.gauss(0, 0.004)
        )
        return price_ending(value)


def build_price_changes(model: PriceModel, start: date, days: int) -> pd.DataFrame:
    """Build the long-format price change history (compressed fuel prices)."""
    rows = []
    for station in STATIONS:
        sid = station["station_id"]
        brand = station["brand"]
        for offset in range(days):
            day = start + timedelta(days=offset)
            for fuel in FUEL_TYPES:
                for hour, minute, _ in INTRADAY_CYCLE:
                    ts = datetime(
                        day.year, day.month, day.day, hour, minute, tzinfo=UTC
                    ) + timedelta(minutes=model.rng.randint(-12, 12))
                    rows.append(
                        {
                            "timestamp": ts,
                            "station_id": sid,
                            "fuel_type": fuel,
                            "price": model.station_price(sid, brand, fuel, ts),
                        }
                    )
    df = pd.DataFrame(rows).sort_values(["station_id", "fuel_type", "timestamp"])
    # Compressed data only keeps actual price changes
    changed = df.groupby(["station_id", "fuel_type"])["price"].diff().ne(0)
    return df[changed.fillna(True)].reset_index(drop=True)


def daily_station_aggregates(changes: pd.DataFrame) -> pd.DataFrame:
    """Mirror of the Dagster ``daily_aggregates`` asset."""
    df = changes.copy()
    df["date"] = df["timestamp"].dt.date
    diff = df.groupby(["station_id", "fuel_type"])["price"].diff()
    df["price_increased"] = diff > 0
    df["price_decreased"] = diff < 0

    agg = (
        df.groupby(["date", "station_id", "fuel_type"])
        .agg(
            n_samples=("price", "count"),
            n_unique_prices=("price", "nunique"),
            price_mean=("price", "mean"),
            price_min=("price", "min"),
            price_max=("price", "max"),
            price_std=("price", "std"),
            n_price_increased=("price_increased", "sum"),
            n_price_decreased=("price_decreased", "sum"),
            ts_min=("timestamp", "min"),
            ts_max=("timestamp", "max"),
        )
        .reset_index()
        .rename(columns={"fuel_type": "type"})
    )
    agg["price_mean"] = agg["price_mean"].round(4)
    return agg


def _group_aggregate(df: pd.DataFrame, keys: list[str], period: str) -> pd.DataFrame:
    """Aggregate price changes over *keys* for a daily or monthly period."""
    diff = df.groupby(["station_id", "fuel_type"])["price"].diff()
    df = df.assign(price_increased=diff > 0, price_decreased=diff < 0)

    count_col = "n_samples" if period == "daily" else "n_price_changes"
    agg = (
        df.groupby(keys)
        .agg(
            n_stations=("station_id", "nunique"),
            **{count_col: ("price", "count")},
            n_unique_prices=("price", "nunique"),
            price_mean=("price", "mean"),
            price_min=("price", "min"),
            price_max=("price", "max"),
            price_std=("price", "std"),
            n_days=("date", "nunique"),
        )
        .reset_index()
    )
    if period == "daily":
        agg = agg.drop(columns=["n_days"])
    agg["price_mean"] = agg["price_mean"].round(4)
    return agg


def write_parquet_datasets(out: Path, changes: pd.DataFrame) -> None:
    station_meta = pd.DataFrame(STATIONS)[["station_id", "brand", "post_code"]]
    station_meta["place"] = PLACE

    enriched = changes.merge(station_meta, on="station_id", how="left")
    enriched["date"] = enriched["timestamp"].dt.date
    enriched["month"] = enriched["timestamp"].dt.to_period("M").dt.start_time.dt.date

    CompressedFuelDataClient(str(out)).store_compressed_data(changes)
    AggregatedFuelDataClient(str(out)).store_daily_aggregates(
        daily_station_aggregates(changes)
    )

    daily_brand = _group_aggregate(enriched, ["date", "brand", "fuel_type"], "daily")
    DailyBrandAggregateClient(str(out)).store_daily_brand_aggregates(daily_brand)

    # The city series is aggregated over all demo stations so the
    # "station vs. city vs. brand" comparison shows one clean line.
    daily_place = _group_aggregate(enriched, ["date", "fuel_type"], "daily")
    daily_place["place"] = PLACE
    daily_place["post_code"] = 10999
    DailyPlaceAggregateClient(str(out)).store_daily_place_aggregates(daily_place)

    monthly_station = _group_aggregate(
        enriched, ["month", "station_id", "fuel_type"], "monthly"
    ).drop(columns=["n_stations"])
    monthly_station = monthly_station.rename(columns={"month": "date"})
    MonthlyStationAggregateClient(str(out)).store_monthly_station_aggregates(
        monthly_station
    )

    monthly_brand = _group_aggregate(
        enriched, ["month", "brand", "fuel_type"], "monthly"
    ).rename(columns={"month": "date"})
    MonthlyBrandAggregateClient(str(out)).store_monthly_brand_aggregates(monthly_brand)

    monthly_place = _group_aggregate(
        enriched, ["month", "fuel_type"], "monthly"
    ).rename(columns={"month": "date"})
    monthly_place["place"] = PLACE
    monthly_place["post_code"] = 10999
    MonthlyPlaceAggregateClient(str(out)).store_monthly_place_aggregates(monthly_place)


def write_raw_prices(out: Path, model: PriceModel, end: datetime) -> None:
    """Write recent raw price samples (10 minute grid) to fueldata.sqlite."""
    resource = BackendSQLiteResource(out / "fueldata.sqlite")
    client = FuelPriceDataClient(resource)

    rows = []
    start = end - timedelta(days=RAW_PRICE_DAYS)
    steps = int((end - start).total_seconds() // 600)
    for station in STATIONS:
        sid = station["station_id"]
        brand = station["brand"]
        for step in range(steps + 1):
            ts = start + timedelta(minutes=10 * step)
            rows.append(
                {
                    "timestamp": ts,
                    "station_id": sid,
                    "station_status": "open",
                    "price_e5": model.station_price(sid, brand, "e5", ts),
                    "price_e10": model.station_price(sid, brand, "e10", ts),
                    "price_diesel": model.station_price(sid, brand, "diesel", ts),
                }
            )

    df = pd.DataFrame(rows)
    # SQLite limits the number of bound variables per statement
    chunk_size = 2_000
    for offset in range(0, len(df), chunk_size):
        client.store_fuel_data(df.iloc[offset : offset + chunk_size])


# ---------------------------------------------------------------------------
# User data
# ---------------------------------------------------------------------------

REFUEL_NOTES = [
    None,
    None,
    None,
    None,
    "Long weekend trip to the Baltic Sea",
    "Motorway run to Hamburg",
    "Cheap evening price",
    "City traffic only",
    "Winter tyres, colder weather",
    "Roof box mounted",
    "Holiday drive to the Alps",
]

# Station usage weights - the two closest stations dominate.
STATION_WEIGHTS = [26, 14, 12, 9, 6, 11, 7, 4, 6, 5]


def seed_user_data(out: Path, model: PriceModel, start: date, end: datetime) -> None:
    resource = BackendSQLiteResource(out / "userdata.sqlite")
    rng = random.Random(SEED + 7)

    car_client = CarClient(resource)
    kilometer_client = KilometerClient(resource)
    refuel_client = RefuelDataClient(resource)
    station_client = FuelStationClient(resource)

    with resource.get_connection() as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT NOT NULL PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                picture_url TEXT,
                picture_base64 TEXT,
                created_at TEXT NOT NULL,
                last_login TEXT NOT NULL
            )
            """
        )
        con.execute(
            "INSERT OR REPLACE INTO users VALUES (?, ?, ?, NULL, NULL, ?, ?)",
            [
                DEMO_USER_ID,
                DEMO_USER_EMAIL,
                DEMO_USER_NAME,
                (end - timedelta(days=DAYS_OF_HISTORY)).isoformat(),
                end.isoformat(),
            ],
        )

    station_client.store_gas_station_info(
        [GasStationInfo(place=PLACE, **s) for s in STATIONS]
    )
    for station in STATIONS:
        station_client.store_favorite_station(DEMO_USER_ID, station["station_id"])

    primary_car = car_client.create_car(
        user_id=DEMO_USER_ID,
        name="VW Golf VII",
        year=2017,
        fuel_tank_size=50.0,
        fuel_type="e10",
    )
    second_car = car_client.create_car(
        user_id=DEMO_USER_ID,
        name="Skoda Octavia Combi",
        year=2021,
        fuel_tank_size=55.0,
        fuel_type="diesel",
    )

    _seed_car(
        refuel_client,
        kilometer_client,
        model,
        rng,
        car_id=primary_car,
        fuel_type="e10",
        start=start,
        end=end,
        start_odometer=68_430,
        base_consumption=6.4,
        interval_days=(9, 15),
    )
    _seed_car(
        refuel_client,
        kilometer_client,
        model,
        rng,
        car_id=second_car,
        fuel_type="diesel",
        start=start,
        end=end,
        start_odometer=31_180,
        base_consumption=5.3,
        interval_days=(16, 26),
    )

    print(f"  primary car id: {primary_car}")
    print(f"  second car id:  {second_car}")


def _seed_car(
    refuel_client: RefuelDataClient,
    kilometer_client: KilometerClient,
    model: PriceModel,
    rng: random.Random,
    *,
    car_id: str,
    fuel_type: str,
    start: date,
    end: datetime,
    start_odometer: float,
    base_consumption: float,
    interval_days: tuple[int, int],
) -> None:
    metrics: list[RefuelMetric] = []
    odometer = float(start_odometer)
    kilometer_points: list[tuple[datetime, float]] = []

    current = datetime(
        start.year, start.month, start.day, 18, 20, tzinfo=UTC
    ) + timedelta(days=rng.randint(0, 6))

    while current < end - timedelta(days=2):
        station = rng.choices(STATIONS, weights=STATION_WEIGHTS, k=1)[0]
        month = current.month
        # winter costs more fuel, summer holidays mean longer trips
        winter = 0.55 if month in (11, 12, 1, 2) else 0.0
        summer_trip = month in (6, 7, 8) and rng.random() < 0.35

        consumption = round(
            base_consumption
            + winter
            + rng.gauss(0, 0.32)
            - (0.3 if summer_trip else 0),
            2,
        )
        consumption = max(base_consumption - 1.1, consumption)
        # the on-board computer is slightly optimistic / noisy
        estimated = round(max(3.0, consumption + rng.gauss(-0.12, 0.22)), 2)

        distance = rng.uniform(470, 660)
        if summer_trip:
            distance = rng.uniform(700, 840)
        distance = round(distance, 1)

        is_full_tank = rng.random() > 0.12
        amount = distance * consumption / 100
        if not is_full_tank:
            amount = amount * rng.uniform(0.45, 0.7)
        amount = round(amount, 2)

        price = model.station_price(
            station["station_id"], station["brand"], fuel_type, current
        )

        metrics.append(
            RefuelMetric(
                timestamp=current,
                user_id=DEMO_USER_ID,
                car_id=car_id,
                price=price,
                amount=amount,
                kilometers_since_last_refuel=distance,
                estimated_fuel_consumption=estimated,
                notes=rng.choice(REFUEL_NOTES),
                station_id=station["station_id"],
                fuel_type=fuel_type,
                is_full_tank=is_full_tank,
            )
        )

        odometer += distance
        kilometer_points.append((current, round(odometer)))
        current = (current + timedelta(days=rng.randint(*interval_days))).replace(
            hour=rng.choice([7, 8, 11, 14, 15, 16, 17, 18]),
            minute=rng.choice([4, 12, 25, 33, 41, 53]),
        )

    refuel_client.add_metrics(metrics, DEMO_USER_ID)

    # Odometer readings are logged with every refuel
    for timestamp, value in kilometer_points:
        kilometer_client.add_entry(
            car_id=car_id,
            total_kilometers=float(value),
            user_id=DEMO_USER_ID,
            timestamp=timestamp,
        )

    print(f"  car {car_id}: {len(metrics)} refuels")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        default=str(REPO_ROOT / "data-demo"),
        help="Target data directory (default: <repo>/data-demo)",
    )
    args = parser.parse_args()

    out = Path(args.out).resolve()
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    rng = random.Random(SEED)
    end = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    start = (end - timedelta(days=DAYS_OF_HISTORY)).date()

    print(f"Generating demo data in {out} ({start} -> {end.date()})")

    model = PriceModel(start, DAYS_OF_HISTORY, rng)

    changes = build_price_changes(model, start, DAYS_OF_HISTORY)
    print(f"  price changes: {len(changes):,}")

    write_parquet_datasets(out, changes)
    write_raw_prices(out, model, end)
    seed_user_data(out, model, start, end)

    print("Done. Start the backend with:")
    print(f"  DATA_PATH={out} uv run uvicorn app.main:app --port 8001")


if __name__ == "__main__":
    main()

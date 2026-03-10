import logging
from collections import defaultdict
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fueldata.monthly_aggregates import (
    MonthlyBrandAggregateClient,
    MonthlyPlaceAggregateClient,
    MonthlyStationAggregateClient,
)
from fueldata.stations import FuelStationClient

from app.auth import CurrentUser
from app.models import (
    AvailableMonth,
    BrandDetailAggregateResponse,
    MonthlyBrandAggregateResponse,
    MonthlyPlaceAggregateResponse,
    MonthlyStationAggregateResponse,
    PlaceDetailAggregateResponse,
    StationDetailAggregateResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_FUEL_TYPES = {"e5", "e10", "diesel"}


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------


def get_monthly_brand_client(request: Request) -> MonthlyBrandAggregateClient:
    return request.app.state.monthly_brand_client


def get_monthly_place_client(request: Request) -> MonthlyPlaceAggregateClient:
    return request.app.state.monthly_place_client


def get_monthly_station_client(request: Request) -> MonthlyStationAggregateClient:
    return request.app.state.monthly_station_client


def get_fuel_station_client(request: Request) -> FuelStationClient:
    return request.app.state.fuel_station_client


def _validate_fuel_type(fuel_type: str) -> None:
    if fuel_type not in VALID_FUEL_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid fuel type. Must be one of: {', '.join(sorted(VALID_FUEL_TYPES))}",
        )


def _collect_available_months(request: Request) -> list[str]:
    """Scan partition directories across all three aggregate types and return sorted unique dates."""
    data_path = Path(request.app.state.monthly_brand_client._base_path).parent

    dates: set[str] = set()
    for subdir in [
        "monthly_agg_price_by_brand",
        "monthly_agg_price_by_place",
        "monthly_agg_price_by_station",
    ]:
        agg_dir = data_path / subdir
        if not agg_dir.exists():
            continue
        for child in agg_dir.iterdir():
            if child.is_dir() and child.name.startswith("date="):
                dates.add(child.name.removeprefix("date="))

    return sorted(dates, reverse=True)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/available-months", response_model=list[AvailableMonth])
async def get_available_months(request: Request):
    """Return the list of months for which aggregate data is available."""
    dates = _collect_available_months(request)

    logger.info(
        "Available months requested",
        extra={"count": len(dates)},
    )

    return [AvailableMonth(date=d) for d in dates]


@router.get("/brands/{fuel_type}", response_model=list[MonthlyBrandAggregateResponse])
async def get_monthly_brands(
    fuel_type: str,
    user: CurrentUser,
    brand_client: MonthlyBrandAggregateClient = Depends(get_monthly_brand_client),
    date: str | None = None,
    limit: int = 10,
):
    """Return monthly brand aggregates for a given fuel type and date, sorted by average price."""
    _validate_fuel_type(fuel_type)

    if date is None:
        raise HTTPException(status_code=400, detail="date query parameter is required")

    aggregates = brand_client.get_monthly_brand_aggregates(
        start_date=date, end_date=date, fuel_type=fuel_type
    )

    # Sort by price_mean ascending (cheapest first)
    aggregates.sort(key=lambda a: a.price_mean)

    if limit > 0:
        aggregates = aggregates[:limit]

    logger.info(
        "Monthly brand aggregates requested",
        extra={
            "fuel_type": fuel_type,
            "date": date,
            "limit": limit,
            "result_count": len(aggregates),
        },
    )

    return [
        MonthlyBrandAggregateResponse(
            brand=a.brand,
            price_mean=a.price_mean,
            price_min=a.price_min,
            price_max=a.price_max,
            n_stations=a.n_stations,
            n_price_changes=a.n_price_changes,
        )
        for a in aggregates
    ]


@router.get("/places/{fuel_type}", response_model=list[MonthlyPlaceAggregateResponse])
async def get_monthly_places(
    fuel_type: str,
    user: CurrentUser,
    place_client: MonthlyPlaceAggregateClient = Depends(get_monthly_place_client),
    date: str | None = None,
    limit: int = 10,
):
    """Return monthly place aggregates for a given fuel type and date, sorted by average price."""
    _validate_fuel_type(fuel_type)

    if date is None:
        raise HTTPException(status_code=400, detail="date query parameter is required")

    aggregates = place_client.get_monthly_place_aggregates(
        start_date=date, end_date=date, fuel_type=fuel_type
    )

    # Sort by price_mean ascending (cheapest first)
    aggregates.sort(key=lambda a: a.price_mean)

    if limit > 0:
        aggregates = aggregates[:limit]

    logger.info(
        "Monthly place aggregates requested",
        extra={
            "fuel_type": fuel_type,
            "date": date,
            "limit": limit,
            "result_count": len(aggregates),
        },
    )

    return [
        MonthlyPlaceAggregateResponse(
            place=a.place,
            post_code=a.post_code,
            price_mean=a.price_mean,
            price_min=a.price_min,
            price_max=a.price_max,
            n_stations=a.n_stations,
        )
        for a in aggregates
    ]


@router.get(
    "/stations/{fuel_type}", response_model=list[MonthlyStationAggregateResponse]
)
async def get_monthly_stations(
    fuel_type: str,
    user: CurrentUser,
    station_client: MonthlyStationAggregateClient = Depends(get_monthly_station_client),
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
    date: str | None = None,
    limit: int = 10,
):
    """Return monthly station aggregates for a given fuel type and date, sorted by average price.

    Enriches station_id with name, brand, and place from the gas_station_info table.
    """
    _validate_fuel_type(fuel_type)

    if date is None:
        raise HTTPException(status_code=400, detail="date query parameter is required")

    aggregates = station_client.get_monthly_station_aggregates(
        start_date=date, end_date=date, fuel_type=fuel_type
    )

    # Sort by price_mean ascending (cheapest first)
    aggregates.sort(key=lambda a: a.price_mean)

    if limit > 0:
        aggregates = aggregates[:limit]

    # Build a lookup map for station metadata
    station_ids = [a.station_id for a in aggregates]
    station_info_map: dict[str, dict] = {}
    for sid in station_ids:
        info_list = fuel_station_client.get_gas_station_info(station_id=sid)
        if info_list:
            station_info_map[sid] = {
                "name": info_list[0].name,
                "brand": info_list[0].brand,
                "street": info_list[0].street,
                "house_number": info_list[0].house_number,
                "place": info_list[0].place,
            }

    logger.info(
        "Monthly station aggregates requested",
        extra={
            "fuel_type": fuel_type,
            "date": date,
            "limit": limit,
            "result_count": len(aggregates),
            "enriched_count": len(station_info_map),
        },
    )

    return [
        MonthlyStationAggregateResponse(
            station_id=a.station_id,
            station_name=station_info_map.get(a.station_id, {}).get("name"),
            brand=station_info_map.get(a.station_id, {}).get("brand"),
            street=station_info_map.get(a.station_id, {}).get("street"),
            house_number=station_info_map.get(a.station_id, {}).get("house_number"),
            place=station_info_map.get(a.station_id, {}).get("place"),
            price_mean=a.price_mean,
            price_min=a.price_min,
            price_max=a.price_max,
            n_price_changes=a.n_price_changes,
        )
        for a in aggregates
    ]


@router.get(
    "/places/{fuel_type}/details",
    response_model=list[PlaceDetailAggregateResponse],
)
async def get_place_details(
    fuel_type: str,
    user: CurrentUser,
    place_client: MonthlyPlaceAggregateClient = Depends(get_monthly_place_client),
    months: int = 3,
    limit: int = 10,
):
    """Return multi-month place aggregates for the top N cheapest places.

    The `months` parameter selects how many months of history to include (3 or 12).
    The top N places are determined by their average price_mean across all months.
    All monthly rows for those places are returned.
    """
    _validate_fuel_type(fuel_type)

    if months not in (3, 12):
        raise HTTPException(
            status_code=400,
            detail="months must be 3 or 12",
        )

    # Compute date range: end_date = 1st of current month, start_date = months back
    today = date.today()
    end_date = today.replace(day=1)
    # Go back `months` months
    month_val = end_date.month - months
    year_val = end_date.year
    while month_val < 1:
        month_val += 12
        year_val -= 1
    start_date = date(year_val, month_val, 1)

    aggregates = place_client.get_monthly_place_aggregates(
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        fuel_type=fuel_type,
    )

    if not aggregates:
        return []

    # Compute average price_mean per place across all months
    place_totals: dict[str, list[float]] = defaultdict(list)
    for a in aggregates:
        place_totals[a.place].append(a.price_mean)

    place_avg = {
        place: sum(prices) / len(prices) for place, prices in place_totals.items()
    }

    # Select top N cheapest places
    top_places = sorted(place_avg, key=lambda p: place_avg[p])[:limit]
    top_places_set = set(top_places)

    # Filter and sort: by date then place
    result = [a for a in aggregates if a.place in top_places_set]
    result.sort(key=lambda a: (a.date.isoformat(), a.place))

    logger.info(
        "Place detail aggregates requested",
        extra={
            "fuel_type": fuel_type,
            "months": months,
            "limit": limit,
            "result_count": len(result),
            "top_places": len(top_places_set),
        },
    )

    return [
        PlaceDetailAggregateResponse(
            date=a.date.isoformat(),
            place=a.place,
            post_code=a.post_code,
            price_mean=a.price_mean,
            price_min=a.price_min,
            price_max=a.price_max,
            price_std=a.price_std,
            n_stations=a.n_stations,
            n_price_changes=a.n_price_changes,
            n_unique_prices=a.n_unique_prices,
            n_days=a.n_days,
            price_changes_per_station_day=(
                a.n_price_changes / (a.n_stations * a.n_days)
                if a.n_stations > 0 and a.n_days > 0
                else 0.0
            ),
            unique_prices_per_station_day=(
                a.n_unique_prices / (a.n_stations * a.n_days)
                if a.n_stations > 0 and a.n_days > 0
                else 0.0
            ),
        )
        for a in result
    ]


@router.get(
    "/brands/{fuel_type}/details",
    response_model=list[BrandDetailAggregateResponse],
)
async def get_brand_details(
    fuel_type: str,
    user: CurrentUser,
    brand_client: MonthlyBrandAggregateClient = Depends(get_monthly_brand_client),
    months: int = 3,
    limit: int = 10,
):
    """Return multi-month brand aggregates for the top N cheapest brands.

    The `months` parameter selects how many months of history to include (3 or 12).
    The top N brands are determined by their average price_mean across all months.
    All monthly rows for those brands are returned.
    """
    _validate_fuel_type(fuel_type)

    if months not in (3, 12):
        raise HTTPException(
            status_code=400,
            detail="months must be 3 or 12",
        )

    today = date.today()
    end_date = today.replace(day=1)
    month_val = end_date.month - months
    year_val = end_date.year
    while month_val < 1:
        month_val += 12
        year_val -= 1
    start_date = date(year_val, month_val, 1)

    aggregates = brand_client.get_monthly_brand_aggregates(
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        fuel_type=fuel_type,
    )

    if not aggregates:
        return []

    # Compute average price_mean per brand across all months
    brand_totals: dict[str, list[float]] = defaultdict(list)
    for a in aggregates:
        brand_totals[a.brand].append(a.price_mean)

    brand_avg = {
        brand: sum(prices) / len(prices) for brand, prices in brand_totals.items()
    }

    # Select top N cheapest brands
    top_brands = sorted(brand_avg, key=lambda b: brand_avg[b])[:limit]
    top_brands_set = set(top_brands)

    # Filter and sort: by date then brand
    result = [a for a in aggregates if a.brand in top_brands_set]
    result.sort(key=lambda a: (a.date.isoformat(), a.brand))

    logger.info(
        "Brand detail aggregates requested",
        extra={
            "fuel_type": fuel_type,
            "months": months,
            "limit": limit,
            "result_count": len(result),
            "top_brands": len(top_brands_set),
        },
    )

    return [
        BrandDetailAggregateResponse(
            date=a.date.isoformat(),
            brand=a.brand,
            price_mean=a.price_mean,
            price_min=a.price_min,
            price_max=a.price_max,
            price_std=a.price_std,
            n_stations=a.n_stations,
            n_price_changes=a.n_price_changes,
            n_unique_prices=a.n_unique_prices,
            n_days=a.n_days,
            price_changes_per_station_day=(
                a.n_price_changes / (a.n_stations * a.n_days)
                if a.n_stations > 0 and a.n_days > 0
                else 0.0
            ),
            unique_prices_per_station_day=(
                a.n_unique_prices / (a.n_stations * a.n_days)
                if a.n_stations > 0 and a.n_days > 0
                else 0.0
            ),
        )
        for a in result
    ]


@router.get(
    "/stations/{fuel_type}/details",
    response_model=list[StationDetailAggregateResponse],
)
async def get_station_details(
    fuel_type: str,
    user: CurrentUser,
    station_client: MonthlyStationAggregateClient = Depends(get_monthly_station_client),
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
    months: int = 3,
    limit: int = 10,
):
    """Return multi-month station aggregates for the top N cheapest stations.

    The `months` parameter selects how many months of history to include (3 or 12).
    The top N stations are determined by their average price_mean across all months.
    All monthly rows for those stations are returned.
    """
    _validate_fuel_type(fuel_type)

    if months not in (3, 12):
        raise HTTPException(
            status_code=400,
            detail="months must be 3 or 12",
        )

    today = date.today()
    end_date = today.replace(day=1)
    month_val = end_date.month - months
    year_val = end_date.year
    while month_val < 1:
        month_val += 12
        year_val -= 1
    start_date = date(year_val, month_val, 1)

    aggregates = station_client.get_monthly_station_aggregates(
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        fuel_type=fuel_type,
    )

    if not aggregates:
        return []

    # Compute average price_mean per station across all months
    station_totals: dict[str, list[float]] = defaultdict(list)
    for a in aggregates:
        station_totals[a.station_id].append(a.price_mean)

    station_avg = {
        sid: sum(prices) / len(prices) for sid, prices in station_totals.items()
    }

    # Select top N cheapest stations
    top_stations = sorted(station_avg, key=lambda s: station_avg[s])[:limit]
    top_stations_set = set(top_stations)

    # Filter and sort: by date then station_id
    result = [a for a in aggregates if a.station_id in top_stations_set]
    result.sort(key=lambda a: (a.date.isoformat(), a.station_id))

    # Build a lookup map for station metadata
    station_info_map: dict[str, dict] = {}
    for sid in top_stations:
        info_list = fuel_station_client.get_gas_station_info(station_id=sid)
        if info_list:
            info = info_list[0]
            label = info.brand or info.name or sid
            if info.place:
                label = f"{label} ({info.place})"
            station_info_map[sid] = {
                "name": info.name,
                "brand": info.brand,
                "place": info.place,
                "label": label,
            }

    logger.info(
        "Station detail aggregates requested",
        extra={
            "fuel_type": fuel_type,
            "months": months,
            "limit": limit,
            "result_count": len(result),
            "top_stations": len(top_stations_set),
        },
    )

    return [
        StationDetailAggregateResponse(
            date=a.date.isoformat(),
            station_id=a.station_id,
            station_name=station_info_map.get(a.station_id, {}).get("name"),
            brand=station_info_map.get(a.station_id, {}).get("brand"),
            place=station_info_map.get(a.station_id, {}).get("place"),
            price_mean=a.price_mean,
            price_min=a.price_min,
            price_max=a.price_max,
            price_std=a.price_std,
            n_stations=1,
            n_price_changes=a.n_price_changes,
            n_unique_prices=a.n_unique_prices,
            n_days=a.n_days,
            price_changes_per_station_day=(
                a.n_price_changes / a.n_days if a.n_days > 0 else 0.0
            ),
            unique_prices_per_station_day=(
                a.n_unique_prices / a.n_days if a.n_days > 0 else 0.0
            ),
        )
        for a in result
    ]

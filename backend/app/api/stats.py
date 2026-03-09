import logging
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
    MonthlyBrandAggregateResponse,
    MonthlyPlaceAggregateResponse,
    MonthlyStationAggregateResponse,
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

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fueldata.stations import FuelStationClient

from ..auth import CurrentUser
from ..models import (
    FavoriteStationsDropdownResponse,
    RefuelCostStatistics,
    RefuelMetricCreate,
    RefuelMetricResponse,
    RefuelMonthlySummaryResponse,
    RefuelPriceTrend,
    RefuelStatisticsResponse,
)
from ..storage.car_client import CarClient
from ..storage.refuel_client import RefuelDataClient

router = APIRouter()
logger = logging.getLogger(__name__)


def get_refuel_client(request: Request) -> RefuelDataClient:
    """Dependency to get the refuel client from app state"""
    return request.app.state.refuel_client


def get_car_client(request: Request) -> CarClient:
    """Dependency to get the car client from app state"""
    return request.app.state.car_client


def get_fuel_station_client(request: Request) -> FuelStationClient:
    """Dependency to get the fuel station client from app state"""
    return request.app.state.fuel_station_client


# Refuel-specific endpoints
@router.post("/refuel", response_model=dict)
async def create_refuel_metric(
    metric_data: RefuelMetricCreate,
    user: CurrentUser,
    client: RefuelDataClient = Depends(get_refuel_client),
):
    """Create a new refuel entry"""
    logger.info(
        "Creating refuel metric",
        extra={
            "user_id": user.id,
            "car_id": metric_data.car_id,
            "amount_liters": metric_data.amount,
            "price_per_liter": metric_data.price,
        },
    )

    # Convert Pydantic model to RefuelMetric
    from ..storage.refuel_client import RefuelMetric

    metric = RefuelMetric(
        timestamp=metric_data.timestamp,
        user_id=user.id,
        car_id=metric_data.car_id,
        price=metric_data.price,
        amount=metric_data.amount,
        kilometers_since_last_refuel=metric_data.kilometers_since_last_refuel,
        estimated_fuel_consumption=metric_data.estimated_fuel_consumption,
        notes=metric_data.notes,
        station_id=metric_data.station_id,
    )

    success = client.add_metric(metric, user.id)

    if success:
        return {
            "message": "Refuel metric created successfully",
            "metric_type": "refuel",
            "data": metric_data.model_dump(),
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to create refuel metric")


@router.get("/refuel", response_model=list[RefuelMetricResponse])
async def get_refuel_metrics(
    user: CurrentUser,
    client: RefuelDataClient = Depends(get_refuel_client),
    car_client: CarClient = Depends(get_car_client),
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
    car_id: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int | None = 100,
):
    """Get refuel metrics with optional filters.

    If car_id is provided, returns ALL refuels for that car (for shared car access).
    The user must have access to the car (either owner or shared access).
    """
    logger.info(
        "Getting refuel metrics",
        extra={"user_id": user.id, "car_id": car_id, "limit": limit},
    )

    # If car_id is provided, verify user has access to the car
    if car_id is not None:
        if not car_client.user_has_car_access(car_id, user.id):
            raise HTTPException(
                status_code=403, detail="You don't have access to this car"
            )

    # Parse dates if provided
    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) if end_date else None

    # Get metrics - if car_id is provided, get all metrics for the car (regardless of user)
    # This allows shared users to see all refuels for the car
    metrics = client.get_metrics(
        user_id=user.id if car_id is None else None,
        car_id=car_id,
        start_date=start_dt,
        end_date=end_dt,
        limit=limit,
    )

    # Look up fuel tank size for remaining range calculation
    fuel_tank_size: float | None = None
    if car_id is not None:
        car = car_client.get_car(car_id, user.id)
        if car is not None:
            fuel_tank_size = car.fuel_tank_size

    # Collect unique station IDs and fetch station info in bulk
    station_ids = [m.station_id for m in metrics if m.station_id]
    stations_map = fuel_station_client.get_gas_stations_by_ids(station_ids)

    # Convert to response models
    result = []
    for metric in metrics:
        remaining_range_km: float | None = None
        if (
            fuel_tank_size is not None
            and metric.amount > 0
            and metric.kilometers_since_last_refuel > 0
            and metric.amount < fuel_tank_size
        ):
            # remaining_fuel / consumption_per_km
            # = (tank - amount) / (amount / km) = (tank - amount) * km / amount
            remaining_range_km = round(
                (fuel_tank_size - metric.amount)
                / metric.amount
                * metric.kilometers_since_last_refuel,
                1,
            )

        # Get station info if available
        station_info = (
            stations_map.get(metric.station_id) if metric.station_id else None
        )

        result.append(
            RefuelMetricResponse(
                timestamp=metric.timestamp,
                user_id=metric.user_id,
                car_id=metric.car_id,
                price=metric.price,
                amount=metric.amount,
                kilometers_since_last_refuel=metric.kilometers_since_last_refuel,
                estimated_fuel_consumption=metric.estimated_fuel_consumption,
                notes=metric.notes,
                station_id=metric.station_id,
                remaining_range_km=remaining_range_km,
                station_brand=station_info.brand if station_info else None,
                station_place=station_info.place if station_info else None,
                station_street=station_info.street if station_info else None,
                station_house_number=station_info.house_number
                if station_info
                else None,
                station_post_code=station_info.post_code if station_info else None,
            )
        )

    return result


@router.get("/refuel/statistics", response_model=RefuelStatisticsResponse)
async def get_refuel_statistics(
    user: CurrentUser,
    client: RefuelDataClient = Depends(get_refuel_client),
    car_client: CarClient = Depends(get_car_client),
    car_id: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
):
    """Get specialized refuel statistics (cost analysis, price trends).

    If car_id is provided, returns statistics for ALL refuels for that car.
    The user must have access to the car (either owner or shared access).
    """
    logger.info(
        "Getting refuel statistics", extra={"user_id": user.id, "car_id": car_id}
    )

    # If car_id is provided, verify user has access to the car
    if car_id is not None:
        if not car_client.user_has_car_access(car_id, user.id):
            raise HTTPException(
                status_code=403, detail="You don't have access to this car"
            )

    # Parse dates if provided
    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) if end_date else None

    # Get statistics - if car_id is provided, get stats for all refuels for the car
    user_id_for_query = user.id if car_id is None else None

    # Get cost statistics
    cost_stats = client.get_total_cost_by_period(
        user_id_for_query, car_id, start_dt, end_dt
    )

    # Get price trends
    price_trends_raw = client.get_price_trends(
        user_id_for_query, car_id, start_dt, end_dt
    )

    # Convert to Pydantic models
    cost_statistics = RefuelCostStatistics(**cost_stats)

    price_trends = []
    for trend in price_trends_raw:
        price_trends.append(RefuelPriceTrend(**trend))

    return RefuelStatisticsResponse(
        cost_statistics=cost_statistics, price_trends=price_trends
    )


@router.get(
    "/refuel/monthly/{year}/{month}",
    response_model=RefuelMonthlySummaryResponse,
)
async def get_refuel_monthly_summary(
    user: CurrentUser,
    year: int,
    month: int,
    client: RefuelDataClient = Depends(get_refuel_client),
):
    """Get detailed refuel statistics for a specific month"""
    logger.info(
        f"Getting refuel monthly summary for user {user.id}, {year}-{month:02d}"
    )

    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")

    summary_data = client.get_monthly_summary(user.id, year, month)

    return RefuelMonthlySummaryResponse(**summary_data)


@router.get(
    "/refuel/favorite-stations", response_model=FavoriteStationsDropdownResponse
)
async def get_favorite_stations_for_dropdown(
    user: CurrentUser,
    refuel_client: RefuelDataClient = Depends(get_refuel_client),
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
    lat: float | None = None,
    lng: float | None = None,
):
    """Get user's favorite stations for refuel dropdown (without fuel prices)"""
    logger.info(f"Getting favorite stations for dropdown for user {user.id}")

    stations = refuel_client.get_favorite_stations_for_dropdown(
        user.id, fuel_station_client, user_lat=lat, user_lng=lng
    )

    return stations

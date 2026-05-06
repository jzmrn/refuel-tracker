import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fueldata.prices import FuelPriceDataClient
from fueldata.stations import FuelStationClient
from tankerkoenig import TankerkoenigClient

from ..auth import CurrentUser
from ..models import (
    FavoriteStationsDropdownResponse,
    FuelPrice,
    FuelPrices,
    RefuelCostStatistics,
    RefuelMetricCreate,
    RefuelMetricResponse,
    RefuelMonthlySummaryResponse,
    RefuelPriceTrend,
    RefuelStatisticsResponse,
    StationDropdownItem,
)
from ..storage.car_client import CarClient
from ..storage.refuel_client import RefuelDataClient

router = APIRouter()
logger = logging.getLogger(__name__)

# Maximum age for prices to be considered fresh (30 minutes)
MAX_PRICE_AGE_MINUTES = 30


def get_refuel_client(request: Request) -> RefuelDataClient:
    """Dependency to get the refuel client from app state"""
    return request.app.state.refuel_client


def get_car_client(request: Request) -> CarClient:
    """Dependency to get the car client from app state"""
    return request.app.state.car_client


def get_fuel_station_client(request: Request) -> FuelStationClient:
    """Dependency to get the fuel station client from app state"""
    return request.app.state.fuel_station_client


def get_fuel_price_data_client(request: Request) -> FuelPriceDataClient:
    """Dependency to get the fuel price data client from app state"""
    return request.app.state.fuel_price_data_client


def get_tankerkoenig_client(request: Request) -> TankerkoenigClient:
    """Dependency to get the tankerkoenig client from app state"""
    return request.app.state.tankerkoenig_client


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
        fuel_type=metric_data.fuel_type,
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
                fuel_type=metric.fuel_type,
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
    fuel_price_data_client: FuelPriceDataClient = Depends(get_fuel_price_data_client),
    tankerkoenig_client: TankerkoenigClient = Depends(get_tankerkoenig_client),
    lat: float | None = None,
    lng: float | None = None,
):
    """Get user's favorite stations for refuel dropdown with current fuel prices.

    Prices are only included if they are less than 30 minutes old.
    For favorite stations, prices are fetched from the local database only.
    For the closest station (if not a favorite), prices are always fetched
    from the Tankerkoenig API since it's the most likely to be selected.
    """
    logger.info(f"Getting favorite stations for dropdown for user {user.id}")

    # Get basic station info
    stations_response = refuel_client.get_favorite_stations_for_dropdown(
        user.id, fuel_station_client, user_lat=lat, user_lng=lng
    )

    favorite_ids = {s.station_id for s in stations_response.favorites}

    # Check if closest station is already in favorites
    closest_is_favorite = (
        stations_response.closest is not None
        and stations_response.closest.station_id in favorite_ids
    )

    # Fetch prices from SQLite for favorite stations only
    now = datetime.now(UTC)
    max_age = timedelta(minutes=MAX_PRICE_AGE_MINUTES)

    sqlite_price_map = {}
    if favorite_ids:
        latest_prices = fuel_price_data_client.get_latest_prices(list(favorite_ids))
        sqlite_price_map = {p.station_id: p for p in latest_prices}

    def build_fuel_prices_from_sqlite(station_id: str) -> FuelPrices | None:
        """Build FuelPrices for a station from SQLite, only if prices are fresh."""
        if station_id in sqlite_price_map:
            sp = sqlite_price_map[station_id]
            if sp.updated_at and (now - sp.updated_at) <= max_age:
                return FuelPrices(
                    e5=FuelPrice(value=sp.price_e5, timestamp=sp.since_e5),
                    e10=FuelPrice(value=sp.price_e10, timestamp=sp.since_e10),
                    diesel=FuelPrice(value=sp.price_diesel, timestamp=sp.since_diesel),
                )
        return None

    # Build favorites with prices from SQLite only
    favorites_with_prices = [
        StationDropdownItem(
            station_id=s.station_id,
            brand=s.brand,
            street=s.street,
            house_number=s.house_number,
            place=s.place,
            prices=build_fuel_prices_from_sqlite(s.station_id),
        )
        for s in stations_response.favorites
    ]

    # Handle closest station
    closest_with_prices = None
    if stations_response.closest:
        c = stations_response.closest

        if closest_is_favorite:
            # Closest is a favorite - use SQLite prices
            closest_with_prices = StationDropdownItem(
                station_id=c.station_id,
                brand=c.brand,
                street=c.street,
                house_number=c.house_number,
                place=c.place,
                prices=build_fuel_prices_from_sqlite(c.station_id),
            )
        else:
            # Closest is not a favorite - fetch from Tankerkoenig API
            closest_prices = None
            try:
                prices = tankerkoenig_client.get_gas_station_prices([c.station_id])
                if prices:
                    ap = prices[0]
                    closest_prices = FuelPrices(
                        e5=FuelPrice(value=ap.e5, timestamp=ap.timestamp),
                        e10=FuelPrice(value=ap.e10, timestamp=ap.timestamp),
                        diesel=FuelPrice(value=ap.diesel, timestamp=ap.timestamp),
                    )
            except Exception as e:
                logger.warning(
                    "Error fetching price for closest station from Tankerkoenig API",
                    extra={"station_id": c.station_id, "error": str(e)},
                )
                # Don't propagate error - just return station without prices

            closest_with_prices = StationDropdownItem(
                station_id=c.station_id,
                brand=c.brand,
                street=c.street,
                house_number=c.house_number,
                place=c.place,
                prices=closest_prices,
            )

    return FavoriteStationsDropdownResponse(
        favorites=favorites_with_prices,
        closest=closest_with_prices,
    )

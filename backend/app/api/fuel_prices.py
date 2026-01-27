import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fueldata.aggregates import AggregatedFuelDataClient
from fueldata.stations import FuelStationClient, GasStationInfo
from tankerkoenig import TankerkoenigClient
from tankerkoenig.models import (
    FuelType,
    GasStationAllPrices,
    GasStationOnePrice,
    GasStationPrice,
    SortBy,
)

from ..auth import CurrentUser
from ..models import (
    DailyStatsPoint,
    FavoriteStationCreate,
    FavoriteStationResponse,
    GasStationResponse,
    GasStationSearchRequest,
    SingleFuelPriceHistoryPoint,
    StationDailyStatsResponse,
    StationMetaResponse,
    StationPriceHistoryResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Cache is valid for 5 minutes
CACHE_DURATION_MINUTES = 5


class FuelPriceCache:
    """Cache for fuel prices with automatic expiry handling"""

    def __init__(self, cache_duration_minutes: int = CACHE_DURATION_MINUTES):
        self._cache: dict[str, tuple[GasStationPrice, datetime]] = {}
        self._cache_duration = timedelta(minutes=cache_duration_minutes)

    def get(self, station_id: str) -> GasStationPrice | None:
        """Get a price from cache if it exists and hasn't expired"""

        if station_id not in self._cache:
            return None

        price, cached_at = self._cache[station_id]

        # Check if entry has expired based on when we cached it
        if datetime.now(UTC) - cached_at >= self._cache_duration:
            del self._cache[station_id]
            return None

        return price

    def set(self, station_id: str, price: GasStationPrice) -> None:
        """Store a price in the cache with the current time as cache timestamp"""
        self._cache[station_id] = (price, datetime.now(UTC))


# Initialize the cache
fuel_price_cache = FuelPriceCache()


def get_tankerkoenig_client(request: Request):
    """Dependency to get the tankerkoenig client from app state"""
    return request.app.state.tankerkoenig_client


def get_fuel_station_client(request: Request):
    """Dependency to get the fuel station client from app state"""
    return request.app.state.fuel_station_client


def get_aggregated_fuel_data_client(request: Request):
    """Dependency to get the aggregated fuel data client from app state"""
    return request.app.state.aggregated_fuel_data_client


def gas_station_info(
    station: GasStationOnePrice | GasStationAllPrices,
) -> GasStationInfo:
    """Convert tankerkoenig gas station to GasStationInfo model"""

    # Handle missing house number by trying to extract from street
    house_number = station.houseNumber
    street = station.street.title()
    if house_number is None or house_number == "":
        street_parts = street.split(" ")
        if len(street_parts) > 1 and street_parts[-1].isnumeric():
            house_number = street_parts[-1]
            street = " ".join(street_parts[:-1])

    return GasStationInfo(
        station_id=station.id,
        name=station.name,
        brand=station.brand,
        street=street,
        place=station.place.title(),
        lat=station.lat,
        lng=station.lng,
        house_number=house_number,
        post_code=station.postCode,
    )


@router.post("/search", response_model=list[GasStationResponse])
async def search_gas_stations(
    search_params: GasStationSearchRequest,
    user: CurrentUser,
    tankerkoenig_client: TankerkoenigClient = Depends(get_tankerkoenig_client),
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
):
    """Search for gas stations near a location and store station details"""
    logger.info(
        "Searching gas stations",
        extra={
            "user_id": user.id,
            "lat": search_params.lat,
            "lng": search_params.lng,
            "radius_km": search_params.rad,
        },
    )

    # Map string values to enums
    fuel_type_map = {
        "e5": FuelType.E5,
        "e10": FuelType.E10,
        "diesel": FuelType.DIESEL,
        "all": FuelType.ALL,
    }
    sort_by_map = {"price": SortBy.PRICE, "dist": SortBy.DIST}

    fuel_type = fuel_type_map.get(search_params.fuel_type.lower(), FuelType.ALL)
    sort_by = sort_by_map.get(search_params.sort_by.lower(), SortBy.DIST)

    # Search stations
    stations = tankerkoenig_client.search_gas_stations(
        lat=search_params.lat,
        lng=search_params.lng,
        rad=search_params.rad,
        fuel_type=fuel_type,
        sort_by=sort_by,
    )

    # Store station information in database for all found stations
    stations_to_store = []

    # Convert to response models
    result = []
    skipped_count = 0
    for station in stations:
        station_info = gas_station_info(station)
        stations_to_store.append(station_info)

        # Filter for open stations only if requested
        if search_params.open_only and not station.isOpen:
            skipped_count += 1
            continue

        # Handle both GasStationOnePrice (has 'price' field) and GasStationAllPrices (has e5/e10/diesel)
        diesel = None
        e5 = None
        e10 = None

        if isinstance(station, GasStationOnePrice):
            if fuel_type == FuelType.DIESEL:
                diesel = station.price
            elif fuel_type == FuelType.E5:
                e5 = station.price
            elif fuel_type == FuelType.E10:
                e10 = station.price

        elif isinstance(station, GasStationAllPrices):
            diesel = station.diesel
            e5 = station.e5
            e10 = station.e10

        response = GasStationResponse(
            id=station_info.station_id,
            name=station_info.name,
            brand=station_info.brand,
            street=station_info.street,
            house_number=station_info.house_number,
            post_code=station_info.post_code,
            place=station_info.place,
            lat=station_info.lat,
            lng=station_info.lng,
            diesel=diesel,
            e5=e5,
            e10=e10,
            dist=station.dist,
            is_open=station.isOpen,
        )
        result.append(response)

    if stations_to_store:
        fuel_station_client.store_gas_station_info(stations_to_store)
        logger.debug(
            "Stored station information",
            extra={"station_count": len(stations_to_store)},
        )

    if skipped_count > 0:
        logger.debug(
            "Skipped closed stations",
            extra={"skipped_count": skipped_count, "open_only": True},
        )

    return result


@router.post("/favorites", response_model=dict)
async def add_favorite_station(
    favorite_data: FavoriteStationCreate,
    user: CurrentUser,
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
    tankerkoenig_client: TankerkoenigClient = Depends(get_tankerkoenig_client),
):
    """Add a gas station to favorites (station details should already be stored from search)"""
    logger.info(
        "Adding favorite station",
        extra={"station_id": favorite_data.station_id, "user_id": user.id},
    )

    # Check if station exists in database
    if not fuel_station_client.station_exists(favorite_data.station_id):
        # Station not in database yet, fetch and store it
        # This handles edge cases where user bookmarks without searching first
        logger.info(
            "Station not found in database, fetching from API",
            extra={"station_id": favorite_data.station_id},
        )
        station_detail = tankerkoenig_client.get_gas_station_detail(
            favorite_data.station_id
        )
        station_info = gas_station_info(station_detail)
        fuel_station_client.store_gas_station_info([station_info])

    # Add to favorites
    fuel_station_client.store_favorite_station(user.id, favorite_data.station_id)

    return {
        "status": "success",
        "message": "Station added to favorites",
        "station_id": favorite_data.station_id,
    }


@router.get("/favorites", response_model=list[FavoriteStationResponse])
async def get_favorite_stations(
    user: CurrentUser,
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
    tankerkoenig_client: TankerkoenigClient = Depends(get_tankerkoenig_client),
):
    """Get user's favorite stations with current prices"""
    logger.info("Getting favorite stations with prices", extra={"user_id": user.id})

    # Get favorites from database
    favorites = fuel_station_client.get_favorite_stations_with_info(user.id)
    station_info_map = {favorite.station_id: favorite for favorite in favorites}

    # Check cache for existing prices (valid for 5 minutes)
    stations_to_fetch: list[GasStationInfo] = []
    results = []
    cached_count = 0

    for station in station_info_map.values():
        # Try to get from cache (automatically checks expiry)
        cache_entry = fuel_price_cache.get(station.station_id)

        if cache_entry is None:
            stations_to_fetch.append(station)
            continue

        cached_count += 1
        results.append(
            FavoriteStationResponse(
                user_id=user.id,
                station_id=station.station_id,
                name=station.name,
                brand=station.brand,
                street=station.street,
                house_number=station.house_number,
                post_code=station.post_code,
                place=station.place,
                lat=station.lat,
                lng=station.lng,
                timestamp=cache_entry.timestamp,
                current_price_e5=cache_entry.e5,
                current_price_e10=cache_entry.e10,
                current_price_diesel=cache_entry.diesel,
                is_open=cache_entry.status == "open" if cache_entry.status else None,
            )
        )

    if cached_count > 0:
        logger.debug(
            "Using cached prices", extra={"cached_station_count": cached_count}
        )
    if len(stations_to_fetch) > 0:
        logger.debug(
            "Fetching fresh prices",
            extra={"stations_to_fetch_count": len(stations_to_fetch)},
        )

    # Get current prices for stations not in cache, up to 10 stations at a time
    for i in range(0, len(stations_to_fetch), 10):
        stations = stations_to_fetch[i : i + 10]
        prices = []

        try:
            batch_ids = [station.station_id for station in stations]
            prices = tankerkoenig_client.get_gas_station_prices(batch_ids)

        except Exception as e:
            logger.error(
                "Error fetching prices for favorite stations",
                extra={
                    "station_ids": batch_ids,
                    "error": str(e),
                },
            )

        # Update cache with new prices
        for price in prices:
            fuel_price_cache.set(price.station_id, price)

        prices_map: dict[str, GasStationPrice] = {
            price.station_id: price for price in prices
        }
        for station in stations:
            price = prices_map.get(station.station_id)

            results.append(
                FavoriteStationResponse(
                    user_id=user.id,
                    station_id=station.station_id,
                    name=station.name,
                    brand=station.brand,
                    street=station.street,
                    house_number=station.house_number,
                    post_code=station.post_code,
                    place=station.place,
                    lat=station.lat,
                    lng=station.lng,
                    timestamp=price.timestamp if price else None,
                    current_price_e5=price.e5 if price else None,
                    current_price_e10=price.e10 if price else None,
                    current_price_diesel=price.diesel if price else None,
                    is_open=price.status == "open" if price and price.status else None,
                )
            )

    return results


@router.delete("/favorites/{station_id}")
async def delete_favorite_station(
    station_id: str,
    user: CurrentUser,
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
):
    """Remove a station from favorites"""
    logger.info(
        "Deleting favorite station",
        extra={"station_id": station_id, "user_id": user.id},
    )

    fuel_station_client.delete_favorite_station(user.id, station_id)

    return {
        "status": "success",
        "message": "Station removed from favorites",
        "station_id": station_id,
    }


@router.get("/stations/{station_id}", response_model=StationMetaResponse)
async def get_station_meta(
    station_id: str,
    user: CurrentUser,
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
    tankerkoenig_client: TankerkoenigClient = Depends(get_tankerkoenig_client),
):
    """Get meta information about a specific gas station with current prices (without price history)"""

    logger.info(
        "Getting station meta",
        extra={"station_id": station_id, "user_id": user.id},
    )

    # Check cache first
    price = fuel_price_cache.get(station_id)

    # Get station info from database
    station_infos = fuel_station_client.get_gas_station_info(station_id)
    station_info = station_infos[0] if station_infos else None

    # If station doesn't exist in database, raise 404 error
    if station_info is None:
        logger.info("Station not found", extra={"station_id": station_id})
        raise HTTPException(status_code=404, detail="Station not found")

    # Use cached price if available
    if price is None:
        logger.debug(
            "Fetching fresh price for station", extra={"station_id": station_id}
        )

        # Fetch fresh prices from API
        try:
            prices = tankerkoenig_client.get_gas_station_prices([station_id])
            price = prices[0] if prices else None

        except Exception as e:
            logger.error(
                "Failed to fetch fuel prices",
                extra={"station_id": station_id, "error": str(e)},
            )

        if price:
            fuel_price_cache.set(station_id, price)

    else:
        logger.debug("Using cached price for station", extra={"station_id": station_id})

    return StationMetaResponse(
        station_id=station_info.station_id,
        name=station_info.name,
        brand=station_info.brand,
        street=station_info.street,
        house_number=station_info.house_number,
        post_code=station_info.post_code,
        place=station_info.place,
        lat=station_info.lat,
        lng=station_info.lng,
        timestamp=price.timestamp if price else None,
        current_price_e5=price.e5 if price else None,
        current_price_e10=price.e10 if price else None,
        current_price_diesel=price.diesel if price else None,
        is_open=price.status == "open" if price else None,
    )


@router.get(
    "/stations/{station_id}/price-history/{fuel_type}",
    response_model=StationPriceHistoryResponse,
)
async def get_station_price_history(
    station_id: str,
    fuel_type: str,
    user: CurrentUser,
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
    hours: int = 24,
):
    """Get price history for a specific gas station and fuel type"""

    # Validate fuel type
    valid_fuel_types = ["e5", "e10", "diesel"]
    if fuel_type not in valid_fuel_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid fuel type. Must be one of: {', '.join(valid_fuel_types)}",
        )

    # Validate hours parameter (max 1 week = 168 hours)
    max_hours = 168
    if hours < 1:
        hours = 24
    elif hours > max_hours:
        hours = max_hours

    logger.info(
        "Getting station price history",
        extra={
            "station_id": station_id,
            "fuel_type": fuel_type,
            "user_id": user.id,
            "hours": hours,
        },
    )

    # Verify station exists
    station_infos = fuel_station_client.get_gas_station_info(station_id)
    if not station_infos:
        logger.info("Station not found", extra={"station_id": station_id})
        raise HTTPException(status_code=404, detail="Station not found")

    # Get price history for the specified number of hours
    price_history_data = fuel_station_client.get_price_history(station_id, hours=hours)

    # Map fuel type to the correct attribute
    fuel_type_attr = f"price_{fuel_type}"

    price_history = [
        SingleFuelPriceHistoryPoint(
            timestamp=point.timestamp,
            price=getattr(point, fuel_type_attr, None),
        )
        for point in price_history_data
    ]

    logger.debug(
        "Retrieved price history",
        extra={
            "station_id": station_id,
            "fuel_type": fuel_type,
            "history_count": len(price_history),
        },
    )

    return StationPriceHistoryResponse(
        station_id=station_id,
        fuel_type=fuel_type,
        price_history=price_history,
    )


@router.get(
    "/stations/{station_id}/daily-stats/{fuel_type}",
    response_model=StationDailyStatsResponse,
)
async def get_station_daily_stats(
    station_id: str,
    fuel_type: str,
    user: CurrentUser,
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
    aggregated_fuel_data_client: AggregatedFuelDataClient = Depends(
        get_aggregated_fuel_data_client
    ),
    days: int = 7,
):
    """Get daily statistics for a specific gas station and fuel type"""

    # Validate fuel type
    valid_fuel_types = ["e5", "e10", "diesel"]
    if fuel_type not in valid_fuel_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid fuel type. Must be one of: {', '.join(valid_fuel_types)}",
        )

    # Validate days parameter (min 1, max 90 days)
    max_days = 90
    if days < 1:
        days = 7
    elif days > max_days:
        days = max_days

    logger.info(
        "Getting station daily stats",
        extra={
            "station_id": station_id,
            "fuel_type": fuel_type,
            "user_id": user.id,
            "days": days,
        },
    )

    # Verify station exists
    station_infos = fuel_station_client.get_gas_station_info(station_id)
    if not station_infos:
        logger.info("Station not found", extra={"station_id": station_id})
        raise HTTPException(status_code=404, detail="Station not found")

    # Calculate date range
    end_date = datetime.now(UTC)
    start_date = end_date - timedelta(days=days)

    # Get daily aggregates filtered by station_id and fuel_type at SQL level
    daily_aggregates = aggregated_fuel_data_client.get_daily_aggregates(
        start_date=start_date,
        end_date=end_date,
        station_id=station_id,
        fuel_type=fuel_type,
    )

    daily_stats = [
        DailyStatsPoint(
            date=agg.date,
            n_samples=agg.n_samples,
            n_price_changes=max(0, agg.n_samples - 1),
            n_unique_prices=agg.n_unique_prices,
            price_mean=agg.price_mean,
            price_min=agg.price_min,
            price_max=agg.price_max,
        )
        for agg in daily_aggregates
    ]

    logger.debug(
        "Retrieved daily stats",
        extra={
            "station_id": station_id,
            "fuel_type": fuel_type,
            "stats_count": len(daily_stats),
        },
    )

    return StationDailyStatsResponse(
        station_id=station_id,
        fuel_type=fuel_type,
        daily_stats=daily_stats,
    )

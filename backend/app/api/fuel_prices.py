from fastapi import APIRouter, Depends, HTTPException, Request
from fueldata.stations import FuelStationClient
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
    FavoriteStationCreate,
    FavoriteStationResponse,
    FuelPricesSummaryResponse,
    GasStationResponse,
    GasStationSearchRequest,
)

router = APIRouter()


def get_tankerkoenig_client(request: Request):
    """Dependency to get the tankerkoenig client from app state"""
    return request.app.state.tankerkoenig_client


def get_fuel_station_client(request: Request):
    """Dependency to get the fuel station client from app state"""
    return request.app.state.fuel_station_client


@router.post("/search", response_model=list[GasStationResponse])
async def search_gas_stations(
    search_params: GasStationSearchRequest,
    user: CurrentUser,
    tankerkoenig_client: TankerkoenigClient = Depends(get_tankerkoenig_client),
):
    """Search for gas stations near a location"""
    try:
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

        # Convert to response models
        result = []
        for station in stations:
            # Filter for open stations only if requested
            if search_params.open_only and not station.isOpen:
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
                id=station.id,
                name=station.name,
                brand=station.brand,
                street=station.street.title(),
                house_number=station.houseNumber,
                post_code=station.postCode,
                place=station.place.title(),
                lat=station.lat,
                lng=station.lng,
                dist=station.dist,
                diesel=diesel,
                e5=e5,
                e10=e10,
                is_open=station.isOpen,
            )
            result.append(response)

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to search stations: {str(e)}"
        )


@router.post("/favorites", response_model=dict)
async def add_favorite_station(
    favorite_data: FavoriteStationCreate,
    user: CurrentUser,
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
    tankerkoenig_client: TankerkoenigClient = Depends(get_tankerkoenig_client),
):
    """Add a gas station to favorites and store its information"""

    try:
        from fueldata.stations import GasStationInfo

        # Get station details from Tankerkoenig API
        station_detail = tankerkoenig_client.get_gas_station_detail(
            favorite_data.station_id
        )

        # Store station info in database
        station_info = GasStationInfo(
            station_id=station_detail.id,
            name=station_detail.name,
            brand=station_detail.brand,
            street=station_detail.street.title(),
            place=station_detail.place.title(),
            lat=station_detail.lat,
            lng=station_detail.lng,
            house_number=station_detail.houseNumber,
            post_code=station_detail.postCode,
        )
        fuel_station_client.store_gas_station_info([station_info])

        # Add to favorites
        fuel_station_client.store_favorite_station(user.id, favorite_data.station_id)

        return {
            "status": "success",
            "message": "Station added to favorites",
            "station_id": favorite_data.station_id,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to add favorite station: {str(e)}"
        )


@router.get("/favorites", response_model=list[FavoriteStationResponse])
async def get_favorite_stations(
    user: CurrentUser,
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
    tankerkoenig_client: TankerkoenigClient = Depends(get_tankerkoenig_client),
):
    """Get user's favorite stations with current prices"""

    try:
        # Get favorites from database
        favorites = fuel_station_client.get_favorite_stations_with_info(user.id)
        station_info_map = {favorite.station_id: favorite for favorite in favorites}
        station_ids = list(station_info_map.keys())

        # Get current prices for up to 10 stations at a time
        results = []
        for i in range(0, len(station_ids), 10):
            batch_ids = station_ids[i : i + 10]

            prices = tankerkoenig_client.get_gas_station_prices(batch_ids)

            for price in prices:
                info = station_info_map.get(price.station_id)

                if not info:
                    continue

                results.append(
                    FavoriteStationResponse(
                        user_id=user.id,
                        station_id=info.station_id,
                        name=info.name,
                        brand=info.brand,
                        street=info.street,
                        house_number=info.house_number,
                        post_code=info.post_code,
                        place=info.place,
                        lat=info.lat,
                        lng=info.lng,
                        current_price_e5=price.e5,
                        current_price_e10=price.e10,
                        current_price_diesel=price.diesel,
                        is_open=price.status == "open",
                    )
                )

        return results

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get favorite stations: {str(e)}"
        )


@router.delete("/favorites/{station_id}")
async def delete_favorite_station(
    station_id: str,
    user: CurrentUser,
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
):
    """Remove a station from favorites"""

    try:
        fuel_station_client.delete_favorite_station(user.id, station_id)
        return {
            "status": "success",
            "message": "Station removed from favorites",
            "station_id": station_id,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to remove favorite station: {str(e)}",
        )


@router.get("/summary", response_model=FuelPricesSummaryResponse)
async def get_fuel_prices_summary(
    user: CurrentUser,
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
    tankerkoenig_client: TankerkoenigClient = Depends(get_tankerkoenig_client),
):
    """Get summary statistics for user's favorite stations"""

    try:
        # Get favorites
        favorites = fuel_station_client.get_favorite_stations(user.id)
        total_favorites = len(favorites)

        if total_favorites == 0:
            return FuelPricesSummaryResponse(
                total_favorites=0,
                stations_open=0,
            )

        # Get current prices
        station_ids = [fav.station_id for fav in favorites]
        all_prices: list[GasStationPrice] = []

        for i in range(0, len(station_ids), 10):
            batch_ids = station_ids[i : i + 10]

            try:
                prices = tankerkoenig_client.get_gas_station_prices(batch_ids)
                all_prices.extend(prices)

            except Exception as e:
                print(f"Error fetching prices for batch: {e}")

        # Calculate statistics
        stations_open = sum(1 for p in all_prices if p.status == "open")

        e5_prices = [
            p.e5 for p in all_prices if p.e5 is not None and p.status == "open"
        ]
        e10_prices = [
            p.e10 for p in all_prices if p.e10 is not None and p.status == "open"
        ]
        diesel_prices = [
            p.diesel for p in all_prices if p.diesel is not None and p.status == "open"
        ]

        return FuelPricesSummaryResponse(
            total_favorites=total_favorites,
            stations_open=stations_open,
            lowest_e5_price=min(e5_prices) if e5_prices else None,
            lowest_e10_price=min(e10_prices) if e10_prices else None,
            lowest_diesel_price=min(diesel_prices) if diesel_prices else None,
            average_e5_price=sum(e5_prices) / len(e5_prices) if e5_prices else None,
            average_e10_price=sum(e10_prices) / len(e10_prices) if e10_prices else None,
            average_diesel_price=sum(diesel_prices) / len(diesel_prices)
            if diesel_prices
            else None,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")

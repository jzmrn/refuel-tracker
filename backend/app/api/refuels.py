from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fueldata.stations import FuelStationClient

from ..auth import CurrentUser
from ..models import (
    RefuelCostStatistics,
    RefuelMetricCreate,
    RefuelMetricResponse,
    RefuelMonthlySummaryResponse,
    RefuelPriceTrend,
    RefuelStatisticsResponse,
)
from ..storage.refuel_client import RefuelDataClient

router = APIRouter()


def get_refuel_client(request: Request) -> RefuelDataClient:
    """Dependency to get the refuel client from app state"""
    return request.app.state.refuel_client


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
    try:
        # Convert Pydantic model to RefuelMetric
        from ..storage.refuel_client import RefuelMetric

        metric = RefuelMetric(
            timestamp=metric_data.timestamp,
            user_id=user.id,
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
            raise HTTPException(
                status_code=500, detail="Failed to create refuel metric"
            )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/refuel", response_model=list[RefuelMetricResponse])
async def get_refuel_metrics(
    user: CurrentUser,
    client: RefuelDataClient = Depends(get_refuel_client),
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int | None = 100,
):
    """Get refuel metrics with optional filters"""

    try:
        # Parse dates if provided
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None

        metrics = client.get_metrics(
            user.id,
            start_date=start_dt,
            end_date=end_dt,
            limit=limit,
        )

        # Convert to response models
        result = []
        for metric in metrics:
            result.append(
                RefuelMetricResponse(
                    timestamp=metric.timestamp,
                    user_id=user.id,
                    price=metric.price,
                    amount=metric.amount,
                    kilometers_since_last_refuel=metric.kilometers_since_last_refuel,
                    estimated_fuel_consumption=metric.estimated_fuel_consumption,
                    notes=metric.notes,
                )
            )
        return result

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/refuel/statistics", response_model=RefuelStatisticsResponse)
async def get_refuel_statistics(
    user: CurrentUser,
    client: RefuelDataClient = Depends(get_refuel_client),
    start_date: str | None = None,
    end_date: str | None = None,
):
    """Get specialized refuel statistics (cost analysis, price trends)"""
    try:
        # Parse dates if provided
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None

        # Get cost statistics
        cost_stats = client.get_total_cost_by_period(user.id, start_dt, end_dt)

        # Get price trends
        price_trends_raw = client.get_price_trends(user.id, start_dt, end_dt)

        # Convert to Pydantic models
        cost_statistics = RefuelCostStatistics(**cost_stats)

        price_trends = []
        for trend in price_trends_raw:
            price_trends.append(RefuelPriceTrend(**trend))

        return RefuelStatisticsResponse(
            cost_statistics=cost_statistics, price_trends=price_trends
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
    try:
        if month < 1 or month > 12:
            raise HTTPException(
                status_code=400, detail="Month must be between 1 and 12"
            )

        summary_data = client.get_monthly_summary(user.id, year, month)
        return RefuelMonthlySummaryResponse(**summary_data)

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/refuel/favorite-stations", response_model=list[dict])
async def get_favorite_stations_for_dropdown(
    user: CurrentUser,
    refuel_client: RefuelDataClient = Depends(get_refuel_client),
    fuel_station_client: FuelStationClient = Depends(get_fuel_station_client),
):
    """Get user's favorite stations for refuel dropdown (without fuel prices)"""
    try:
        stations = refuel_client.get_favorite_stations_for_dropdown(
            user.id, fuel_station_client
        )
        return stations

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch favorite stations: {str(e)}"
        )

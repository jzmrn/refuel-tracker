from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..auth import CurrentUserId
from ..models import (
    RefuelCostStatistics,
    RefuelMetricCreate,
    RefuelMetricResponse,
    RefuelMonthlySummaryResponse,
    RefuelPriceTrend,
    RefuelStatisticsResponse,
)
from ..storage.refuel_store import RefuelStore

router = APIRouter()

# Global state variables for dependency injection
refuel_store: RefuelStore | None = None


def set_refuel_store(store: RefuelStore):
    """Set the refuel store instance"""
    global refuel_store
    refuel_store = store


def _ensure_refuel_store():
    """Ensure refuel store is available"""
    if refuel_store is None:
        raise HTTPException(status_code=500, detail="Refuel store not initialized")
    return refuel_store


# Refuel-specific endpoints
@router.post("/refuel", response_model=dict)
async def create_refuel_metric(metric_data: RefuelMetricCreate, user_id: CurrentUserId):
    """Create a new refuel entry"""
    try:
        store = _ensure_refuel_store()

        # Convert Pydantic model to RefuelMetric
        from ..storage.refuel_store import RefuelMetric

        metric = RefuelMetric(
            timestamp=metric_data.timestamp,
            price=metric_data.price,
            amount=metric_data.amount,
            kilometers_since_last_refuel=metric_data.kilometers_since_last_refuel,
            estimated_fuel_consumption=metric_data.estimated_fuel_consumption,
            notes=metric_data.notes,
        )

        success = await store.add_metric(metric, user_id)

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
    user_id: CurrentUserId,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int | None = 100,
):
    """Get refuel metrics with optional filters"""
    try:
        store = _ensure_refuel_store()

        # Parse dates if provided
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None

        metrics = await store.get_metrics(
            user_id,
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
                    user_id=user_id,
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
    user_id: CurrentUserId,
    start_date: str | None = None,
    end_date: str | None = None,
):
    """Get specialized refuel statistics (cost analysis, price trends)"""
    try:
        store = _ensure_refuel_store()

        # Parse dates if provided
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None

        # Get cost statistics
        cost_stats = await store.get_total_cost_by_period(user_id, start_dt, end_dt)

        # Get price trends
        price_trends_raw = await store.get_price_trends(user_id, start_dt, end_dt)

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
async def get_refuel_monthly_summary(user_id: CurrentUserId, year: int, month: int):
    """Get detailed refuel statistics for a specific month"""
    try:
        store = _ensure_refuel_store()

        if month < 1 or month > 12:
            raise HTTPException(
                status_code=400, detail="Month must be between 1 and 12"
            )

        summary_data = await store.get_monthly_summary(user_id, year, month)

        return RefuelMonthlySummaryResponse(**summary_data)

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

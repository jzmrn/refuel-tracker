from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..models import (
    RefuelCostStatistics,
    RefuelMetricCreate,
    RefuelMetricResponse,
    RefuelMonthlySummaryResponse,
    RefuelPriceTrend,
    RefuelStatisticsResponse,
)
from ..storage.metric_registry import MetricRegistry
from ..storage.parquet_store import ParquetDataStore

router = APIRouter()

# Global state variables for dependency injection
data_store: ParquetDataStore = None
metric_registry: MetricRegistry = None


def set_data_store(store: ParquetDataStore):
    """Set the data store instance"""
    global data_store
    data_store = store


def set_metric_registry(registry: MetricRegistry):
    """Set the metric registry instance"""
    global metric_registry
    metric_registry = registry


# Refuel-specific endpoints
@router.post("/refuel", response_model=dict)
async def create_refuel_metric(metric_data: RefuelMetricCreate):
    """Create a new refuel entry"""
    try:
        if not metric_registry:
            raise HTTPException(status_code=503, detail="Metric registry not available")

        # Convert Pydantic model to dict for internal processing
        data_dict = metric_data.model_dump()
        success = await metric_registry.add_metric("refuel", data_dict)

        if success:
            return {
                "message": "Refuel metric created successfully",
                "metric_type": "refuel",
                "data": data_dict,
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
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int | None = 100,
):
    """Get refuel metrics with optional filters"""
    try:
        if not metric_registry:
            raise HTTPException(status_code=503, detail="Metric registry not available")

        # Parse dates if provided
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None

        metrics = await metric_registry.get_metrics(
            "refuel",
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
    start_date: str | None = None,
    end_date: str | None = None,
):
    """Get specialized refuel statistics (cost analysis, price trends)"""
    try:
        if not metric_registry:
            raise HTTPException(status_code=503, detail="Metric registry not available")

        refuel_store = metric_registry.get_store("refuel")

        # Ensure we have the right type - cast to RefuelStore
        from ..storage.refuel_store import RefuelStore

        if not isinstance(refuel_store, RefuelStore):
            raise HTTPException(status_code=500, detail="Invalid store type for refuel")

        # Parse dates if provided
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None

        # Get cost statistics
        cost_stats = await refuel_store.get_total_cost_by_period(start_dt, end_dt)

        # Get price trends
        price_trends_raw = await refuel_store.get_price_trends(start_dt, end_dt)

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
async def get_refuel_monthly_summary(year: int, month: int):
    """Get detailed refuel statistics for a specific month"""
    try:
        if not metric_registry:
            raise HTTPException(status_code=503, detail="Metric registry not available")

        if month < 1 or month > 12:
            raise HTTPException(
                status_code=400, detail="Month must be between 1 and 12"
            )

        refuel_store = metric_registry.get_store("refuel")

        # Ensure we have the right type - cast to RefuelStore
        from ..storage.refuel_store import RefuelStore

        if not isinstance(refuel_store, RefuelStore):
            raise HTTPException(status_code=500, detail="Invalid store type for refuel")

        summary_data = await refuel_store.get_monthly_summary(year, month)

        return RefuelMonthlySummaryResponse(**summary_data)

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

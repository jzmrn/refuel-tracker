import json
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..models import (
    Metric,
    MetricCreate,
    MetricSummaryResponse,
    RefuelCostStatistics,
    RefuelMetricCreate,
    RefuelMetricResponse,
    RefuelMonthlySummaryResponse,
    RefuelPriceTrend,
    RefuelStatisticsResponse,
)
from ..storage.metric_definitions_store import MetricDefinitionsStore
from ..storage.metric_registry import MetricRegistry
from ..storage.parquet_store import ParquetDataStore

router = APIRouter()
data_store: ParquetDataStore = None
definitions_store: MetricDefinitionsStore = None
metric_registry: MetricRegistry = None


def set_data_store(store: ParquetDataStore):
    """Set the data store instance"""
    global data_store
    data_store = store


def set_definitions_store(store: MetricDefinitionsStore):
    """Set the metric definitions store instance"""
    global definitions_store
    definitions_store = store


def set_metric_registry(registry: MetricRegistry):
    """Set the metric registry instance"""
    global metric_registry
    metric_registry = registry


@router.post("/", response_model=dict)
async def create_metric(metric_data: MetricCreate):
    """Create a new metric value entry"""
    try:
        # Validate that the metric definition exists
        definition = await definitions_store.get_definition(metric_data.metric_id)
        if not definition:
            raise HTTPException(
                status_code=404,
                detail=f"Metric definition not found for ID: {metric_data.metric_id}",
            )

        # Create metric with current timestamp
        metric = Metric(
            timestamp=datetime.now(),
            metric_id=metric_data.metric_id,
            metric_name=definition.title,
            category=definition.category_id,
            data=metric_data.data,
            notes=metric_data.notes,
        )

        success = await data_store.add_metric(metric)
        if success:
            return {
                "message": "Metric value created successfully",
                "metric": metric.model_dump(),
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create metric value")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=list[Metric])
async def get_metrics(
    start_date: str | None = None,
    end_date: str | None = None,
    category: str | None = None,
    metric_id: str | None = None,
    limit: int | None = 100,
):
    """Get metrics with optional filters"""
    try:
        # Parse dates if provided
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None

        metrics = await data_store.get_metrics(
            start_date=start_dt,
            end_date=end_dt,
            category=category,
            metric_id=metric_id,
            limit=limit,
        )

        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", response_model=MetricSummaryResponse)
async def get_metrics_summary():
    """Get summary statistics for metrics"""
    try:
        summary = await data_store.get_metrics_summary()
        return MetricSummaryResponse(**summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-definition/{definition_id}", response_model=list[Metric])
async def get_metrics_by_definition(definition_id: str, limit: int | None = 100):
    """Get all metric values for a specific definition"""
    try:
        # Validate that the metric definition exists
        definition = await definitions_store.get_definition(definition_id)
        if not definition:
            raise HTTPException(status_code=404, detail="Metric definition not found")

        metrics = await data_store.get_metrics(metric_id=definition_id, limit=limit)
        return metrics
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/")
async def delete_metric(
    timestamp: str,
    metric_id: str,
    data: str,  # JSON string of the data
):
    """Delete a specific metric by timestamp, metric id, and data"""
    try:
        # Parse the timestamp and data
        timestamp_dt = datetime.fromisoformat(timestamp)
        data_dict = json.loads(data)

        success = await data_store.delete_metric(timestamp_dt, metric_id, data_dict)

        if success:
            return {"message": "Metric deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Metric not found")
    except ValueError as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid timestamp or data format: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

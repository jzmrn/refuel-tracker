from fastapi import APIRouter, HTTPException
from datetime import datetime
from ..models import Metric, MetricCreate, MetricSummaryResponse
from ..storage.parquet_store import ParquetDataStore
from ..storage.metric_definitions_store import MetricDefinitionsStore

router = APIRouter()
data_store: ParquetDataStore = None
definitions_store: MetricDefinitionsStore = None


def set_data_store(store: ParquetDataStore):
    """Set the data store instance"""
    global data_store
    data_store = store


def set_definitions_store(store: MetricDefinitionsStore):
    """Set the metric definitions store instance"""
    global definitions_store
    definitions_store = store


@router.post("/", response_model=dict)
async def create_metric(metric_data: MetricCreate):
    """Create a new metric value entry"""
    try:
        # Validate that the metric definition exists
        definition = await definitions_store.get_definition(metric_data.metric_id)
        if not definition:
            raise HTTPException(status_code=404, detail="Metric definition not found")

        # Create metric with current timestamp
        metric = Metric(
            timestamp=datetime.now(),
            metric_name=definition.title,
            category=definition.category,
            data=metric_data.data,
            notes=metric_data.notes,
        )

        success = await data_store.add_metric(metric)
        if success:
            return {"message": "Metric value created successfully", "metric": metric}
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

from fastapi import APIRouter, HTTPException

from ..models import MetricDefinition, MetricDefinitionCreate, MetricDefinitionUpdate
from ..storage.metric_definitions_store import MetricDefinitionsStore
from ..storage.parquet_store import ParquetDataStore

router = APIRouter()
definitions_store: MetricDefinitionsStore = None
data_store: ParquetDataStore = None


def set_definitions_store(store: MetricDefinitionsStore):
    """Set the metric definitions store instance"""
    global definitions_store
    definitions_store = store


def set_data_store(store: ParquetDataStore):
    """Set the data store instance"""
    global data_store
    data_store = store


@router.post("/", response_model=MetricDefinition)
async def create_metric_definition(definition_data: MetricDefinitionCreate):
    """Create a new metric definition"""
    try:
        definition = await definitions_store.create_definition(definition_data)
        return definition
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=list[MetricDefinition])
async def get_metric_definitions(category: str | None = None):
    """Get all metric definitions, optionally filtered by category"""
    try:
        if category:
            definitions = await definitions_store.get_definitions_by_category(category)
        else:
            definitions = await definitions_store.get_all_definitions()
        return definitions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{definition_id}", response_model=MetricDefinition)
async def get_metric_definition(definition_id: str):
    """Get a specific metric definition by ID"""
    try:
        definition = await definitions_store.get_definition(definition_id)
        if not definition:
            raise HTTPException(status_code=404, detail="Metric definition not found")
        return definition
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{definition_id}", response_model=MetricDefinition)
async def update_metric_definition(
    definition_id: str, update_data: MetricDefinitionUpdate
):
    """Update a metric definition"""
    try:
        definition = await definitions_store.update_definition(
            definition_id, update_data
        )
        if not definition:
            raise HTTPException(status_code=404, detail="Metric definition not found")
        return definition
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{definition_id}")
async def delete_metric_definition(definition_id: str):
    """Delete a metric definition"""
    try:
        # First check if the definition exists
        existing_definition = await definitions_store.get_definition(definition_id)
        if not existing_definition:
            raise HTTPException(status_code=404, detail="Metric definition not found")

        # Check if there are any metric values using this definition
        # Get all metrics and check both metric_id and metric_name for backward compatibility
        all_metrics = await data_store.get_metrics()

        matching_metrics = []
        for metric in all_metrics:
            # Check by metric_id (new format) or metric_name (backward compatibility)
            if (
                hasattr(metric, "metric_id") and metric.metric_id == definition_id
            ) or metric.metric_name == existing_definition.title:
                matching_metrics.append(metric)

        if matching_metrics:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete metric definition '{existing_definition.title}' because it has {len(matching_metrics)} metric value(s) assigned to it. Please delete these metric values first.",
            )

        success = await definitions_store.delete_definition(definition_id)
        if not success:
            raise HTTPException(
                status_code=500, detail="Failed to delete metric definition"
            )
        return {"message": "Metric definition deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories/list", response_model=list[str])
async def get_metric_definition_categories():
    """Get all unique categories from metric definitions"""
    try:
        categories = await definitions_store.get_categories()
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from ..auth import CurrentUser
from ..models import DataPointCreate, DataPointResponse, DataSummaryResponse
from ..storage.metric_store import DataPointStore

router = APIRouter()

# Global data store instance
data_point_store: DataPointStore | None = None


def set_data_point_store(store: DataPointStore):
    """Inject the data point store dependency"""
    global data_point_store
    data_point_store = store


def _ensure_data_point_store():
    """Ensure data point store is available"""
    if data_point_store is None:
        raise HTTPException(status_code=500, detail="Data point store not initialized")
    return data_point_store


@router.post("/data-points", response_model=DataPointResponse)
async def create_data_point(data_point: DataPointCreate, user: CurrentUser):
    """Create a new data point"""
    store = _ensure_data_point_store()

    try:
        point_id = await store.add_data_point(
            data_point.timestamp,
            data_point.value,
            data_point.label,
            data_point.notes,
            user.id,
        )

        return DataPointResponse(
            id=point_id,
            user_id=user.id,
            timestamp=data_point.timestamp,
            value=data_point.value,
            label=data_point.label,
            notes=data_point.notes,
        )

    except Exception as e:
        print(f"Error creating data point: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create data point: {str(e)}"
        )


@router.get("/data-points", response_model=list[DataPointResponse])
async def get_data_points(
    user: CurrentUser,
    start_date: str | None = Query(None, description="Start date filter (ISO format)"),
    end_date: str | None = Query(None, description="End date filter (ISO format)"),
    label: str | None = Query(None, description="Filter by label"),
    limit: int | None = Query(None, description="Limit number of results"),
):
    """Get data points with optional filtering"""
    store = _ensure_data_point_store()

    try:
        # Parse dates
        start_dt = (
            datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            if start_date
            else None
        )
        end_dt = (
            datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            if end_date
            else None
        )

        rows = await store.get_data_points(
            user.id, start_date=start_dt, end_date=end_dt, label=label, limit=limit
        )

        # Convert to response models
        results = []
        for row in rows:
            results.append(
                DataPointResponse(
                    id=str(row["id"]),
                    user_id=str(row["user_id"]),
                    timestamp=row["timestamp"],
                    value=float(row["value"]),
                    label=str(row["label"]),
                    notes=str(row["notes"])
                    if row["notes"] and row["notes"] != ""
                    else None,
                )
            )

        return results

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve data points: {str(e)}"
        )


@router.delete("/data-points/{point_id}")
async def delete_data_point(point_id: str, user: CurrentUser):
    """Delete a data point by ID"""
    store = _ensure_data_point_store()

    try:
        success = await store.delete_data_point(user.id, point_id)

        if not success:
            raise HTTPException(status_code=404, detail="Data point not found")

        return {"status": "success", "message": "Data point deleted"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete data point: {str(e)}"
        )


@router.get("/data-points/labels", response_model=list[str])
async def get_existing_labels(user: CurrentUser):
    """Get all unique labels from existing data points"""
    store = _ensure_data_point_store()

    try:
        labels = await store.get_existing_labels(user.id)
        return labels

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve labels: {str(e)}"
        )


@router.get("/data-points/summary", response_model=DataSummaryResponse)
async def get_data_summary(user: CurrentUser):
    """Get summary statistics for data points"""
    store = _ensure_data_point_store()

    try:
        summary = await store.get_summary(user.id)

        return DataSummaryResponse(**summary)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate summary: {str(e)}"
        )

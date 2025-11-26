from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from ..auth import CurrentUser
from ..models import DataPointCreate, DataPointResponse, DataSummaryResponse
from ..storage.data_point_client import DataPointClient

router = APIRouter()


def get_data_point_client(request: Request) -> DataPointClient:
    """Dependency to get the data point client from app state"""
    return request.app.state.data_point_client


@router.post("/data-points", response_model=DataPointResponse)
async def create_data_point(
    data_point: DataPointCreate,
    user: CurrentUser,
    client: DataPointClient = Depends(get_data_point_client),
):
    """Create a new data point"""
    try:
        point_id = client.add_data_point(
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
    client: DataPointClient = Depends(get_data_point_client),
    start_date: str | None = Query(None, description="Start date filter (ISO format)"),
    end_date: str | None = Query(None, description="End date filter (ISO format)"),
    label: str | None = Query(None, description="Filter by label"),
    limit: int | None = Query(None, description="Limit number of results"),
):
    """Get data points with optional filtering"""

    try:
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

        return client.get_data_points(
            user.id,
            start_date=start_dt,
            end_date=end_dt,
            label=label,
            limit=limit,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve data points: {str(e)}"
        )


@router.delete("/data-points/{point_id}")
async def delete_data_point(
    point_id: str,
    user: CurrentUser,
    client: DataPointClient = Depends(get_data_point_client),
):
    """Delete a data point by ID"""

    try:
        success = client.delete_data_point(user.id, point_id)

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
async def get_existing_labels(
    user: CurrentUser,
    client: DataPointClient = Depends(get_data_point_client),
):
    """Get all unique labels from existing data points"""
    try:
        labels = client.get_existing_labels(user.id)
        return labels

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve labels: {str(e)}"
        )


@router.get("/data-points/summary", response_model=DataSummaryResponse)
async def get_data_summary(
    user: CurrentUser,
    client: DataPointClient = Depends(get_data_point_client),
):
    """Get summary statistics for data points"""
    try:
        summary = client.get_summary(user.id)

        return DataSummaryResponse(**summary)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate summary: {str(e)}"
        )

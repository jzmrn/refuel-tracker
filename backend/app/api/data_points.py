import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from ..auth import CurrentUser
from ..models import DataPointCreate, DataPointResponse, DataSummaryResponse
from ..storage.data_point_client import DataPointClient

router = APIRouter()
logger = logging.getLogger(__name__)


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
    logger.info(
        "Creating data point",
        extra={"user_id": user.id, "label": data_point.label},
    )

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
    logger.info(
        "Getting data points",
        extra={"user_id": user.id, "label": label, "limit": limit},
    )

    start_dt = (
        datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        if start_date
        else None
    )
    end_dt = (
        datetime.fromisoformat(end_date.replace("Z", "+00:00")) if end_date else None
    )

    results = client.get_data_points(
        user.id,
        start_date=start_dt,
        end_date=end_dt,
        label=label,
        limit=limit,
    )

    return results


@router.delete("/data-points/{point_id}")
async def delete_data_point(
    point_id: str,
    user: CurrentUser,
    client: DataPointClient = Depends(get_data_point_client),
):
    """Delete a data point by ID"""
    logger.info("Deleting data point", extra={"point_id": point_id, "user_id": user.id})

    success = client.delete_data_point(user.id, point_id)

    if not success:
        raise HTTPException(status_code=404, detail="Data point not found")

    return {"status": "success", "message": "Data point deleted"}


@router.get("/data-points/labels", response_model=list[str])
async def get_existing_labels(
    user: CurrentUser,
    client: DataPointClient = Depends(get_data_point_client),
):
    """Get all unique labels from existing data points"""
    logger.info("Getting existing labels", extra={"user_id": user.id})

    labels = client.get_existing_labels(user.id)
    return labels


@router.get("/data-points/summary", response_model=DataSummaryResponse)
async def get_data_summary(
    user: CurrentUser,
    client: DataPointClient = Depends(get_data_point_client),
):
    """Get summary statistics for data points"""
    logger.info("Getting data summary", extra={"user_id": user.id})

    summary = client.get_summary(user.id)
    return DataSummaryResponse(**summary)

"""
API endpoints for kilometer tracking.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from ..auth import CurrentUser
from ..models import (
    KilometerEntryCreate,
    KilometerEntryResponse,
)
from ..storage.car_client import CarClient
from ..storage.kilometer_client import KilometerClient

router = APIRouter()
logger = logging.getLogger(__name__)


def get_kilometer_client(request: Request) -> KilometerClient:
    """Dependency to get the kilometer client from app state"""
    return request.app.state.kilometer_client


def get_car_client(request: Request) -> CarClient:
    """Dependency to get the car client from app state"""
    return request.app.state.car_client


@router.post("/kilometers", response_model=KilometerEntryResponse, status_code=201)
async def create_kilometer_entry(
    entry_data: KilometerEntryCreate,
    user: CurrentUser,
    client: KilometerClient = Depends(get_kilometer_client),
    car_client: CarClient = Depends(get_car_client),
):
    """Create a new kilometer entry"""
    logger.info(
        "Creating kilometer entry",
        extra={
            "user_id": user.id,
            "car_id": entry_data.car_id,
            "total_kilometers": entry_data.total_kilometers,
        },
    )

    # Verify user has access to the car
    if not car_client.user_has_car_access(entry_data.car_id, user.id):
        raise HTTPException(status_code=403, detail="You don't have access to this car")

    entry = client.add_entry(
        car_id=entry_data.car_id,
        total_kilometers=entry_data.total_kilometers,
        user_id=user.id,
        timestamp=entry_data.timestamp,
    )

    return KilometerEntryResponse(
        id=entry.id,
        car_id=entry.car_id,
        total_kilometers=entry.total_kilometers,
        timestamp=entry.timestamp,
        created_at=entry.created_at,
        created_by=entry.created_by,
    )


@router.get("/kilometers", response_model=list[KilometerEntryResponse])
async def get_kilometer_entries(
    user: CurrentUser,
    client: KilometerClient = Depends(get_kilometer_client),
    car_client: CarClient = Depends(get_car_client),
    car_id: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int | None = 100,
):
    """Get kilometer entries with optional filters.

    The user must have access to the car (either owner or shared access).
    """
    logger.info(
        "Getting kilometer entries",
        extra={"user_id": user.id, "car_id": car_id, "limit": limit},
    )

    if car_id is None:
        raise HTTPException(status_code=400, detail="car_id is required")

    # Verify user has access to the car
    if not car_client.user_has_car_access(car_id, user.id):
        raise HTTPException(status_code=403, detail="You don't have access to this car")

    # Parse dates if provided
    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) if end_date else None

    entries = client.get_entries(
        car_id=car_id,
        start_date=start_dt,
        end_date=end_dt,
        limit=limit,
    )

    return [
        KilometerEntryResponse(
            id=entry.id,
            car_id=entry.car_id,
            total_kilometers=entry.total_kilometers,
            timestamp=entry.timestamp,
            created_at=entry.created_at,
            created_by=entry.created_by,
        )
        for entry in entries
    ]


@router.delete("/kilometers/{entry_id}", status_code=204)
async def delete_kilometer_entry(
    entry_id: str,
    car_id: str,
    user: CurrentUser,
    client: KilometerClient = Depends(get_kilometer_client),
    car_client: CarClient = Depends(get_car_client),
):
    """Delete a kilometer entry"""
    logger.info(
        "Deleting kilometer entry",
        extra={
            "user_id": user.id,
            "entry_id": entry_id,
            "car_id": car_id,
        },
    )

    # Verify user has access to the car
    if not car_client.user_has_car_access(car_id, user.id):
        raise HTTPException(status_code=403, detail="You don't have access to this car")

    success = client.delete_entry(entry_id, car_id)
    if not success:
        raise HTTPException(status_code=404, detail="Kilometer entry not found")

    return None

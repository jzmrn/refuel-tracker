"""
API endpoints for kilometer tracking.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from ..auth import CurrentUser
from ..models import (
    KilometerEntriesPaginatedResponse,
    KilometerEntriesResponse,
    KilometerEntryCreate,
    KilometerEntryResponse,
    KilometerEntryUpdate,
    KilometerFilterOptionsResponse,
    KilometerPeriodAggregate,
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


@router.get("/kilometers", response_model=KilometerEntriesResponse)
async def get_kilometer_entries(
    user: CurrentUser,
    client: KilometerClient = Depends(get_kilometer_client),
    car_client: CarClient = Depends(get_car_client),
    car_id: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int | None = 100,
    aggregation: str | None = None,
):
    """Get kilometer entries with optional filters.

    The user must have access to the car (either owner or shared access).
    Optionally pass aggregation=monthly or aggregation=yearly to get
    interpolated period aggregates alongside the entries.
    """
    logger.info(
        "Getting kilometer entries",
        extra={"user_id": user.id, "car_id": car_id, "limit": limit},
    )

    if car_id is None:
        raise HTTPException(status_code=400, detail="car_id is required")

    if aggregation is not None and aggregation not in ("monthly", "yearly"):
        raise HTTPException(
            status_code=400,
            detail="aggregation must be 'monthly' or 'yearly'",
        )

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

    entry_responses = [
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

    aggregates = None
    if aggregation is not None:
        raw_aggregates = client.get_period_aggregates(
            car_id=car_id,
            aggregation=aggregation,
            start_date=start_dt,
            end_date=end_dt,
        )
        aggregates = [KilometerPeriodAggregate(**a) for a in raw_aggregates]

    return KilometerEntriesResponse(
        entries=entry_responses,
        aggregates=aggregates,
    )


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


@router.put("/kilometers", response_model=KilometerEntryResponse)
async def update_kilometer_entry(
    entry_data: KilometerEntryUpdate,
    user: CurrentUser,
    client: KilometerClient = Depends(get_kilometer_client),
    car_client: CarClient = Depends(get_car_client),
):
    """Update a kilometer entry identified by car_id and timestamp"""
    logger.info(
        "Updating kilometer entry",
        extra={
            "user_id": user.id,
            "car_id": entry_data.car_id,
            "timestamp": entry_data.timestamp.isoformat(),
        },
    )

    # Verify user has access to the car
    if not car_client.user_has_car_access(entry_data.car_id, user.id):
        raise HTTPException(status_code=403, detail="You don't have access to this car")

    updated_entry = client.update_entry(
        car_id=entry_data.car_id,
        timestamp=entry_data.timestamp,
        total_kilometers=entry_data.total_kilometers,
    )

    if updated_entry is None:
        raise HTTPException(status_code=404, detail="Kilometer entry not found")

    return KilometerEntryResponse(
        id=updated_entry.id,
        car_id=updated_entry.car_id,
        total_kilometers=updated_entry.total_kilometers,
        timestamp=updated_entry.timestamp,
        created_at=updated_entry.created_at,
        created_by=updated_entry.created_by,
    )


@router.get("/kilometers/paginated", response_model=KilometerEntriesPaginatedResponse)
async def get_kilometer_entries_paginated(
    car_id: str,
    user: CurrentUser,
    client: KilometerClient = Depends(get_kilometer_client),
    car_client: CarClient = Depends(get_car_client),
    offset: int = 0,
    limit: int = 20,
    year: int | None = None,
):
    """Get paginated kilometer entries with optional year filter"""
    logger.info(
        "Getting paginated kilometer entries",
        extra={
            "user_id": user.id,
            "car_id": car_id,
            "offset": offset,
            "limit": limit,
            "year": year,
        },
    )

    # Verify user has access to the car
    if not car_client.user_has_car_access(car_id, user.id):
        raise HTTPException(status_code=403, detail="You don't have access to this car")

    entries, total = client.get_entries_paginated(
        car_id=car_id,
        offset=offset,
        limit=limit,
        year=year,
    )

    return KilometerEntriesPaginatedResponse(
        items=[
            KilometerEntryResponse(
                id=entry.id,
                car_id=entry.car_id,
                total_kilometers=entry.total_kilometers,
                timestamp=entry.timestamp,
                created_at=entry.created_at,
                created_by=entry.created_by,
            )
            for entry in entries
        ],
        total=total,
        offset=offset,
        limit=limit,
        has_more=(offset + len(entries)) < total,
    )


@router.get("/kilometers/filter-options", response_model=KilometerFilterOptionsResponse)
async def get_kilometer_filter_options(
    car_id: str,
    user: CurrentUser,
    client: KilometerClient = Depends(get_kilometer_client),
    car_client: CarClient = Depends(get_car_client),
):
    """Get available filter options for kilometer entries"""
    logger.info(
        "Getting kilometer filter options",
        extra={"user_id": user.id, "car_id": car_id},
    )

    # Verify user has access to the car
    if not car_client.user_has_car_access(car_id, user.id):
        raise HTTPException(status_code=403, detail="You don't have access to this car")

    options = client.get_filter_options(car_id)
    return KilometerFilterOptionsResponse(**options)

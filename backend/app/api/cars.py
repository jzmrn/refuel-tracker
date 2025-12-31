"""
API endpoints for car management and sharing.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from ..auth import CurrentUser
from ..models import (
    CarAccessUser,
    CarCreate,
    CarResponse,
    CarShareRequest,
    CarStatistics,
    CarUpdate,
    UserSearchResponse,
)
from ..storage.car_client import CarClient

router = APIRouter()
logger = logging.getLogger(__name__)


def get_car_client(request: Request) -> CarClient:
    """Dependency to get the car client from app state"""
    return request.app.state.car_client


@router.post("/cars", response_model=CarResponse, status_code=201)
async def create_car(
    car_data: CarCreate,
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Create a new car"""
    logger.info(
        "Creating car",
        extra={"user_id": user.id, "car_name": car_data.name, "year": car_data.year},
    )

    car_id = client.create_car(
        user_id=user.id,
        name=car_data.name,
        year=car_data.year,
        fuel_tank_size=car_data.fuel_tank_size,
        fuel_type=car_data.fuel_type,
    )

    # Sync shared users if provided
    if car_data.shared_user_ids:
        logger.info(
            "Syncing shared users for car",
            extra={
                "car_id": car_id,
                "shared_user_count": len(car_data.shared_user_ids),
            },
        )
        client.sync_shared_users(car_id, user.id, car_data.shared_user_ids)

    car = client.get_car(car_id, user.id)
    if not car:
        raise HTTPException(status_code=500, detail="Failed to create car")

    return car


@router.get("/cars", response_model=list[CarResponse])
async def get_cars(
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Get all cars that the user owns or has access to"""
    logger.info("Getting all cars", extra={"user_id": user.id})

    cars = client.get_cars_for_user(user.id)
    return cars


@router.get("/cars/{car_id}", response_model=CarResponse)
async def get_car(
    car_id: str,
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Get a specific car"""
    logger.info("Getting car", extra={"car_id": car_id, "user_id": user.id})

    car = client.get_car(car_id, user.id)
    if not car:
        raise HTTPException(
            status_code=404, detail="Car not found or you don't have access"
        )

    return car


@router.patch("/cars/{car_id}", response_model=CarResponse)
async def update_car(
    car_id: str,
    car_update: CarUpdate,
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Update a car (owner only)"""
    logger.info("Updating car", extra={"car_id": car_id, "user_id": user.id})

    # Verify ownership
    car = client.get_car(car_id, user.id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    if not car.is_owner:
        raise HTTPException(status_code=403, detail="Only the owner can update the car")

    # Update car
    success = client.update_car(
        car_id=car_id,
        owner_user_id=user.id,
        name=car_update.name,
        year=car_update.year,
        fuel_tank_size=car_update.fuel_tank_size,
        fuel_type=car_update.fuel_type,
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to update car")

    # Sync shared users if provided
    if car_update.shared_user_ids is not None:
        logger.info(
            "Syncing shared users for car",
            extra={
                "car_id": car_id,
                "shared_user_count": len(car_update.shared_user_ids),
            },
        )
        client.sync_shared_users(car_id, user.id, car_update.shared_user_ids)

    updated_car = client.get_car(car_id, user.id)
    return updated_car


@router.delete("/cars/{car_id}", status_code=204)
async def delete_car(
    car_id: str,
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Delete a car (owner only)"""
    logger.info("Deleting car", extra={"car_id": car_id, "user_id": user.id})

    # Verify ownership
    car = client.get_car(car_id, user.id)

    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    if not car.is_owner:
        raise HTTPException(status_code=403, detail="Only the owner can delete the car")

    client.delete_car(car_id, user.id)
    return None


@router.post("/cars/{car_id}/share", status_code=200)
async def share_car(
    car_id: str,
    share_request: CarShareRequest,
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Share a car with another user (owner only)"""
    logger.info(
        "Sharing car with user",
        extra={
            "car_id": car_id,
            "shared_with_user_id": share_request.user_id,
            "owner_user_id": user.id,
        },
    )

    # Verify ownership
    car = client.get_car(car_id, user.id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    if not car.is_owner:
        raise HTTPException(status_code=403, detail="Only the owner can share the car")

    success = client.share_car(car_id, user.id, share_request.user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to share car")

    return {"message": "Car shared successfully"}


@router.delete("/cars/{car_id}/share/{user_id}", status_code=204)
async def revoke_car_access(
    car_id: str,
    user_id: str,
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Revoke car access from a user (owner only)"""
    logger.info(
        "Revoking car access",
        extra={
            "car_id": car_id,
            "revoke_from_user_id": user_id,
            "owner_user_id": user.id,
        },
    )

    # Verify ownership
    car = client.get_car(car_id, user.id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    if not car.is_owner:
        raise HTTPException(status_code=403, detail="Only the owner can revoke access")

    client.revoke_car_access(car_id, user.id, user_id)
    return None


@router.get("/cars/{car_id}/shared-users", response_model=list[CarAccessUser])
async def get_car_shared_users(
    car_id: str,
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Get list of users who have access to this car (owner only)"""
    logger.info(
        "Getting shared users for car", extra={"car_id": car_id, "user_id": user.id}
    )

    # Verify ownership
    car = client.get_car(car_id, user.id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    if not car.is_owner:
        raise HTTPException(
            status_code=403, detail="Only the owner can view shared users"
        )

    users = client.get_car_shared_users(car_id, user.id)
    return users


@router.get("/users/search", response_model=list[UserSearchResponse])
async def search_users(
    q: str,
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Search for users by name or email (for sharing)"""
    logger.info("Searching users", extra={"search_query": q, "user_id": user.id})

    if len(q) < 2:
        raise HTTPException(
            status_code=400, detail="Search query must be at least 2 characters"
        )

    users = client.search_users(q, user.id)
    return users


@router.get("/cars/{car_id}/statistics", response_model=CarStatistics)
async def get_car_statistics(
    car_id: str,
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Get statistics for a specific car"""
    logger.info("Getting car statistics", extra={"car_id": car_id, "user_id": user.id})

    stats = client.get_car_statistics(car_id, user.id)
    if not stats:
        raise HTTPException(
            status_code=404, detail="Car not found or you don't have access"
        )

    return stats

"""
API endpoints for car management and sharing.
"""

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
    try:
        car_id = client.create_car(
            user_id=user.id,
            name=car_data.name,
            year=car_data.year,
            fuel_tank_size=car_data.fuel_tank_size,
            notes=car_data.notes,
        )

        # Sync shared users if provided
        if car_data.shared_user_ids:
            client.sync_shared_users(car_id, user.id, car_data.shared_user_ids)

        car = client.get_car(car_id, user.id)
        if not car:
            raise HTTPException(status_code=500, detail="Failed to create car")

        return car

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cars", response_model=list[CarResponse])
async def get_cars(
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Get all cars that the user owns or has access to"""
    try:
        cars = client.get_cars_for_user(user.id)
        return cars

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cars/{car_id}", response_model=CarResponse)
async def get_car(
    car_id: str,
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Get a specific car"""
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
        notes=car_update.notes,
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to update car")

    # Sync shared users if provided
    if car_update.shared_user_ids is not None:
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

    # Verify ownership
    print("Fetching car", car_id)
    car = client.get_car(car_id, user.id)
    print("Fetched car", car)

    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    if not car.is_owner:
        raise HTTPException(status_code=403, detail="Only the owner can delete the car")

    print("Deleting car", car_id)
    client.delete_car(car_id, user.id)
    print("Car deleted", car_id)

    return None


@router.post("/cars/{car_id}/share", status_code=200)
async def share_car(
    car_id: str,
    share_request: CarShareRequest,
    user: CurrentUser,
    client: CarClient = Depends(get_car_client),
):
    """Share a car with another user (owner only)"""
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
    stats = client.get_car_statistics(car_id, user.id)
    if not stats:
        raise HTTPException(
            status_code=404, detail="Car not found or you don't have access"
        )

    return stats

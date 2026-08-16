"""
API endpoints for resolving place (city) names to geographic coordinates.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from ..auth import CurrentUser
from ..models import PlaceResponse, PlaceSearchResponse
from ..storage.place_client import Place, PlaceClient

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_RESULTS = 25


def get_place_client(request: Request) -> PlaceClient:
    """Dependency to get the place client from app state"""
    return request.app.state.place_client


def _to_response(place: Place) -> PlaceResponse:
    return PlaceResponse(
        id=place.ars,
        name=place.name,
        label=place.label,
        postal_code=place.postal_code,
        district=place.district,
        state=place.state,
        lat=place.lat,
        lng=place.lng,
    )


@router.get("/search", response_model=PlaceSearchResponse)
async def search_places(
    user: CurrentUser,
    q: str = Query(..., min_length=1, max_length=100, description="Search term"),
    limit: int = Query(10, ge=1, le=MAX_RESULTS, description="Maximum results"),
    client: PlaceClient = Depends(get_place_client),
):
    """Autocomplete places by name or postal code."""
    places = client.search(q, limit=limit)
    logger.debug("Place search returned %d results", len(places), extra={"query": q})
    return PlaceSearchResponse(places=[_to_response(place) for place in places])


@router.get("/{place_id}", response_model=PlaceResponse)
async def get_place(
    place_id: str,
    user: CurrentUser,
    client: PlaceClient = Depends(get_place_client),
):
    """Get a single place by its official regional key (ARS)."""
    place = client.get(place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return _to_response(place)

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from ..auth import CurrentUser
from ..models import (
    TimeSpanCreate,
    TimeSpanResponse,
    TimeSpanSummaryResponse,
    TimeSpanUpdate,
)
from ..storage.time_span_client import TimeSpanClient

router = APIRouter()


def get_time_span_client(request: Request) -> TimeSpanClient:
    """Dependency to get the time span client from app state"""
    return request.app.state.time_span_client


@router.post("/time-spans", response_model=TimeSpanResponse)
async def create_time_span(
    time_span: TimeSpanCreate,
    user: CurrentUser,
    client: TimeSpanClient = Depends(get_time_span_client),
):
    """Create a new time span"""
    try:
        result = client.add_time_span(
            start_date=time_span.start_date,
            end_date=time_span.end_date,
            label=time_span.label,
            group=getattr(time_span, "group", "General"),
            notes=time_span.notes,
            user_id=user.id,
        )
        return TimeSpanResponse(**result)

    except Exception as e:
        print(f"Error creating time span: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create time span: {str(e)}"
        )


@router.get("/time-spans", response_model=list[TimeSpanResponse])
async def get_time_spans(
    user: CurrentUser,
    client: TimeSpanClient = Depends(get_time_span_client),
    start_date: str | None = Query(None, description="Start date filter (ISO format)"),
    end_date: str | None = Query(None, description="End date filter (ISO format)"),
    label: str | None = Query(None, description="Filter by label"),
    group: str | None = Query(None, description="Filter by group"),
    limit: int | None = Query(None, description="Limit number of results"),
):
    """Get time spans with optional filtering"""
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

        results = client.get_time_spans(
            user.id,
            start_date=start_dt,
            end_date=end_dt,
            label=label,
            group=group,
            limit=limit,
        )

        return [TimeSpanResponse(**r) for r in results]

    except Exception as e:
        print(f"Error retrieving time spans: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve time spans: {str(e)}"
        )


@router.put("/time-spans/{span_id}", response_model=TimeSpanResponse)
async def update_time_span(
    span_id: str,
    time_span_update: TimeSpanUpdate,
    user: CurrentUser,
    client: TimeSpanClient = Depends(get_time_span_client),
):
    """Update an existing time span"""
    try:
        # Convert TimeSpanUpdate to dict for the client method
        updates = {}
        if time_span_update.start_date is not None:
            updates["start_date"] = time_span_update.start_date
        if time_span_update.end_date is not None:
            updates["end_date"] = time_span_update.end_date
        if time_span_update.label is not None:
            updates["label"] = time_span_update.label
        if time_span_update.group is not None:
            updates["group"] = time_span_update.group
        if time_span_update.notes is not None:
            updates["notes"] = time_span_update.notes

        success = client.update_time_span(span_id, user.id, updates)
        if not success:
            raise HTTPException(status_code=404, detail="Time span not found")

        # Get the updated time span
        time_spans = client.get_time_spans(user.id)
        updated_span = next((ts for ts in time_spans if ts["id"] == span_id), None)
        if not updated_span:
            raise HTTPException(
                status_code=404, detail="Time span not found after update"
            )

        return TimeSpanResponse(**updated_span)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update time span: {str(e)}"
        )


@router.delete("/time-spans/{span_id}")
async def delete_time_span(
    span_id: str,
    user: CurrentUser,
    client: TimeSpanClient = Depends(get_time_span_client),
):
    """Delete a time span by ID"""
    try:
        success = client.delete_time_span(user.id, span_id)
        if not success:
            raise HTTPException(status_code=404, detail="Time span not found")

        return {"status": "success", "message": "Time span deleted"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete time span: {str(e)}"
        )


@router.get("/time-spans/labels", response_model=list[str])
async def get_existing_labels(
    user: CurrentUser,
    client: TimeSpanClient = Depends(get_time_span_client),
):
    """Get all unique labels from existing time spans"""
    try:
        labels = client.get_existing_labels(user.id)
        return labels

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve labels: {str(e)}"
        )


@router.get("/time-spans/groups", response_model=list[str])
async def get_existing_groups(
    user: CurrentUser,
    client: TimeSpanClient = Depends(get_time_span_client),
):
    """Get all unique groups from existing time spans"""
    try:
        groups = client.get_existing_groups(user.id)
        return groups

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve groups: {str(e)}"
        )


@router.get("/time-spans/summary", response_model=TimeSpanSummaryResponse)
async def get_time_span_summary(
    user: CurrentUser,
    client: TimeSpanClient = Depends(get_time_span_client),
):
    """Get summary statistics for time spans"""
    try:
        summary = client.get_summary_stats(user.id)

        return TimeSpanSummaryResponse(
            total_entries=summary["total_entries"],
            unique_labels=summary["unique_labels"],
            completed_entries=summary["completed_entries"],
            ongoing_entries=summary["ongoing_entries"],
            date_range=summary["date_range"],
            duration_stats=summary["duration_stats"],
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate summary: {str(e)}"
        )

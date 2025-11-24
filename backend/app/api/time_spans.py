from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from ..auth import CurrentUser
from ..models import (
    TimeSpanCreate,
    TimeSpanResponse,
    TimeSpanSummaryResponse,
    TimeSpanUpdate,
)
from ..storage.time_span_store import TimeSpanStore

router = APIRouter()

# Global time span store instance
time_span_store: TimeSpanStore | None = None


def set_time_span_store(store: TimeSpanStore):
    """Inject the time span store dependency"""
    global time_span_store
    time_span_store = store


def _ensure_time_span_store():
    """Ensure time span store is available"""
    if time_span_store is None:
        raise HTTPException(status_code=500, detail="Time span store not initialized")
    return time_span_store


def _calculate_duration(start_date: datetime, end_date: datetime | None) -> dict:
    """Calculate duration in days, hours, and minutes"""
    # Ensure start_date is timezone-naive
    if start_date.tzinfo is not None:
        start_date = start_date.replace(tzinfo=None)

    if end_date is None:
        # For ongoing spans, calculate duration up to now
        end_date = datetime.now()
    else:
        # Ensure end_date is timezone-naive
        if end_date.tzinfo is not None:
            end_date = end_date.replace(tzinfo=None)

    duration = end_date - start_date
    total_minutes = int(duration.total_seconds() / 60)

    days = total_minutes // (24 * 60)
    hours = (total_minutes % (24 * 60)) // 60
    minutes = total_minutes % 60

    return {
        "duration_days": days,
        "duration_hours": hours,
        "duration_minutes": minutes,
    }


@router.post("/time-spans", response_model=TimeSpanResponse)
async def create_time_span(time_span: TimeSpanCreate, user: CurrentUser):
    """Create a new time span"""
    store = _ensure_time_span_store()

    try:
        response = await store.add_time_span(time_span, user.id)
        return response

    except Exception as e:
        print(f"Error creating time span: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create time span: {str(e)}"
        )


@router.get("/time-spans", response_model=list[TimeSpanResponse])
async def get_time_spans(
    user_id: CurrentUser,
    start_date: str | None = Query(None, description="Start date filter (ISO format)"),
    end_date: str | None = Query(None, description="End date filter (ISO format)"),
    label: str | None = Query(None, description="Filter by label"),
    group: str | None = Query(None, description="Filter by group"),
    limit: int | None = Query(None, description="Limit number of results"),
):
    """Get time spans with optional filtering"""
    store = _ensure_time_span_store()

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

        results = await store.get_time_spans(
            user_id,
            start_date=start_dt,
            end_date=end_dt,
            label=label,
            group=group,
            limit=limit,
        )

        return results

    except Exception as e:
        print(f"Error retrieving time spans: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve time spans: {str(e)}"
        )


@router.put("/time-spans/{span_id}", response_model=TimeSpanResponse)
async def update_time_span(
    span_id: str, time_span_update: TimeSpanUpdate, user_id: CurrentUser
):
    """Update an existing time span"""
    store = _ensure_time_span_store()

    try:
        # Convert TimeSpanUpdate to dict for the store method
        updates = {}
        if time_span_update.start_date is not None:
            updates["start_date"] = time_span_update.start_date.isoformat()
        if time_span_update.end_date is not None:
            updates["end_date"] = time_span_update.end_date.isoformat()
        if time_span_update.label is not None:
            updates["label"] = time_span_update.label
        if time_span_update.group is not None:
            updates["group"] = time_span_update.group
        if time_span_update.notes is not None:
            updates["notes"] = time_span_update.notes

        success = await store.update_time_span(span_id, user_id, updates)
        if not success:
            raise HTTPException(status_code=404, detail="Time span not found")

        # Get the updated time span
        time_spans = await store.get_time_spans(user_id)
        updated_span = next((ts for ts in time_spans if ts.id == span_id), None)
        if not updated_span:
            raise HTTPException(
                status_code=404, detail="Time span not found after update"
            )

        return updated_span

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update time span: {str(e)}"
        )


@router.delete("/time-spans/{span_id}")
async def delete_time_span(span_id: str, user: CurrentUser):
    """Delete a time span by ID"""
    store = _ensure_time_span_store()

    try:
        success = await store.delete_time_span(user.id, span_id)
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
async def get_existing_labels(user: CurrentUser):
    """Get all unique labels from existing time spans"""
    store = _ensure_time_span_store()

    try:
        # Get all time spans and extract unique labels
        time_spans = await store.get_time_spans(user.id)
        labels = list(set(ts.label for ts in time_spans))
        return sorted(labels)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve labels: {str(e)}"
        )


@router.get("/time-spans/groups", response_model=list[str])
async def get_existing_groups(user: CurrentUser):
    """Get all unique groups from existing time spans"""
    store = _ensure_time_span_store()

    try:
        groups = await store.get_existing_groups(user.id)
        return groups

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve groups: {str(e)}"
        )


@router.get("/time-spans/summary", response_model=TimeSpanSummaryResponse)
async def get_time_span_summary(user: CurrentUser):
    """Get summary statistics for time spans"""
    store = _ensure_time_span_store()

    try:
        summary = await store.get_summary_stats(user.id)

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

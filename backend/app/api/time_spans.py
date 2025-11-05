from datetime import datetime
from pathlib import Path

import polars as pl
from fastapi import APIRouter, HTTPException, Query

from ..models import (
    TimeSpanCreate,
    TimeSpanResponse,
    TimeSpanSummaryResponse,
    TimeSpanUpdate,
)
from ..storage.parquet_store import ParquetDataStore

router = APIRouter()

# Global data store instance
data_store: ParquetDataStore | None = None


def set_data_store(store: ParquetDataStore):
    """Inject the data store dependency"""
    global data_store
    data_store = store


def _ensure_data_store():
    """Ensure data store is available"""
    if data_store is None:
        raise HTTPException(status_code=500, detail="Data store not initialized")
    return data_store


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
async def create_time_span(time_span: TimeSpanCreate):
    """Create a new time span"""
    store = _ensure_data_store()

    try:
        # Generate ID based on timestamp and label hash
        span_id = f"{time_span.start_date.isoformat()}_{abs(hash(time_span.label))}"

        # Calculate duration if end_date is provided
        duration_info = {}
        if time_span.end_date:
            duration_info = _calculate_duration(
                time_span.start_date, time_span.end_date
            )

        # Create dataframe row with consistent nullable field handling
        current_time = datetime.now().isoformat()
        new_row = pl.DataFrame(
            {
                "id": [span_id],
                "start_date": [time_span.start_date.isoformat()],
                "end_date": [
                    time_span.end_date.isoformat() if time_span.end_date else None
                ],
                "label": [time_span.label],
                "group": [time_span.group],
                "notes": [
                    time_span.notes if time_span.notes else None
                ],  # Use None instead of empty string
                "created_at": [current_time],
                "updated_at": [current_time],
            },
            schema={
                "id": pl.String,
                "start_date": pl.String,
                "end_date": pl.String,  # Allow nulls
                "label": pl.String,
                "group": pl.String,  # Required field
                "notes": pl.String,  # Allow nulls
                "created_at": pl.String,
                "updated_at": pl.String,
            },
        )

        # Store in parquet file
        time_spans_path = Path(store.base_path) / "time_spans"
        time_spans_path.mkdir(exist_ok=True)

        parquet_file = time_spans_path / "time_spans.parquet"

        # Read existing data if file exists
        if parquet_file.exists():
            print("Reading existing parquet file...")
            existing_df = pl.read_parquet(parquet_file)
            print(f"Existing schema: {existing_df.schema}")
            print(f"Existing columns: {existing_df.columns}")

            # Ensure schema compatibility - cast columns if needed
            current_time_iso = datetime.now().isoformat()

            if "created_at" not in existing_df.columns:
                print("Adding missing created_at column to existing data...")
                existing_df = existing_df.with_columns(
                    [pl.lit(current_time_iso).alias("created_at")]
                )

            if "updated_at" not in existing_df.columns:
                print("Adding missing updated_at column to existing data...")
                existing_df = existing_df.with_columns(
                    [pl.lit(current_time_iso).alias("updated_at")]
                )

            if "group" not in existing_df.columns:
                print("Adding missing group column to existing data...")
                existing_df = existing_df.with_columns(
                    [pl.lit("General", dtype=pl.String).alias("group")]
                )
            else:
                # Update any null groups to "General"
                existing_df = existing_df.with_columns(
                    [pl.col("group").fill_null("General")]
                )

            # Ensure nullable columns are properly typed
            print("Casting nullable columns...")
            existing_df = existing_df.with_columns(
                [
                    pl.col("end_date").cast(pl.String, strict=False),
                    pl.col("notes").cast(pl.String, strict=False),
                    pl.col("group").cast(pl.String, strict=False),
                ]
            )

            print(f"New row schema: {new_row.schema}")
            print(f"Existing df schema after cast: {existing_df.schema}")

            # Append new row
            combined_df = pl.concat([existing_df, new_row], how="vertical")
        else:
            print("Creating new parquet file...")
            combined_df = new_row

        # Write back to parquet
        combined_df.write_parquet(parquet_file)

        # Parse the current time for response
        current_dt = datetime.now()

        return TimeSpanResponse(
            id=span_id,
            start_date=time_span.start_date,
            end_date=time_span.end_date,
            label=time_span.label,
            group=time_span.group,
            notes=time_span.notes,
            created_at=current_dt,
            updated_at=current_dt,
            **duration_info,
        )

    except Exception as e:
        print(f"Error creating time span: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create time span: {str(e)}"
        )


@router.get("/time-spans", response_model=list[TimeSpanResponse])
async def get_time_spans(
    start_date: str | None = Query(None, description="Start date filter (ISO format)"),
    end_date: str | None = Query(None, description="End date filter (ISO format)"),
    label: str | None = Query(None, description="Filter by label"),
    group: str | None = Query(None, description="Filter by group"),
    limit: int | None = Query(None, description="Limit number of results"),
):
    """Get time spans with optional filtering"""
    store = _ensure_data_store()

    try:
        time_spans_path = Path(store.base_path) / "time_spans" / "time_spans.parquet"

        if not time_spans_path.exists():
            print(f"Time spans parquet file does not exist: {time_spans_path}")
            return []

        # Read data
        print(f"Reading time spans from: {time_spans_path}")
        df = pl.read_parquet(time_spans_path)
        print(f"Loaded dataframe with {df.height} rows and columns: {df.columns}")

        # Apply filters
        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            df = df.filter(pl.col("start_date") >= start_dt)

        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            # Filter by start_date for spans that started before the end_date
            df = df.filter(pl.col("start_date") <= end_dt)

        if label:
            df = df.filter(
                pl.col("label").str.to_lowercase().str.contains(label.lower())
            )

        if group:
            # Ensure group column exists (for backward compatibility)
            if "group" in df.columns:
                df = df.filter(
                    pl.col("group").str.to_lowercase().str.contains(group.lower())
                )
            else:
                # If group column doesn't exist and user filters by group, return empty results
                df = df.limit(0)

        # Sort by start_date descending
        df = df.sort("start_date", descending=True)

        # Apply limit
        if limit:
            df = df.head(limit)

        # Convert to response models
        results = []
        print(f"Converting {df.height} rows to response models...")

        for i, row in enumerate(df.iter_rows(named=True)):
            try:
                print(f"Processing row {i+1}: {row}")

                # Parse dates - ensure timezone-naive
                start_date_parsed = datetime.fromisoformat(row["start_date"]).replace(
                    tzinfo=None
                )
                end_date_parsed = None

                # Handle end_date - check for None, empty string, or Polars null
                end_date_value = row["end_date"]
                print(
                    f"  end_date_value: {end_date_value} (type: {type(end_date_value)})"
                )

                if (
                    end_date_value is not None
                    and str(end_date_value) != ""
                    and str(end_date_value).lower() != "null"
                ):
                    try:
                        end_date_parsed = datetime.fromisoformat(
                            str(end_date_value)
                        ).replace(tzinfo=None)
                        print(f"  Parsed end_date: {end_date_parsed}")
                    except (ValueError, TypeError) as e:
                        print(
                            f"  Warning: Could not parse end_date '{end_date_value}': {e}"
                        )

                # Calculate duration
                duration_info = _calculate_duration(start_date_parsed, end_date_parsed)
                print(f"  Duration info: {duration_info}")
            except Exception as e:
                print(f"Error processing row {i+1}: {e}")
                raise

            # Parse timestamps for created_at and updated_at
            created_at_parsed = datetime.fromisoformat(str(row["created_at"])).replace(
                tzinfo=None
            )
            updated_at_parsed = datetime.fromisoformat(str(row["updated_at"])).replace(
                tzinfo=None
            )

            # Prepare response data
            response_data = {
                "id": str(row["id"]),
                "start_date": start_date_parsed,
                "end_date": end_date_parsed,
                "label": str(row["label"]),
                "group": str(row["group"])
                if row["group"]
                and str(row["group"]) != ""
                and str(row["group"]).lower() != "null"
                else "General",
                "notes": str(row["notes"])
                if row["notes"]
                and row["notes"] != ""
                and str(row["notes"]).lower() != "null"
                else None,
                "created_at": created_at_parsed,
                "updated_at": updated_at_parsed,
                **duration_info,
            }
            print(f"  Creating TimeSpanResponse with: {response_data}")

            try:
                time_span_response = TimeSpanResponse(**response_data)
                print(f"  Successfully created: {time_span_response}")
                results.append(time_span_response)
            except Exception as model_error:
                print(f"  Error creating TimeSpanResponse: {model_error}")
                raise

        return results

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve time spans: {str(e)}"
        )


@router.put("/time-spans/{span_id}", response_model=TimeSpanResponse)
async def update_time_span(span_id: str, time_span_update: TimeSpanUpdate):
    """Update an existing time span"""
    store = _ensure_data_store()

    try:
        time_spans_path = Path(store.base_path) / "time_spans" / "time_spans.parquet"

        if not time_spans_path.exists():
            raise HTTPException(status_code=404, detail="Time span not found")

        # Read existing data
        df = pl.read_parquet(time_spans_path)

        # Check if span exists
        existing_span = df.filter(pl.col("id") == span_id)
        if not existing_span.height:
            raise HTTPException(status_code=404, detail="Time span not found")

        # Get the existing span data as a single row dict
        existing_row_data = existing_span.to_dicts()[0]

        # Update only the fields that are provided
        updated_data = {}
        if time_span_update.start_date is not None:
            updated_data["start_date"] = time_span_update.start_date.isoformat()
        else:
            updated_data["start_date"] = existing_row_data["start_date"]

        if time_span_update.end_date is not None:
            updated_data["end_date"] = time_span_update.end_date.isoformat()
        else:
            updated_data["end_date"] = existing_row_data.get("end_date")

        if time_span_update.label is not None:
            updated_data["label"] = time_span_update.label
        else:
            updated_data["label"] = existing_row_data["label"]

        if time_span_update.group is not None:
            updated_data["group"] = time_span_update.group
        else:
            existing_group = existing_row_data.get("group")
            updated_data["group"] = (
                existing_group if existing_group and existing_group != "" else "General"
            )

        if time_span_update.notes is not None:
            updated_data["notes"] = time_span_update.notes
        else:
            updated_data["notes"] = existing_row_data.get("notes")

        # Always update the updated_at timestamp
        updated_data["updated_at"] = datetime.now().isoformat()
        updated_data["created_at"] = existing_row_data["created_at"]
        updated_data["id"] = span_id

        # Remove the old row and add the updated one
        df = df.filter(pl.col("id") != span_id)

        # Create updated row with proper schema
        updated_row = pl.DataFrame(
            [updated_data],
            schema={
                "id": pl.String,
                "start_date": pl.String,
                "end_date": pl.String,  # Allow nulls
                "label": pl.String,
                "group": pl.String,  # Required field
                "notes": pl.String,  # Allow nulls
                "created_at": pl.String,
                "updated_at": pl.String,
            },
        )

        # Combine with existing data
        df = pl.concat([df, updated_row], how="vertical")

        # Write back to parquet
        df.write_parquet(time_spans_path)

        # Calculate duration for response
        start_dt = datetime.fromisoformat(updated_data["start_date"]).replace(
            tzinfo=None
        )
        end_dt = None
        if updated_data["end_date"]:
            end_dt = datetime.fromisoformat(updated_data["end_date"]).replace(
                tzinfo=None
            )

        duration_info = _calculate_duration(start_dt, end_dt)

        return TimeSpanResponse(
            id=span_id,
            start_date=start_dt,
            end_date=end_dt,
            label=updated_data["label"],
            group=updated_data["group"],
            notes=updated_data["notes"],
            created_at=datetime.fromisoformat(updated_data["created_at"]).replace(
                tzinfo=None
            ),
            updated_at=datetime.fromisoformat(updated_data["updated_at"]).replace(
                tzinfo=None
            ),
            **duration_info,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update time span: {str(e)}"
        )


@router.delete("/time-spans/{span_id}")
async def delete_time_span(span_id: str):
    """Delete a time span by ID"""
    store = _ensure_data_store()

    try:
        time_spans_path = Path(store.base_path) / "time_spans" / "time_spans.parquet"

        if not time_spans_path.exists():
            raise HTTPException(status_code=404, detail="Time span not found")

        # Read existing data
        df = pl.read_parquet(time_spans_path)

        # Check if span exists
        if not df.filter(pl.col("id") == span_id).height:
            raise HTTPException(status_code=404, detail="Time span not found")

        # Remove the span
        df = df.filter(pl.col("id") != span_id)

        # Write back to parquet
        if df.height > 0:
            df.write_parquet(time_spans_path)
        else:
            # If no data left, remove the file
            time_spans_path.unlink()

        return {"status": "success", "message": "Time span deleted"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete time span: {str(e)}"
        )


@router.get("/time-spans/labels", response_model=list[str])
async def get_existing_labels():
    """Get all unique labels from existing time spans"""
    store = _ensure_data_store()

    try:
        time_spans_path = Path(store.base_path) / "time_spans" / "time_spans.parquet"

        if not time_spans_path.exists():
            return []

        # Read data
        df = pl.read_parquet(time_spans_path)

        # Get unique labels, sorted
        labels = sorted(df["label"].unique().to_list())

        return labels

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve labels: {str(e)}"
        )


@router.get("/time-spans/groups", response_model=list[str])
async def get_existing_groups():
    """Get all unique groups from existing time spans"""
    store = _ensure_data_store()

    try:
        time_spans_path = Path(store.base_path) / "time_spans" / "time_spans.parquet"

        if not time_spans_path.exists():
            return []

        # Read data
        df = pl.read_parquet(time_spans_path)

        # Ensure group column exists (for backward compatibility)
        if "group" not in df.columns:
            return []

        # Get unique groups, sorted
        groups = df["group"].unique().to_list()

        return sorted(groups)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve groups: {str(e)}"
        )


@router.get("/time-spans/summary", response_model=TimeSpanSummaryResponse)
async def get_time_span_summary():
    """Get summary statistics for time spans"""
    store = _ensure_data_store()

    try:
        time_spans_path = Path(store.base_path) / "time_spans" / "time_spans.parquet"

        if not time_spans_path.exists():
            return TimeSpanSummaryResponse(
                total_entries=0,
                unique_labels=0,
                completed_entries=0,
                ongoing_entries=0,
                date_range={"earliest": None, "latest": None},
                duration_stats={
                    "total_minutes": None,
                    "average_minutes": None,
                    "min_minutes": None,
                    "max_minutes": None,
                },
            )

        # Read data
        df = pl.read_parquet(time_spans_path)

        if df.height == 0:
            return TimeSpanSummaryResponse(
                total_entries=0,
                unique_labels=0,
                completed_entries=0,
                ongoing_entries=0,
                date_range={"earliest": None, "latest": None},
                duration_stats={
                    "total_minutes": None,
                    "average_minutes": None,
                    "min_minutes": None,
                    "max_minutes": None,
                },
            )

        # Calculate basic statistics
        total_entries = df.height
        unique_labels = df["label"].n_unique()

        # Count completed vs ongoing
        completed_entries = df.filter(pl.col("end_date").is_not_null()).height
        ongoing_entries = total_entries - completed_entries

        # Date range
        earliest_date = df["start_date"].min()
        latest_date = df["start_date"].max()

        # Duration statistics (only for completed entries)
        completed_df = df.filter(pl.col("end_date").is_not_null())

        duration_stats = {
            "total_minutes": None,
            "average_minutes": None,
            "min_minutes": None,
            "max_minutes": None,
        }

        if completed_df.height > 0:
            # Calculate duration in minutes for each completed span
            durations = []
            for row in completed_df.iter_rows(named=True):
                start = datetime.fromisoformat(row["start_date"])
                end = datetime.fromisoformat(row["end_date"])
                duration_minutes = (end - start).total_seconds() / 60
                durations.append(duration_minutes)

            if durations:
                duration_stats = {
                    "total_minutes": sum(durations),
                    "average_minutes": sum(durations) / len(durations),
                    "min_minutes": min(durations),
                    "max_minutes": max(durations),
                }

        return TimeSpanSummaryResponse(
            total_entries=total_entries,
            unique_labels=unique_labels,
            completed_entries=completed_entries,
            ongoing_entries=ongoing_entries,
            date_range={"earliest": earliest_date, "latest": latest_date},
            duration_stats=duration_stats,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate summary: {str(e)}"
        )

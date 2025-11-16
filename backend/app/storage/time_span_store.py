import asyncio
from datetime import datetime
from typing import Any

import polars as pl

from ..models import TimeSpanCreate, TimeSpanResponse
from .parquet_store import ParquetDataStore


class TimeSpanStore:
    def __init__(self, parquet_store: ParquetDataStore):
        self.parquet_store = parquet_store
        self.data_type = "time_spans"
        self._write_lock = asyncio.Lock()

    def get_schema(self) -> dict[str, Any]:
        """Return the Polars schema for time spans"""
        return {
            "id": pl.Utf8,
            "timestamp": pl.Utf8,  # For partitioning
            "user_id": pl.Utf8,
            "start_date": pl.Utf8,
            "end_date": pl.Utf8,
            "label": pl.Utf8,
            "group": pl.Utf8,
            "notes": pl.Utf8,
            "created_at": pl.Utf8,
            "updated_at": pl.Utf8,
        }

    def _calculate_duration(
        self, start_date: datetime, end_date: datetime | None
    ) -> dict:
        """Calculate duration in days, hours, and minutes"""
        if end_date is None:
            # For ongoing spans, calculate duration up to now
            end_date = datetime.now()

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

    async def add_time_span(
        self, time_span: TimeSpanCreate, user_id: str
    ) -> TimeSpanResponse:
        """Add a new time span"""
        async with self._write_lock:
            # Generate ID based on timestamp and label hash
            span_id = f"{time_span.start_date.isoformat()}_{abs(hash(time_span.label))}"

            current_time = datetime.now().isoformat()

            # Create row
            row = {
                "id": span_id,
                "timestamp": time_span.start_date.isoformat(),  # For partitioning
                "start_date": time_span.start_date.isoformat(),
                "end_date": time_span.end_date.isoformat()
                if time_span.end_date
                else "",
                "label": time_span.label,
                "group": getattr(time_span, "group", "General"),
                "notes": time_span.notes or "",
                "created_at": current_time,
                "updated_at": current_time,
            }

            success = await self.parquet_store.add_row(
                self.data_type, row, self.get_schema(), user_id
            )

            if not success:
                raise Exception("Failed to add time span")

            # Calculate duration if end_date is provided
            duration_info = {}
            if time_span.end_date:
                duration_info = self._calculate_duration(
                    time_span.start_date, time_span.end_date
                )

            return TimeSpanResponse(
                id=span_id,
                start_date=time_span.start_date,
                end_date=time_span.end_date,
                user_id=user_id,
                label=time_span.label,
                group=getattr(time_span, "group", "General"),
                notes=time_span.notes,
                created_at=datetime.fromisoformat(current_time),
                updated_at=datetime.fromisoformat(current_time),
                **duration_info,
            )

    async def get_time_spans(
        self,
        user_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        label: str | None = None,
        group: str | None = None,
        limit: int | None = None,
    ) -> list[TimeSpanResponse]:
        """Get time spans with optional filtering"""
        # Use start_date as timestamp for partitioning
        # For filtering, we'll get all and filter in memory
        rows = await self.parquet_store.get_rows(
            self.data_type, user_id, start_date, end_date, limit
        )

        # Apply additional filters
        filtered_rows = []
        for row in rows:
            # Parse dates (handle potential timezone info)
            try:
                start_date_parsed = datetime.fromisoformat(row["start_date"])
                # Convert to naive datetime if it has timezone info
                if start_date_parsed.tzinfo is not None:
                    start_date_parsed = start_date_parsed.replace(tzinfo=None)
            except ValueError as e:
                print(f"Error parsing start_date '{row['start_date']}': {e}")
                continue

            end_date_parsed = None
            if row["end_date"] and row["end_date"] != "":
                try:
                    end_date_parsed = datetime.fromisoformat(row["end_date"])
                    # Convert to naive datetime if it has timezone info
                    if end_date_parsed.tzinfo is not None:
                        end_date_parsed = end_date_parsed.replace(tzinfo=None)
                except ValueError as e:
                    print(f"Error parsing end_date '{row['end_date']}': {e}")
                    continue

            # Apply label filter
            if label and label.lower() not in row["label"].lower():
                continue

            # Apply group filter
            if group and row.get("group", "General").lower() not in group.lower():
                continue

            filtered_rows.append((row, start_date_parsed, end_date_parsed))

        # Sort by start_date descending
        filtered_rows.sort(key=lambda x: x[1], reverse=True)

        # Convert to response models
        results = []
        for row, start_date_parsed, end_date_parsed in filtered_rows:
            # Calculate duration
            duration_info = self._calculate_duration(start_date_parsed, end_date_parsed)

            results.append(
                TimeSpanResponse(
                    id=str(row["id"]),
                    start_date=start_date_parsed,
                    end_date=end_date_parsed,
                    user_id=user_id,
                    label=str(row["label"]),
                    group=str(row.get("group", "General")) or "General",
                    notes=str(row["notes"])
                    if row["notes"] and row["notes"] != ""
                    else None,
                    created_at=datetime.fromisoformat(row["created_at"]).replace(
                        tzinfo=None
                    )
                    if row.get("created_at")
                    else datetime.now(),
                    updated_at=datetime.fromisoformat(row["updated_at"]).replace(
                        tzinfo=None
                    )
                    if row.get("updated_at")
                    else datetime.now(),
                    **duration_info,
                )
            )

        return results

    async def delete_time_span(self, user_id: str, span_id: str) -> bool:
        """Delete a time span by ID"""
        # Need to find the timestamp for partitioning
        # Get all rows and find the one with matching id
        rows = await self.parquet_store.get_rows(self.data_type, user_id)
        for row in rows:
            if row["id"] == span_id:
                timestamp = datetime.fromisoformat(row["start_date"])
                return await self.parquet_store.delete_row(
                    self.data_type, user_id, timestamp, id=span_id
                )
        return False

    async def update_time_span(
        self, span_id: str, user_id: str, updates: dict[str, Any]
    ) -> bool:
        """Update a time span"""
        # Find the existing row
        rows = await self.parquet_store.get_rows(self.data_type, user_id)
        existing_row = None
        for row in rows:
            if row["id"] == span_id:
                existing_row = row
                break

        if not existing_row:
            return False

        # Update the row
        updated_row = existing_row.copy()
        updated_row.update(updates)
        # If start_date was updated, also update timestamp for partitioning
        if "start_date" in updates:
            updated_row["timestamp"] = updates["start_date"]
        updated_row["updated_at"] = datetime.now().isoformat()

        # Delete old and add new
        timestamp = datetime.fromisoformat(existing_row["start_date"])
        await self.parquet_store.delete_row(
            self.data_type, user_id, timestamp, id=span_id
        )

        # Add updated row with new timestamp if start_date changed
        await self.parquet_store.add_row(
            self.data_type, updated_row, self.get_schema(), user_id
        )
        return True

    async def get_existing_groups(self, user_id: str) -> list[str]:
        """Get all unique groups from existing time spans"""
        rows = await self.parquet_store.get_rows(self.data_type, user_id)

        groups = set()
        for row in rows:
            group = row.get("group", "General")
            if group:
                groups.add(group)

        return sorted(list(groups))

    async def get_summary_stats(self, user_id: str) -> dict:
        """Get summary statistics for time spans"""
        rows = await self.parquet_store.get_rows(self.data_type, user_id)

        if not rows:
            return {
                "total_entries": 0,
                "unique_labels": 0,
                "completed_entries": 0,
                "ongoing_entries": 0,
                "date_range": {"earliest": None, "latest": None},
                "duration_stats": {
                    "total_minutes": None,
                    "average_minutes": None,
                    "min_minutes": None,
                    "max_minutes": None,
                },
            }

        # Calculate basic statistics
        total_entries = len(rows)
        unique_labels = len(set(row["label"] for row in rows))

        # Count completed vs ongoing
        completed_entries = sum(
            1 for row in rows if row["end_date"] and row["end_date"] != ""
        )
        ongoing_entries = total_entries - completed_entries

        # Date range
        start_dates = [datetime.fromisoformat(row["start_date"]) for row in rows]
        earliest_date = min(start_dates).isoformat() if start_dates else None
        latest_date = max(start_dates).isoformat() if start_dates else None

        # Duration statistics (only for completed entries)
        durations = []
        for row in rows:
            if row["end_date"] and row["end_date"] != "":
                start = datetime.fromisoformat(row["start_date"])
                end = datetime.fromisoformat(row["end_date"])
                duration_minutes = (end - start).total_seconds() / 60
                durations.append(duration_minutes)

        duration_stats = {
            "total_minutes": None,
            "average_minutes": None,
            "min_minutes": None,
            "max_minutes": None,
        }

        if durations:
            duration_stats = {
                "total_minutes": sum(durations),
                "average_minutes": sum(durations) / len(durations),
                "min_minutes": min(durations),
                "max_minutes": max(durations),
            }

        return {
            "total_entries": total_entries,
            "unique_labels": unique_labels,
            "completed_entries": completed_entries,
            "ongoing_entries": ongoing_entries,
            "date_range": {"earliest": earliest_date, "latest": latest_date},
            "duration_stats": duration_stats,
        }

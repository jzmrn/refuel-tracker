import asyncio
from datetime import datetime
from pathlib import Path

import polars as pl

from ..models import TimeSpanCreate, TimeSpanResponse


class TimeSpanStore:
    def __init__(self, base_path: str = "data"):
        self.base_path = Path(base_path)
        self.time_spans_path = self.base_path / "time_spans"
        self.time_spans_path.mkdir(exist_ok=True)
        self._write_lock = asyncio.Lock()

    def _get_parquet_file(self) -> Path:
        """Get the path to the time spans parquet file"""
        return self.time_spans_path / "time_spans.parquet"

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

    async def add_time_span(self, time_span: TimeSpanCreate) -> TimeSpanResponse:
        """Add a new time span"""
        async with self._write_lock:
            # Generate ID based on timestamp and label hash
            span_id = f"{time_span.start_date.isoformat()}_{abs(hash(time_span.label))}"

            # Calculate duration if end_date is provided
            duration_info = {}
            if time_span.end_date:
                duration_info = self._calculate_duration(
                    time_span.start_date, time_span.end_date
                )

            # Create dataframe row
            new_row = pl.DataFrame(
                {
                    "id": [span_id],
                    "start_date": [time_span.start_date.isoformat()],
                    "end_date": [
                        time_span.end_date.isoformat() if time_span.end_date else None
                    ],
                    "label": [time_span.label],
                    "notes": [time_span.notes or ""],
                }
            )

            parquet_file = self._get_parquet_file()

            # Read existing data if file exists
            if parquet_file.exists():
                existing_df = pl.read_parquet(parquet_file)
                # Append new row
                combined_df = pl.concat([existing_df, new_row])
            else:
                combined_df = new_row

            # Write back to parquet
            combined_df.write_parquet(parquet_file)

            return TimeSpanResponse(
                id=span_id,
                start_date=time_span.start_date,
                end_date=time_span.end_date,
                label=time_span.label,
                notes=time_span.notes,
                **duration_info,
            )

    async def get_time_spans(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        label: str | None = None,
        limit: int | None = None,
    ) -> list[TimeSpanResponse]:
        """Get time spans with optional filtering"""
        parquet_file = self._get_parquet_file()

        if not parquet_file.exists():
            return []

        # Read data
        df = pl.read_parquet(parquet_file)

        # Apply filters
        if start_date:
            df = df.filter(pl.col("start_date") >= start_date.isoformat())

        if end_date:
            # Filter by start_date for spans that started before the end_date
            df = df.filter(pl.col("start_date") <= end_date.isoformat())

        if label:
            df = df.filter(
                pl.col("label").str.to_lowercase().str.contains(label.lower())
            )

        # Sort by start_date descending
        df = df.sort("start_date", descending=True)

        # Apply limit
        if limit:
            df = df.head(limit)

        # Convert to response models
        results = []
        for row in df.iter_rows(named=True):
            # Parse dates
            start_date_parsed = datetime.fromisoformat(row["start_date"])
            end_date_parsed = None
            if row["end_date"] and row["end_date"] != "":
                end_date_parsed = datetime.fromisoformat(row["end_date"])

            # Calculate duration
            duration_info = self._calculate_duration(start_date_parsed, end_date_parsed)

            results.append(
                TimeSpanResponse(
                    id=str(row["id"]),
                    start_date=start_date_parsed,
                    end_date=end_date_parsed,
                    label=str(row["label"]),
                    notes=str(row["notes"])
                    if row["notes"] and row["notes"] != ""
                    else None,
                    **duration_info,
                )
            )

        return results

    async def delete_time_span(self, span_id: str) -> bool:
        """Delete a time span by ID"""
        async with self._write_lock:
            parquet_file = self._get_parquet_file()

            if not parquet_file.exists():
                return False

            # Read existing data
            df = pl.read_parquet(parquet_file)

            # Check if span exists
            if not df.filter(pl.col("id") == span_id).height:
                return False

            # Remove the span
            df = df.filter(pl.col("id") != span_id)

            # Write back to parquet
            if df.height > 0:
                df.write_parquet(parquet_file)
            else:
                # If no data left, remove the file
                parquet_file.unlink()

            return True

    async def get_existing_labels(self) -> list[str]:
        """Get all unique labels from existing time spans"""
        parquet_file = self._get_parquet_file()

        if not parquet_file.exists():
            return []

        # Read data
        df = pl.read_parquet(parquet_file)

        # Get unique labels, sorted
        labels = sorted(df["label"].unique().to_list())

        return labels

    async def get_summary_stats(self) -> dict:
        """Get summary statistics for time spans"""
        parquet_file = self._get_parquet_file()

        if not parquet_file.exists():
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

        # Read data
        df = pl.read_parquet(parquet_file)

        if df.height == 0:
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

        return {
            "total_entries": total_entries,
            "unique_labels": unique_labels,
            "completed_entries": completed_entries,
            "ongoing_entries": ongoing_entries,
            "date_range": {"earliest": earliest_date, "latest": latest_date},
            "duration_stats": duration_stats,
        }

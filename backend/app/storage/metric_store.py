from datetime import datetime
from typing import Any

import polars as pl

from .parquet_store import ParquetDataStore


class DataPointStore:
    """Store for data points using ParquetDataStore"""

    def __init__(self, parquet_store: ParquetDataStore):
        self.parquet_store = parquet_store
        self.data_type = "data_points"

    def get_schema(self) -> dict[str, Any]:
        """Return the Polars schema for data points"""
        return {
            "id": pl.Utf8,
            "user_id": pl.Utf8,
            "timestamp": pl.Utf8,
            "value": pl.Float64,
            "label": pl.Utf8,
            "notes": pl.Utf8,
        }

    async def add_data_point(
        self,
        timestamp: datetime,
        value: float,
        label: str,
        notes: str | None,
        user_id: str,
    ) -> str:
        """Add a data point and return its ID"""
        # Generate ID based on timestamp and label hash
        point_id = f"{timestamp.isoformat()}_{abs(hash(label))}"

        row = {
            "id": point_id,
            "timestamp": timestamp.isoformat(),
            "value": value,
            "label": label,
            "notes": notes or "",
        }

        success = await self.parquet_store.add_row(
            self.data_type, row, self.get_schema(), user_id
        )

        if not success:
            raise Exception("Failed to add data point")

        return point_id

    async def get_data_points(
        self,
        user_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        label: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """Get data points with optional filtering"""
        rows = await self.parquet_store.get_rows(
            self.data_type, user_id, start_date, end_date, limit
        )

        # Apply label filter
        if label:
            rows = [row for row in rows if label.lower() in row["label"].lower()]

        # Convert timestamp strings back to datetime
        for row in rows:
            row["timestamp"] = datetime.fromisoformat(row["timestamp"])

        return rows

    async def delete_data_point(self, user_id: str, point_id: str) -> bool:
        """Delete a data point by ID"""
        # Need to find the timestamp for partitioning
        rows = await self.parquet_store.get_rows(self.data_type, user_id)
        for row in rows:
            if row["id"] == point_id:
                timestamp = datetime.fromisoformat(row["timestamp"])
                return await self.parquet_store.delete_row(
                    self.data_type, user_id, timestamp, id=point_id
                )
        return False

    async def get_existing_labels(self, user_id: str) -> list[str]:
        """Get all unique labels from existing data points"""
        rows = await self.parquet_store.get_rows(self.data_type, user_id)

        labels = set()
        for row in rows:
            labels.add(row["label"])

        return sorted(list(labels))

    async def get_summary(self, user_id: str) -> dict[str, Any]:
        """Get summary statistics for data points"""
        rows = await self.parquet_store.get_rows(self.data_type, user_id)

        if not rows:
            return {
                "total_entries": 0,
                "unique_labels": 0,
                "date_range": {"earliest": None, "latest": None},
                "value_stats": {"min": None, "max": None, "average": None},
            }

        # Calculate statistics
        total_entries = len(rows)
        unique_labels = len(set(row["label"] for row in rows))

        timestamps = [datetime.fromisoformat(row["timestamp"]) for row in rows]
        values = [row["value"] for row in rows]

        earliest_date = min(timestamps).isoformat() if timestamps else None
        latest_date = max(timestamps).isoformat() if timestamps else None

        min_value = min(values) if values else None
        max_value = max(values) if values else None
        avg_value = sum(values) / len(values) if values else None

        return {
            "total_entries": total_entries,
            "unique_labels": unique_labels,
            "date_range": {"earliest": earliest_date, "latest": latest_date},
            "value_stats": {"min": min_value, "max": max_value, "average": avg_value},
        }

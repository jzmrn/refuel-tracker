import asyncio
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import polars as pl
from pydantic import BaseModel


class MetricBase(BaseModel):
    """Base class for all metrics"""

    timestamp: datetime
    notes: str | None = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class MetricStoreBase(ABC):
    """Abstract base class for all metric stores"""

    def __init__(self, base_path: str = "data"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(exist_ok=True)

        # Create metric-specific directory
        self.metric_path = self.base_path / "metrics" / self.get_metric_name()
        self.metric_path.mkdir(parents=True, exist_ok=True)

        # Lock for concurrent writes
        self._write_lock = asyncio.Lock()

    @abstractmethod
    def get_metric_name(self) -> str:
        """Return the name of the metric (used for directory naming)"""
        pass

    @abstractmethod
    def get_schema(self) -> dict[str, Any]:
        """Return the Polars schema for this metric type (must include user_id)"""
        pass

    @abstractmethod
    def metric_to_row(self, metric: MetricBase) -> dict[str, Any]:
        """Convert metric instance to dictionary for DataFrame row"""
        pass

    @abstractmethod
    def row_to_metric(self, row: dict[str, Any]) -> MetricBase:
        """Convert DataFrame row to metric instance"""
        pass

    def _get_partition_path(self, timestamp: datetime) -> Path:
        """Generate partitioned path based on timestamp (monthly partitions)"""
        year = timestamp.year
        month = timestamp.month
        filename = f"{self.get_metric_name()}_{year}-{month:02d}.parquet"
        return self.metric_path / filename

    def _get_relevant_files(
        self,
        start_date: datetime | None,
        end_date: datetime | None,
    ) -> list[Path]:
        """Get list of files that might contain data in the date range"""
        files = []

        # If no date range specified, get all files
        if not start_date and not end_date:
            files.extend(self.metric_path.glob("*.parquet"))
            return files

        # Calculate date range to scan
        # Use reasonable defaults instead of datetime.min/max to avoid year overflow
        scan_start = start_date or datetime(1900, 1, 1)
        scan_end = end_date or datetime(2100, 12, 31)

        # Find relevant files (monthly partitions)
        current_date = scan_start.replace(day=1)
        max_iterations = 1200  # Prevent infinite loops (100 years * 12 months)
        iterations = 0

        while current_date <= scan_end and iterations < max_iterations:
            metric_file = (
                self.metric_path
                / f"{self.get_metric_name()}_{current_date.year}-{current_date.month:02d}.parquet"
            )
            if metric_file.exists():
                files.append(metric_file)

            # Move to next month
            try:
                if current_date.month == 12:
                    current_date = current_date.replace(
                        year=current_date.year + 1, month=1
                    )
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
            except ValueError as e:
                # Break on date overflow errors
                print(f"Date overflow in _get_relevant_files: {e}")
                break

            iterations += 1

        return files

    async def add_metrics(self, metrics: list[MetricBase], user_id: str) -> bool:
        """Add multiple metrics efficiently"""
        async with self._write_lock:
            try:
                # Convert to DataFrame and add user_id
                rows = [self.metric_to_row(metric) for metric in metrics]
                # Add user_id to each row
                for row in rows:
                    row["user_id"] = user_id
                df = pl.DataFrame(rows, schema=self.get_schema())

                # Group by partition (month)
                partitions = {}
                for row in df.iter_rows(named=True):
                    timestamp = row["timestamp"]
                    partition_path = self._get_partition_path(timestamp)

                    if partition_path not in partitions:
                        partitions[partition_path] = []
                    partitions[partition_path].append(row)

                # Write to each partition
                for partition_path, partition_rows in partitions.items():
                    partition_path.parent.mkdir(parents=True, exist_ok=True)

                    new_df = pl.DataFrame(partition_rows, schema=self.get_schema())

                    if partition_path.exists():
                        # Append to existing file
                        existing_df = pl.read_parquet(partition_path)
                        combined_df = pl.concat([existing_df, new_df])
                        # Sort by timestamp for better compression
                        combined_df = combined_df.sort("timestamp")
                        combined_df.write_parquet(partition_path)
                    else:
                        # Create new file
                        new_df = new_df.sort("timestamp")
                        new_df.write_parquet(partition_path)

                return True
            except Exception as e:
                print(f"Error adding {self.get_metric_name()} metrics: {e}")
                return False

    async def add_metric(self, metric: MetricBase, user_id: str) -> bool:
        """Add a single metric"""
        return await self.add_metrics([metric], user_id)

    async def get_metrics(
        self,
        user_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int | None = None,
        **filters,
    ) -> list[MetricBase]:
        """Get metrics with optional filters"""
        try:
            # Get all relevant files in the date range
            files = self._get_relevant_files(start_date, end_date)

            if not files:
                return []

            # Read all relevant files
            dataframes = []
            for file_path in files:
                if file_path.exists():
                    df = pl.read_parquet(file_path)
                    dataframes.append(df)

            if not dataframes:
                return []

            # Combine all dataframes
            df = pl.concat(dataframes)

            # Filter by user_id first
            df = df.filter(pl.col("user_id") == user_id)

            # Apply date filters
            if start_date:
                df = df.filter(pl.col("timestamp") >= start_date)
            if end_date:
                df = df.filter(pl.col("timestamp") <= end_date)

            # Apply custom filters
            for field, value in filters.items():
                if field in df.columns:
                    df = df.filter(pl.col(field) == value)

            # Sort by timestamp (most recent first)
            df = df.sort("timestamp", descending=True)

            # Apply limit
            if limit:
                df = df.head(limit)

            # Convert to metric objects
            metrics = []
            for row in df.iter_rows(named=True):
                metric = self.row_to_metric(row)
                metrics.append(metric)

            return metrics
        except Exception as e:
            print(f"Error reading {self.get_metric_name()} metrics: {e}")
            return []

    async def get_summary(self, user_id: str) -> dict[str, Any]:
        """Get summary statistics for this metric type"""
        try:
            # Get all metrics for total count
            all_metrics = await self.get_metrics(user_id)

            if not all_metrics:
                return {
                    "total_count": 0,
                    "most_recent_date": None,
                    "oldest_date": None,
                }

            # Get recent metrics (last 30 days)
            thirty_days_ago = datetime.now() - timedelta(days=30)
            recent_metrics = await self.get_metrics(user_id, start_date=thirty_days_ago)

            # Calculate statistics
            timestamps = [m.timestamp for m in all_metrics]
            most_recent = max(timestamps) if timestamps else None
            oldest = min(timestamps) if timestamps else None

            return {
                "total_count": len(all_metrics),
                "recent_count": len(recent_metrics),
                "most_recent_date": most_recent,
                "oldest_date": oldest,
            }

        except Exception as e:
            print(f"Error getting {self.get_metric_name()} summary: {e}")
            return {
                "total_count": 0,
                "recent_count": 0,
                "most_recent_date": None,
                "oldest_date": None,
            }

    async def delete_metric(
        self, user_id: str, timestamp: datetime, **match_criteria
    ) -> bool:
        """Delete a specific metric by timestamp and matching criteria"""
        async with self._write_lock:
            try:
                partition_path = self._get_partition_path(timestamp)

                if not partition_path.exists():
                    return False

                # Read existing data
                df = pl.read_parquet(partition_path)
                original_count = len(df)

                # Build filter condition including user_id
                filter_condition = (pl.col("timestamp") == timestamp) & (
                    pl.col("user_id") == user_id
                )
                for field, value in match_criteria.items():
                    if field in df.columns:
                        filter_condition = filter_condition & (pl.col(field) == value)

                # Filter out the matching metric
                filtered_df = df.filter(~filter_condition)

                # Check if anything was actually deleted
                if len(filtered_df) == original_count:
                    return False  # No matching metric found

                # Write back the filtered data
                if len(filtered_df) > 0:
                    filtered_df.write_parquet(partition_path)
                else:
                    # If no data left, remove the file
                    partition_path.unlink()

                return True

            except Exception as e:
                print(f"Error deleting {self.get_metric_name()} metric: {e}")
                return False

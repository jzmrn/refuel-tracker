import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any

import polars as pl


class ParquetDataStore:
    def __init__(self, base_path: str = "data"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(exist_ok=True)

        # Create subdirectories
        (self.base_path / "metrics").mkdir(exist_ok=True)
        (self.base_path / "data_points").mkdir(exist_ok=True)
        (self.base_path / "time_spans").mkdir(exist_ok=True)
        (self.base_path / "metadata").mkdir(exist_ok=True)

        # Lock for concurrent writes
        self._write_lock = asyncio.Lock()

    def _get_partition_path(self, timestamp: datetime, data_type: str) -> Path:
        """Generate partitioned path based on timestamp"""
        year = timestamp.year
        month = timestamp.month

        if data_type == "metrics":
            filename = f"metrics_{year}-{month:02d}.parquet"
            return self.base_path / "metrics" / filename
        elif data_type == "data_points":
            filename = f"data_points_{year}-{month:02d}.parquet"
            return self.base_path / "data_points" / filename
        elif data_type == "time_spans":
            filename = f"time_spans_{year}-{month:02d}.parquet"
            return self.base_path / "time_spans" / filename
        else:
            # For other data types, use a generic directory
            data_dir = self.base_path / data_type
            data_dir.mkdir(exist_ok=True)
            filename = f"{data_type}_{year}-{month:02d}.parquet"
            return data_dir / filename

    def _get_relevant_files(
        self,
        data_type: str,
        start_date: datetime | None,
        end_date: datetime | None,
    ) -> list[Path]:
        """Get list of files that might contain data in the date range"""
        files = []

        data_dir = self.base_path / data_type
        if not data_dir.exists():
            return files

        # If no date range specified, get all files
        if not start_date and not end_date:
            files.extend(data_dir.glob("*.parquet"))
            return files

        # Calculate date range to scan
        scan_start = start_date or datetime(1900, 1, 1)
        scan_end = end_date or datetime(2100, 12, 31)

        # Find relevant files (monthly partitions)
        current_date = scan_start.replace(day=1)
        max_iterations = 1200  # Prevent infinite loops (100 years * 12 months)
        iterations = 0

        while current_date <= scan_end and iterations < max_iterations:
            file_pattern = (
                f"{data_type}_{current_date.year}-{current_date.month:02d}.parquet"
            )
            data_file = data_dir / file_pattern
            if data_file.exists():
                files.append(data_file)

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

    async def add_rows(
        self,
        data_type: str,
        rows: list[dict[str, Any]],
        schema: dict[str, Any],
        user_id: str,
    ) -> bool:
        """Add multiple rows efficiently"""
        async with self._write_lock:
            try:
                # Add user_id to each row
                for row in rows:
                    row["user_id"] = user_id
                df = pl.DataFrame(rows, schema=schema)

                # Group by partition (month)
                partitions = {}
                for row in df.iter_rows(named=True):
                    timestamp = row["timestamp"]
                    if isinstance(timestamp, str):
                        timestamp = datetime.fromisoformat(
                            timestamp.replace("Z", "+00:00")
                        )
                    partition_path = self._get_partition_path(timestamp, data_type)

                    if partition_path not in partitions:
                        partitions[partition_path] = []
                    partitions[partition_path].append(row)

                # Write to each partition
                for partition_path, partition_rows in partitions.items():
                    partition_path.parent.mkdir(parents=True, exist_ok=True)

                    new_df = pl.DataFrame(partition_rows, schema=schema)

                    if partition_path.exists():
                        # Append to existing file
                        existing_df = pl.read_parquet(partition_path)

                        # Handle schema migration for time_spans
                        if (
                            data_type == "time_spans"
                            and "timestamp" not in existing_df.columns
                        ):
                            # Add timestamp column from start_date for backward compatibility
                            existing_df = existing_df.with_columns(
                                pl.col("start_date").alias("timestamp")
                            )
                            # Reorder columns to match the expected schema, but only include columns that exist
                            expected_columns = [
                                "id",
                                "timestamp",
                                "user_id",
                                "start_date",
                                "end_date",
                                "label",
                                "group",
                                "notes",
                                "created_at",
                                "updated_at",
                            ]
                            existing_columns = [
                                col
                                for col in expected_columns
                                if col in existing_df.columns
                            ]
                            existing_df = existing_df.select(existing_columns)

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
                print(f"Error adding {data_type} rows: {e}")
                return False

    async def add_row(
        self,
        data_type: str,
        row: dict[str, Any],
        schema: dict[str, Any],
        user_id: str,
    ) -> bool:
        """Add a single row"""
        return await self.add_rows(data_type, [row], schema, user_id)

    async def get_rows(
        self,
        data_type: str,
        user_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int | None = None,
        **filters,
    ) -> list[dict[str, Any]]:
        """Get rows with optional filters"""
        try:
            # Get all relevant files in the date range
            files = self._get_relevant_files(data_type, start_date, end_date)

            if not files:
                return []

            # Read all relevant files
            dataframes = []
            for file_path in files:
                if file_path.exists():
                    df = pl.read_parquet(file_path)

                    # Handle schema migration for time_spans
                    if data_type == "time_spans" and "timestamp" not in df.columns:
                        # Add timestamp column from start_date for backward compatibility
                        df = df.with_columns(pl.col("start_date").alias("timestamp"))
                        # Reorder columns to match the expected schema, but only include columns that exist
                        expected_columns = [
                            "id",
                            "timestamp",
                            "user_id",
                            "start_date",
                            "end_date",
                            "label",
                            "group",
                            "notes",
                            "created_at",
                            "updated_at",
                        ]
                        existing_columns = [
                            col for col in expected_columns if col in df.columns
                        ]
                        df = df.select(existing_columns)

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

            # Convert to list of dicts
            rows = []
            for row in df.iter_rows(named=True):
                rows.append(row)

            return rows
        except Exception as e:
            print(f"Error reading {data_type} rows: {e}")
            return []

    async def delete_row(
        self,
        data_type: str,
        user_id: str,
        timestamp: datetime,
        **match_criteria,
    ) -> bool:
        """Delete a specific row by timestamp and matching criteria"""
        async with self._write_lock:
            try:
                partition_path = self._get_partition_path(timestamp, data_type)

                if not partition_path.exists():
                    return False

                # Read existing data
                df = pl.read_parquet(partition_path)

                # Handle schema migration for time_spans
                if data_type == "time_spans" and "timestamp" not in df.columns:
                    # Add timestamp column from start_date for backward compatibility
                    df = df.with_columns(pl.col("start_date").alias("timestamp"))
                    # Reorder columns to match the expected schema, but only include columns that exist
                    expected_columns = [
                        "id",
                        "timestamp",
                        "user_id",
                        "start_date",
                        "end_date",
                        "label",
                        "group",
                        "notes",
                        "created_at",
                        "updated_at",
                    ]
                    existing_columns = [
                        col for col in expected_columns if col in df.columns
                    ]
                    df = df.select(existing_columns)
                original_count = len(df)

                # Build filter condition including user_id
                timestamp_str = timestamp.isoformat()
                filter_condition = (pl.col("timestamp") == timestamp_str) & (
                    pl.col("user_id") == user_id
                )
                for field, value in match_criteria.items():
                    if field in df.columns:
                        filter_condition = filter_condition & (pl.col(field) == value)

                # Filter out the matching row
                filtered_df = df.filter(~filter_condition)

                # Check if anything was actually deleted
                if len(filtered_df) == original_count:
                    return False  # No matching row found

                # Write back the filtered data
                if len(filtered_df) > 0:
                    filtered_df.write_parquet(partition_path)
                else:
                    # If no data left, remove the file
                    partition_path.unlink()

                return True

            except Exception as e:
                print(f"Error deleting {data_type} row: {e}")
                return False

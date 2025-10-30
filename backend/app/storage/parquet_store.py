from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import polars as pl
import asyncio
import json
from ..models import Transaction, AccountBalance, Metric, Unit, Category


class ParquetDataStore:
    def __init__(self, base_path: str = "data"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(exist_ok=True)

        # Create subdirectories
        (self.base_path / "transactions").mkdir(exist_ok=True)
        (self.base_path / "account_balances").mkdir(exist_ok=True)
        (self.base_path / "metrics").mkdir(exist_ok=True)
        (self.base_path / "metadata").mkdir(exist_ok=True)

        # Lock for concurrent writes
        self._write_lock = asyncio.Lock()

    def _get_partition_path(self, timestamp: datetime, data_type: str) -> Path:
        """Generate partitioned path based on timestamp"""
        year = timestamp.year
        month = timestamp.month

        if data_type == "transactions":
            # Weekly partitions for transactions
            week_start = timestamp - timedelta(days=timestamp.weekday())
            week_end = week_start + timedelta(days=6)
            filename = f"transactions_{week_start.strftime('%Y-%m-%d')}_{week_end.strftime('%Y-%m-%d')}.parquet"
            return (
                self.base_path
                / "transactions"
                / f"year={year}"
                / f"month={month:02d}"
                / filename
            )

        elif data_type == "account_balances":
            filename = f"daily_snapshots_{year}-{month:02d}.parquet"
            return self.base_path / "account_balances" / filename

        elif data_type == "metrics":
            filename = f"metrics_{year}-{month:02d}.parquet"
            return self.base_path / "metrics" / filename

    async def add_transaction(self, transaction: Transaction) -> bool:
        """Add a single transaction"""
        return await self.add_transactions([transaction])

    async def add_transactions(self, transactions: List[Transaction]) -> bool:
        """Add multiple transactions efficiently"""
        async with self._write_lock:
            try:
                # Convert to DataFrame
                df = pl.DataFrame([t.model_dump() for t in transactions])

                # Group by partition (week)
                partitions = {}
                for row in df.iter_rows(named=True):
                    timestamp = row["timestamp"]
                    partition_path = self._get_partition_path(timestamp, "transactions")

                    if partition_path not in partitions:
                        partitions[partition_path] = []
                    partitions[partition_path].append(row)

                # Write to each partition
                for partition_path, rows in partitions.items():
                    partition_path.parent.mkdir(parents=True, exist_ok=True)
                    new_df = pl.DataFrame(rows)

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
                print(f"Error adding transactions: {e}")
                return False

    async def get_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        account_id: Optional[str] = None,
        category: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> pl.DataFrame:
        """Query transactions with optional filters"""

        # Determine which files to read based on date range
        files_to_read = self._get_relevant_files("transactions", start_date, end_date)

        if not files_to_read:
            return pl.DataFrame()

        try:
            # Read all relevant files
            dfs = []
            for file_path in files_to_read:
                if file_path.exists():
                    df = pl.read_parquet(file_path)
                    dfs.append(df)

            if not dfs:
                return pl.DataFrame()

            # Combine all data
            combined_df = pl.concat(dfs)

            # Apply filters
            if start_date:
                combined_df = combined_df.filter(pl.col("timestamp") >= start_date)
            if end_date:
                combined_df = combined_df.filter(pl.col("timestamp") <= end_date)
            if account_id:
                combined_df = combined_df.filter(pl.col("account_id") == account_id)
            if category:
                combined_df = combined_df.filter(pl.col("category") == category)

            # Sort and limit
            combined_df = combined_df.sort("timestamp", descending=True)
            if limit:
                combined_df = combined_df.head(limit)

            return combined_df

        except Exception as e:
            print(f"Error querying transactions: {e}")
            return pl.DataFrame()

    def _get_relevant_files(
        self,
        data_type: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> List[Path]:
        """Get list of files that might contain data in the date range"""
        files = []

        if data_type == "transactions":
            transactions_path = self.base_path / "transactions"
            if not transactions_path.exists():
                return files

            # If no date range specified, get all files
            if not start_date and not end_date:
                for year_dir in transactions_path.glob("year=*"):
                    for month_dir in year_dir.glob("month=*"):
                        files.extend(month_dir.glob("*.parquet"))
                return files

            # Calculate date range to scan
            scan_start = start_date or datetime.min
            scan_end = end_date or datetime.max

            # Find relevant year/month directories
            current_date = scan_start.replace(day=1)
            while current_date <= scan_end:
                year_dir = transactions_path / f"year={current_date.year}"
                month_dir = year_dir / f"month={current_date.month:02d}"

                if month_dir.exists():
                    files.extend(month_dir.glob("*.parquet"))

                # Move to next month
                if current_date.month == 12:
                    current_date = current_date.replace(
                        year=current_date.year + 1, month=1
                    )
                else:
                    current_date = current_date.replace(month=current_date.month + 1)

        elif data_type == "metrics":
            metrics_path = self.base_path / "metrics"
            if not metrics_path.exists():
                return files

            # Metrics are stored monthly, so get all metric files
            if not start_date and not end_date:
                files.extend(metrics_path.glob("*.parquet"))
                return files

            # Calculate date range to scan
            scan_start = start_date or datetime.min
            scan_end = end_date or datetime.max

            # Find relevant metric files (monthly partitions)
            current_date = scan_start.replace(day=1)
            while current_date <= scan_end:
                metric_file = (
                    metrics_path
                    / f"metrics_{current_date.year}-{current_date.month:02d}.parquet"
                )
                if metric_file.exists():
                    files.append(metric_file)

                # Move to next month - but avoid year overflow
                try:
                    if current_date.month == 12:
                        current_date = current_date.replace(
                            year=current_date.year + 1, month=1
                        )
                    else:
                        current_date = current_date.replace(
                            month=current_date.month + 1
                        )
                except ValueError:
                    # Year overflow, break the loop
                    break

        elif data_type == "account_balances":
            balances_path = self.base_path / "account_balances"
            if not balances_path.exists():
                return files

            # Account balances are stored monthly
            if not start_date and not end_date:
                files.extend(balances_path.glob("*.parquet"))
                return files

            # Calculate date range to scan
            scan_start = start_date or datetime.min
            scan_end = end_date or datetime.max

            # Find relevant balance files (monthly partitions)
            current_date = scan_start.replace(day=1)
            while current_date <= scan_end:
                balance_file = (
                    balances_path
                    / f"daily_snapshots_{current_date.year}-{current_date.month:02d}.parquet"
                )
                if balance_file.exists():
                    files.append(balance_file)

                # Move to next month
                if current_date.month == 12:
                    current_date = current_date.replace(
                        year=current_date.year + 1, month=1
                    )
                else:
                    current_date = current_date.replace(month=current_date.month + 1)

        return files

    async def get_account_balance_history(
        self, account_id: str, days: int = 30
    ) -> pl.DataFrame:
        """Get account balance history"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        files = self._get_relevant_files("account_balances", start_date, end_date)

        if not files:
            return pl.DataFrame()

        try:
            dfs = []
            for file_path in files:
                if file_path.exists():
                    df = pl.read_parquet(file_path)
                    df = df.filter(pl.col("account_id") == account_id)
                    dfs.append(df)

            if not dfs:
                return pl.DataFrame()

            combined_df = pl.concat(dfs)
            return combined_df.filter(
                (pl.col("timestamp") >= start_date) & (pl.col("timestamp") <= end_date)
            ).sort("timestamp")

        except Exception as e:
            print(f"Error querying balance history: {e}")
            return pl.DataFrame()

    async def get_spending_by_category(
        self, start_date: datetime, end_date: datetime
    ) -> pl.DataFrame:
        """Get spending aggregated by category"""
        df = await self.get_transactions(start_date=start_date, end_date=end_date)

        if df.is_empty():
            return pl.DataFrame()

        return (
            df.filter(pl.col("transaction_type") == "expense")
            .group_by("category")
            .agg(
                [
                    pl.col("amount").sum().alias("total_spent"),
                    pl.col("amount").count().alias("transaction_count"),
                    pl.col("amount").mean().alias("avg_amount"),
                ]
            )
            .sort("total_spent", descending=True)
        )

    async def get_monthly_summary(self, year: int, month: int) -> Dict:
        """Get monthly financial summary"""
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(seconds=1)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(seconds=1)

        df = await self.get_transactions(start_date=start_date, end_date=end_date)

        if df.is_empty():
            return {"income": 0, "expenses": 0, "net": 0, "transaction_count": 0}

        summary = df.group_by("transaction_type").agg(
            [
                pl.col("amount").sum().alias("total"),
                pl.col("amount").count().alias("count"),
            ]
        )

        result = {"income": 0, "expenses": 0, "net": 0, "transaction_count": len(df)}

        for row in summary.iter_rows(named=True):
            if row["transaction_type"] == "income":
                result["income"] = row["total"]
            elif row["transaction_type"] == "expense":
                result["expenses"] = abs(row["total"])  # Expenses should be positive

        result["net"] = result["income"] - result["expenses"]
        return result

    async def add_metric(self, metric: Metric) -> bool:
        """Add a single metric"""
        return await self.add_metrics([metric])

    async def add_metrics(self, metrics: list[Metric]) -> bool:
        """Add multiple metrics efficiently"""
        async with self._write_lock:
            try:
                # Convert to DataFrame with flattened data structure
                rows = []
                for m in metrics:
                    # Convert data dict to JSON string for storage
                    # Ensure notes is always a string (empty string if None)
                    row = {
                        "timestamp": m.timestamp,
                        "metric_id": m.metric_id,
                        "metric_name": m.metric_name,
                        "category": m.category,
                        "data": json.dumps(m.data),
                        "notes": m.notes if m.notes is not None else "",
                    }
                    rows.append(row)

                # Create DataFrame with explicit schema to avoid type conflicts
                df = pl.DataFrame(
                    rows,
                    schema={
                        "timestamp": pl.Datetime,
                        "metric_id": pl.Utf8,
                        "metric_name": pl.Utf8,
                        "category": pl.Utf8,
                        "data": pl.Utf8,
                        "notes": pl.Utf8,
                    },
                )

                # Group by partition (month)
                partitions = {}
                for row in df.iter_rows(named=True):
                    timestamp = row["timestamp"]
                    partition_path = self._get_partition_path(timestamp, "metrics")

                    if partition_path not in partitions:
                        partitions[partition_path] = []
                    partitions[partition_path].append(row)

                # Write to each partition
                for partition_path, partition_rows in partitions.items():
                    partition_path.parent.mkdir(parents=True, exist_ok=True)

                    # Create new DataFrame with consistent schema
                    new_df = pl.DataFrame(
                        partition_rows,
                        schema={
                            "timestamp": pl.Datetime,
                            "metric_id": pl.Utf8,
                            "metric_name": pl.Utf8,
                            "category": pl.Utf8,
                            "data": pl.Utf8,
                            "notes": pl.Utf8,
                        },
                    )

                    if partition_path.exists():
                        try:
                            # Read existing file and ensure schema compatibility
                            existing_df = pl.read_parquet(partition_path)

                            # Ensure existing DataFrame has consistent schema
                            # Fill any null notes with empty strings
                            if "notes" in existing_df.columns:
                                existing_df = existing_df.with_columns(
                                    pl.col("notes").fill_null("").cast(pl.Utf8)
                                )

                            # Add metric_id column if it doesn't exist (backward compatibility)
                            if "metric_id" not in existing_df.columns:
                                # For backward compatibility, create a placeholder metric_id for existing data
                                # We'll use empty string which will be handled gracefully
                                existing_df = existing_df.with_columns(
                                    pl.lit("").alias("metric_id")
                                )
                                # Reorder columns to match new schema
                                existing_df = existing_df.select(
                                    [
                                        "timestamp",
                                        "metric_id",
                                        "metric_name",
                                        "category",
                                        "data",
                                        "notes",
                                    ]
                                )

                            # Combine DataFrames
                            combined_df = pl.concat([existing_df, new_df])
                            # Sort by timestamp for better compression
                            combined_df = combined_df.sort("timestamp")
                            combined_df.write_parquet(partition_path)
                        except Exception as read_error:
                            print(
                                f"Error reading existing parquet file {partition_path}: {read_error}"
                            )
                            # If we can't read the existing file, just write the new data
                            new_df = new_df.sort("timestamp")
                            new_df.write_parquet(partition_path)
                    else:
                        # Create new file
                        new_df = new_df.sort("timestamp")
                        new_df.write_parquet(partition_path)

                return True
            except Exception as e:
                print(f"Error adding metrics: {e}")
                return False

    async def get_metrics(
        self, start_date=None, end_date=None, category=None, metric_id=None, limit=None
    ):
        """Get metrics within date range and with optional filters"""
        try:
            # Get all metric files in the date range
            files = self._get_relevant_files("metrics", start_date, end_date)

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

            # Apply date filters
            if start_date:
                df = df.filter(pl.col("timestamp") >= start_date)
            if end_date:
                df = df.filter(pl.col("timestamp") <= end_date)

            # Apply category filter
            if category:
                df = df.filter(pl.col("category") == category)

            # Apply metric_id filter
            if metric_id:
                # Check if metric_id column exists (backward compatibility)
                if "metric_id" in df.columns:
                    df = df.filter(pl.col("metric_id") == metric_id)
                else:
                    # For backward compatibility, return empty result if no metric_id column
                    return []

            # Apply limit
            if limit:
                df = df.head(limit)

            # Convert to Metric objects
            metrics = []
            for row in df.iter_rows(named=True):
                # Handle backward compatibility for existing data that might not have metric_id
                metric_id = row.get(
                    "metric_id", ""
                )  # Default to empty string if not present
                metric = Metric(
                    metric_id=metric_id,
                    metric_name=row["metric_name"],
                    category=row["category"],
                    data=json.loads(row["data"]),
                    notes=row["notes"],
                    timestamp=row["timestamp"],
                )
                metrics.append(metric)

            return metrics
        except Exception as e:
            print(f"Error reading metrics: {e}")
            return []

    async def get_metrics_summary(self) -> dict:
        """Get summary statistics for metric values (not definitions)"""
        try:
            # Get all metric values from the last 30 days for recent count
            thirty_days_ago = datetime.now() - timedelta(days=30)
            recent_metrics = await self.get_metrics(start_date=thirty_days_ago)

            # Get all metric values for total count
            all_metrics = await self.get_metrics()

            if not all_metrics:
                return {
                    "total_metrics": 0,
                    "categories": 0,
                    "recent_count": 0,
                    "most_recent_date": None,
                }

            # Calculate statistics - count unique metric names
            unique_metric_names = set(m.metric_name for m in all_metrics)
            most_recent_date = (
                max(m.timestamp for m in all_metrics) if all_metrics else None
            )

            return {
                "total_metrics": len(all_metrics),  # Total metric value entries
                "categories": len(
                    unique_metric_names
                ),  # Unique metric definitions used
                "recent_count": len(recent_metrics),
                "most_recent_date": most_recent_date,
            }

        except Exception as e:
            print(f"Error getting metrics summary: {e}")
            return {
                "total_metrics": 0,
                "categories": 0,
                "recent_count": 0,
                "most_recent_date": None,
            }

    async def delete_metric(
        self,
        timestamp: datetime,
        metric_id: str,
        data: dict[str, str | int | float | bool],
    ) -> bool:
        """Delete a specific metric by timestamp, metric id, and data"""
        async with self._write_lock:
            try:
                partition_path = self._get_partition_path(timestamp, "metrics")

                if not partition_path.exists():
                    return False

                # Read existing data
                df = pl.read_parquet(partition_path)

                # Convert data to JSON string for comparison
                data_json = json.dumps(data, sort_keys=True)

                # Filter out the matching metric - handle backward compatibility
                original_count = len(df)

                # First check if metric_id column exists
                if "metric_id" in df.columns:
                    filtered_df = df.filter(
                        ~(
                            (pl.col("timestamp") == timestamp)
                            & (pl.col("metric_id") == metric_id)
                            & (pl.col("data") == data_json)
                        )
                    )
                else:
                    # Backward compatibility: use metric_name if metric_id not available
                    filtered_df = df.filter(
                        ~(
                            (pl.col("timestamp") == timestamp)
                            & (
                                pl.col("metric_name") == metric_id
                            )  # Use metric_id as metric_name for backward compatibility
                            & (pl.col("data") == data_json)
                        )
                    )

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
                print(f"Error deleting metric: {e}")
                return False

    # Units Management
    def _get_units_file(self) -> Path:
        """Get the path to the units file"""
        return self.base_path / "metadata" / "units.parquet"

    async def add_unit(self, unit: Unit) -> bool:
        """Add a single unit"""
        return await self.add_units([unit])

    async def add_units(self, units: list[Unit]) -> bool:
        """Add multiple units efficiently"""
        async with self._write_lock:
            try:
                # Convert to DataFrame
                rows = []
                for unit in units:
                    row = {
                        "id": unit.id,
                        "name": unit.name,
                        "symbol": unit.symbol,
                        "type": unit.type,
                        "description": unit.description
                        if unit.description is not None
                        else "",
                        "created_at": unit.created_at,
                        "updated_at": unit.updated_at,
                    }
                    rows.append(row)

                # Create DataFrame with explicit schema
                df = pl.DataFrame(
                    rows,
                    schema={
                        "id": pl.Utf8,
                        "name": pl.Utf8,
                        "symbol": pl.Utf8,
                        "type": pl.Utf8,
                        "description": pl.Utf8,
                        "created_at": pl.Datetime,
                        "updated_at": pl.Datetime,
                    },
                )

                units_file = self._get_units_file()
                units_file.parent.mkdir(parents=True, exist_ok=True)

                if units_file.exists():
                    # Read existing file and combine
                    existing_df = pl.read_parquet(units_file)

                    # Ensure existing DataFrame has consistent schema
                    if "description" in existing_df.columns:
                        existing_df = existing_df.with_columns(
                            pl.col("description").fill_null("").cast(pl.Utf8)
                        )

                    # Remove duplicates by ID (newer entries take priority)
                    existing_df = existing_df.filter(~pl.col("id").is_in(df["id"]))
                    combined_df = pl.concat([existing_df, df])
                    combined_df = combined_df.sort("name")
                    combined_df.write_parquet(units_file)
                else:
                    # Create new file
                    df = df.sort("name")
                    df.write_parquet(units_file)

                return True
            except Exception as e:
                print(f"Error adding units: {e}")
                return False

    async def get_units(self) -> list[Unit]:
        """Get all units"""
        try:
            units_file = self._get_units_file()
            if not units_file.exists():
                return []

            df = pl.read_parquet(units_file)

            # Convert to Unit objects
            units = []
            for row in df.iter_rows(named=True):
                unit = Unit(
                    id=row["id"],
                    name=row["name"],
                    symbol=row["symbol"],
                    type=row["type"],
                    description=row["description"] if row["description"] else None,
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
                units.append(unit)

            return units
        except Exception as e:
            print(f"Error reading units: {e}")
            return []

    async def get_unit_by_id(self, unit_id: str) -> Unit | None:
        """Get a specific unit by ID"""
        try:
            units_file = self._get_units_file()
            if not units_file.exists():
                return None

            df = pl.read_parquet(units_file)
            df = df.filter(pl.col("id") == unit_id)

            if df.is_empty():
                return None

            row = df.iter_rows(named=True).__next__()
            return Unit(
                id=row["id"],
                name=row["name"],
                symbol=row["symbol"],
                type=row["type"],
                description=row["description"] if row["description"] else None,
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
        except Exception as e:
            print(f"Error reading unit: {e}")
            return None

    async def update_unit(self, unit_id: str, unit: Unit) -> bool:
        """Update a unit"""
        try:
            units_file = self._get_units_file()
            if not units_file.exists():
                return False

            df = pl.read_parquet(units_file)

            # Check if unit exists
            if not df.filter(pl.col("id") == unit_id).height > 0:
                return False

            # Remove the old unit and add the updated one
            df_without_unit = df.filter(pl.col("id") != unit_id)

            # Create new unit row
            new_row = pl.DataFrame(
                [
                    {
                        "id": unit.id,
                        "name": unit.name,
                        "symbol": unit.symbol,
                        "type": unit.type,
                        "description": unit.description
                        if unit.description is not None
                        else "",
                        "created_at": unit.created_at,
                        "updated_at": unit.updated_at,
                    }
                ],
                schema=df.schema,
            )

            # Combine and save
            updated_df = pl.concat([df_without_unit, new_row]).sort("name")
            updated_df.write_parquet(units_file)

            return True
        except Exception as e:
            print(f"Error updating unit: {e}")
            return False

    async def delete_unit(self, unit_id: str) -> bool:
        """Delete a unit"""
        try:
            units_file = self._get_units_file()
            if not units_file.exists():
                return False

            df = pl.read_parquet(units_file)

            # Check if unit exists
            if not df.filter(pl.col("id") == unit_id).height > 0:
                return False

            # Remove the unit
            df_without_unit = df.filter(pl.col("id") != unit_id)

            if df_without_unit.is_empty():
                # If no units left, delete the file
                units_file.unlink()
            else:
                df_without_unit.write_parquet(units_file)

            return True
        except Exception as e:
            print(f"Error deleting unit: {e}")
            return False

    # Categories Management
    def _get_categories_file(self) -> Path:
        """Get the path to the categories file"""
        return self.base_path / "metadata" / "categories.parquet"

    async def add_category(self, category: Category) -> bool:
        """Add a single category"""
        return await self.add_categories([category])

    async def add_categories(self, categories: list[Category]) -> bool:
        """Add multiple categories efficiently"""
        async with self._write_lock:
            try:
                # Convert to DataFrame
                rows = []
                for category in categories:
                    row = {
                        "id": category.id,
                        "name": category.name,
                        "description": category.description
                        if category.description is not None
                        else "",
                        "color": category.color if category.color is not None else "",
                        "created_at": category.created_at,
                        "updated_at": category.updated_at,
                    }
                    rows.append(row)

                # Create DataFrame with explicit schema
                df = pl.DataFrame(
                    rows,
                    schema={
                        "id": pl.Utf8,
                        "name": pl.Utf8,
                        "description": pl.Utf8,
                        "color": pl.Utf8,
                        "created_at": pl.Datetime,
                        "updated_at": pl.Datetime,
                    },
                )

                categories_file = self._get_categories_file()
                categories_file.parent.mkdir(parents=True, exist_ok=True)

                if categories_file.exists():
                    # Read existing file and combine
                    existing_df = pl.read_parquet(categories_file)

                    # Ensure existing DataFrame has consistent schema
                    if "description" in existing_df.columns:
                        existing_df = existing_df.with_columns(
                            pl.col("description").fill_null("").cast(pl.Utf8)
                        )
                    if "color" in existing_df.columns:
                        existing_df = existing_df.with_columns(
                            pl.col("color").fill_null("").cast(pl.Utf8)
                        )

                    # Remove duplicates by ID (newer entries take priority)
                    existing_df = existing_df.filter(~pl.col("id").is_in(df["id"]))
                    combined_df = pl.concat([existing_df, df])
                    combined_df = combined_df.sort("name")
                    combined_df.write_parquet(categories_file)
                else:
                    # Create new file
                    df = df.sort("name")
                    df.write_parquet(categories_file)

                return True
            except Exception as e:
                print(f"Error adding categories: {e}")
                return False

    async def get_categories(self) -> list[Category]:
        """Get all categories"""
        try:
            categories_file = self._get_categories_file()
            if not categories_file.exists():
                return []

            df = pl.read_parquet(categories_file)

            # Convert to Category objects
            categories = []
            for row in df.iter_rows(named=True):
                category = Category(
                    id=row["id"],
                    name=row["name"],
                    description=row["description"] if row["description"] else None,
                    color=row["color"] if row["color"] else None,
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
                categories.append(category)

            return categories
        except Exception as e:
            print(f"Error reading categories: {e}")
            return []

    async def get_category_by_id(self, category_id: str) -> Category | None:
        """Get a specific category by ID"""
        try:
            categories_file = self._get_categories_file()
            if not categories_file.exists():
                return None

            df = pl.read_parquet(categories_file)
            df = df.filter(pl.col("id") == category_id)

            if df.is_empty():
                return None

            row = df.iter_rows(named=True).__next__()
            return Category(
                id=row["id"],
                name=row["name"],
                description=row["description"] if row["description"] else None,
                color=row["color"] if row["color"] else None,
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
        except Exception as e:
            print(f"Error reading category: {e}")
            return None

    async def update_category(self, category_id: str, category: Category) -> bool:
        """Update a category"""
        try:
            categories_file = self._get_categories_file()
            if not categories_file.exists():
                return False

            df = pl.read_parquet(categories_file)

            # Check if category exists
            if not df.filter(pl.col("id") == category_id).height > 0:
                return False

            # Remove the old category and add the updated one
            df_without_category = df.filter(pl.col("id") != category_id)

            # Create new category row
            new_row = pl.DataFrame(
                [
                    {
                        "id": category.id,
                        "name": category.name,
                        "description": category.description
                        if category.description is not None
                        else "",
                        "color": category.color if category.color is not None else "",
                        "created_at": category.created_at,
                        "updated_at": category.updated_at,
                    }
                ],
                schema=df.schema,
            )

            # Combine and save
            updated_df = pl.concat([df_without_category, new_row]).sort("name")
            updated_df.write_parquet(categories_file)

            return True
        except Exception as e:
            print(f"Error updating category: {e}")
            return False

    async def delete_category(self, category_id: str) -> bool:
        """Delete a category"""
        try:
            categories_file = self._get_categories_file()
            if not categories_file.exists():
                return False

            df = pl.read_parquet(categories_file)

            # Check if category exists
            if not df.filter(pl.col("id") == category_id).height > 0:
                return False

            # Remove the category
            df_without_category = df.filter(pl.col("id") != category_id)

            if df_without_category.is_empty():
                # If no categories left, delete the file
                categories_file.unlink()
            else:
                df_without_category.write_parquet(categories_file)

            return True
        except Exception as e:
            print(f"Error deleting category: {e}")
            return False

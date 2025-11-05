import asyncio
from datetime import datetime, timedelta
from pathlib import Path

import polars as pl

from ..models import Transaction


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

    async def add_transactions(self, transactions: list[Transaction]) -> bool:
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
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        account_id: str | None = None,
        category: str | None = None,
        limit: int | None = None,
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
        start_date: datetime | None,
        end_date: datetime | None,
    ) -> list[Path]:
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

    async def get_monthly_summary(self, year: int, month: int) -> dict:
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

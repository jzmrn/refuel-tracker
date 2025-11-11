import asyncio
from datetime import datetime
from pathlib import Path


class ParquetDataStore:
    def __init__(self, base_path: str = "data"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(exist_ok=True)

        # Create subdirectories
        (self.base_path / "metrics").mkdir(exist_ok=True)
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

    def _get_relevant_files(
        self,
        data_type: str,
        start_date: datetime | None,
        end_date: datetime | None,
    ) -> list[Path]:
        """Get list of files that might contain data in the date range"""
        files = []

        if data_type == "metrics":
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

        return files

from datetime import datetime
from typing import Any

import polars as pl

from .metric_store import MetricBase, MetricStoreBase


class RefuelMetric(MetricBase):
    """Refuel (fuel) metric with mandatory price and amount fields"""

    price: float  # Price per liter in euros
    amount: float  # Amount in liters

    def __str__(self):
        return f"Refuel: {self.amount:.2f}L @ {self.price:.3f}€/L (Total: {self.amount * self.price:.2f}€)"


class RefuelStore(MetricStoreBase):
    """Parquet store for refuel metrics with optimized schema"""

    def get_metric_name(self) -> str:
        return "refuel"

    def get_schema(self) -> dict[str, Any]:
        """Return the Polars schema for refuel metrics"""
        return {
            "timestamp": pl.Datetime,
            "price": pl.Float64,
            "amount": pl.Float64,
            "notes": pl.Utf8,
        }

    def metric_to_row(self, metric: RefuelMetric) -> dict[str, Any]:
        """Convert RefuelMetric to DataFrame row"""
        return {
            "timestamp": metric.timestamp,
            "price": metric.price,
            "amount": metric.amount,
            "notes": metric.notes if metric.notes is not None else "",
        }

    def row_to_metric(self, row: dict[str, Any]) -> RefuelMetric:
        """Convert DataFrame row to RefuelMetric"""
        return RefuelMetric(
            timestamp=row["timestamp"],
            price=row["price"],
            amount=row["amount"],
            notes=row["notes"] if row["notes"] else None,
        )

    async def get_total_cost_by_period(
        self, start_date: datetime | None = None, end_date: datetime | None = None
    ) -> dict[str, Any]:
        """Get aggregated cost statistics for a time period"""
        try:
            files = self._get_relevant_files(start_date, end_date)

            if not files:
                return {
                    "total_cost": 0.0,
                    "total_liters": 0.0,
                    "average_price_per_liter": 0.0,
                    "fill_up_count": 0,
                }

            # Read and combine all files
            dataframes = []
            for file_path in files:
                if file_path.exists():
                    df = pl.read_parquet(file_path)
                    dataframes.append(df)

            if not dataframes:
                return {
                    "total_cost": 0.0,
                    "total_liters": 0.0,
                    "average_price_per_liter": 0.0,
                    "fill_up_count": 0,
                }

            df = pl.concat(dataframes)

            # Apply date filters
            if start_date:
                df = df.filter(pl.col("timestamp") >= start_date)
            if end_date:
                df = df.filter(pl.col("timestamp") <= end_date)

            if df.is_empty():
                return {
                    "total_cost": 0.0,
                    "total_liters": 0.0,
                    "average_price_per_liter": 0.0,
                    "fill_up_count": 0,
                }

            # Calculate total cost (price * amount for each row)
            df = df.with_columns(
                (pl.col("price") * pl.col("amount")).alias("total_cost_per_fillup")
            )

            # Aggregate statistics
            total_cost = df.select(pl.sum("total_cost_per_fillup")).item()
            total_liters = df.select(pl.sum("amount")).item()
            fill_up_count = len(df)

            # Calculate weighted average price per liter
            average_price_per_liter = (
                total_cost / total_liters if total_liters > 0 else 0.0
            )

            return {
                "total_cost": round(total_cost, 2),
                "total_liters": round(total_liters, 2),
                "average_price_per_liter": round(average_price_per_liter, 3),
                "fill_up_count": fill_up_count,
            }

        except Exception as e:
            print(f"Error calculating refuel statistics: {e}")
            return {
                "total_cost": 0.0,
                "total_liters": 0.0,
                "average_price_per_liter": 0.0,
                "fill_up_count": 0,
            }

    async def get_price_trends(
        self, start_date: datetime | None = None, end_date: datetime | None = None
    ) -> list[dict[str, Any]]:
        """Get price trends over time"""
        try:
            metrics = await self.get_metrics(start_date=start_date, end_date=end_date)

            # Convert to list of dictionaries for trend analysis
            trends = []
            for metric in metrics:
                trends.append(
                    {
                        "date": metric.timestamp.date().isoformat(),
                        "timestamp": metric.timestamp,
                        "price": metric.price,
                        "amount": metric.amount,
                        "total_cost": round(metric.price * metric.amount, 2),
                    }
                )

            # Sort by timestamp (oldest first for trend analysis)
            trends.sort(key=lambda x: x["timestamp"])

            return trends

        except Exception as e:
            print(f"Error getting refuel price trends: {e}")
            return []

    async def get_monthly_summary(self, year: int, month: int) -> dict[str, Any]:
        """Get monthly fuel statistics"""
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        # Get cost statistics for the month
        cost_stats = await self.get_total_cost_by_period(start_date, end_date)

        # Get all fill-ups for additional analysis
        metrics = await self.get_metrics(start_date=start_date, end_date=end_date)

        if not metrics:
            return {
                **cost_stats,
                "max_price": 0.0,
                "min_price": 0.0,
                "largest_fillup": 0.0,
                "smallest_fillup": 0.0,
            }

        prices = [m.price for m in metrics]
        amounts = [m.amount for m in metrics]

        return {
            **cost_stats,
            "max_price": round(max(prices), 3),
            "min_price": round(min(prices), 3),
            "largest_fillup": round(max(amounts), 2),
            "smallest_fillup": round(min(amounts), 2),
        }

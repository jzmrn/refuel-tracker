from datetime import datetime
from typing import Any

import polars as pl
from pydantic import BaseModel

from .parquet_store import ParquetDataStore


class MetricBase(BaseModel):
    """Base class for all metrics"""

    timestamp: datetime
    notes: str | None = None


class RefuelMetric(MetricBase):
    """Refuel (fuel) metric with mandatory price and amount fields"""

    price: float  # Price per liter in euros
    amount: float  # Amount in liters
    kilometers_since_last_refuel: float  # Kilometers driven since last refuel
    estimated_fuel_consumption: float  # Car's estimated fuel consumption in L/100km

    def __str__(self):
        return f"Refuel: {self.amount:.2f}L @ {self.price:.3f}€/L (Total: {self.amount * self.price:.2f}€) - {self.kilometers_since_last_refuel:.0f}km, Est: {self.estimated_fuel_consumption:.1f}L/100km"


class RefuelStore:
    """Parquet store for refuel metrics with optimized schema"""

    def __init__(self, parquet_store: ParquetDataStore):
        self.parquet_store = parquet_store
        self.data_type = "refuel"

    def get_schema(self) -> dict[str, Any]:
        """Return the Polars schema for refuel metrics"""
        return {
            "timestamp": pl.Datetime,
            "user_id": pl.Utf8,
            "price": pl.Float64,
            "amount": pl.Float64,
            "kilometers_since_last_refuel": pl.Float64,
            "estimated_fuel_consumption": pl.Float64,
            "notes": pl.Utf8,
        }

    def metric_to_row(self, metric: RefuelMetric) -> dict[str, Any]:
        """Convert RefuelMetric to DataFrame row"""
        return {
            "timestamp": metric.timestamp,
            "user_id": "",  # Will be set by caller (add_metric/add_metrics)
            "price": metric.price,
            "amount": metric.amount,
            "kilometers_since_last_refuel": metric.kilometers_since_last_refuel,
            "estimated_fuel_consumption": metric.estimated_fuel_consumption,
            "notes": metric.notes if metric.notes is not None else "",
        }

    def row_to_metric(self, row: dict[str, Any]) -> RefuelMetric:
        """Convert DataFrame row to RefuelMetric"""
        return RefuelMetric(
            timestamp=row["timestamp"],
            price=row["price"],
            amount=row["amount"],
            kilometers_since_last_refuel=row["kilometers_since_last_refuel"],
            estimated_fuel_consumption=row["estimated_fuel_consumption"],
            notes=row["notes"] if row["notes"] else None,
        )

    async def add_metrics(self, metrics: list[RefuelMetric], user_id: str) -> bool:
        """Add multiple metrics efficiently"""
        rows = [self.metric_to_row(metric) for metric in metrics]
        return await self.parquet_store.add_rows(
            self.data_type, rows, self.get_schema(), user_id
        )

    async def add_metric(self, metric: RefuelMetric, user_id: str) -> bool:
        """Add a single metric"""
        return await self.add_metrics([metric], user_id)

    async def get_metrics(
        self,
        user_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int | None = None,
        **filters,
    ) -> list[RefuelMetric]:
        """Get metrics with optional filters"""
        rows = await self.parquet_store.get_rows(
            self.data_type, user_id, start_date, end_date, limit, **filters
        )
        return [self.row_to_metric(row) for row in rows]

    async def delete_metric(
        self, user_id: str, timestamp: datetime, **match_criteria
    ) -> bool:
        """Delete a specific metric by timestamp and matching criteria"""
        return await self.parquet_store.delete_row(
            self.data_type, user_id, timestamp, **match_criteria
        )

    async def get_total_cost_by_period(
        self,
        user_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> dict[str, Any]:
        """Get aggregated cost statistics for a time period"""
        try:
            rows = await self.parquet_store.get_rows(
                self.data_type, user_id, start_date, end_date
            )

            if not rows:
                return {
                    "total_cost": 0.0,
                    "total_liters": 0.0,
                    "average_price_per_liter": 0.0,
                    "fill_up_count": 0,
                }

            # Calculate statistics
            total_cost = sum(row["price"] * row["amount"] for row in rows)
            total_liters = sum(row["amount"] for row in rows)
            fill_up_count = len(rows)

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
        self,
        user_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> list[dict[str, Any]]:
        """Get price trends over time"""
        try:
            metrics = await self.get_metrics(
                user_id, start_date=start_date, end_date=end_date
            )

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

    async def get_monthly_summary(
        self, user_id: str, year: int, month: int
    ) -> dict[str, Any]:
        """Get monthly fuel statistics"""
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        # Get cost statistics for the month
        cost_stats = await self.get_total_cost_by_period(user_id, start_date, end_date)

        # Get all fill-ups for additional analysis
        metrics = await self.get_metrics(
            user_id, start_date=start_date, end_date=end_date
        )

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

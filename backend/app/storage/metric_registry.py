from datetime import datetime
from typing import Any

from .metric_store import MetricBase, MetricStoreBase
from .refuel_store import RefuelMetric, RefuelStore


class MetricRegistry:
    """Registry for all metric types and their stores"""

    def __init__(self, base_path: str = "data"):
        self.base_path = base_path
        self._stores: dict[str, MetricStoreBase] = {}
        self._metric_types: dict[str, type[MetricBase]] = {}

        # Register all available metrics
        self._register_built_in_metrics()

    def _register_built_in_metrics(self):
        """Register all built-in metric types"""
        # Register refuel metric
        self.register_metric("refuel", RefuelStore, RefuelMetric)

    def register_metric(
        self,
        metric_name: str,
        store_class: type[MetricStoreBase],
        metric_class: type[MetricBase],
    ):
        """Register a new metric type with its store and model classes"""
        self._stores[metric_name] = store_class(self.base_path)
        self._metric_types[metric_name] = metric_class

    def get_store(self, metric_name: str) -> MetricStoreBase:
        """Get the store instance for a metric type"""
        if metric_name not in self._stores:
            raise ValueError(f"Unknown metric type: {metric_name}")
        return self._stores[metric_name]

    def get_metric_class(self, metric_name: str) -> type[MetricBase]:
        """Get the Pydantic model class for a metric type"""
        if metric_name not in self._metric_types:
            raise ValueError(f"Unknown metric type: {metric_name}")
        return self._metric_types[metric_name]

    def list_available_metrics(self) -> list[str]:
        """List all registered metric types"""
        return list(self._stores.keys())

    async def add_metric(self, metric_name: str, metric_data: dict[str, Any]) -> bool:
        """Add a metric by name and data dictionary"""
        if metric_name not in self._stores:
            raise ValueError(f"Unknown metric type: {metric_name}")

        # Get the appropriate metric class
        metric_class = self._metric_types[metric_name]

        # Add timestamp if not provided
        if "timestamp" not in metric_data:
            metric_data["timestamp"] = datetime.now()

        # Create metric instance
        metric = metric_class(**metric_data)

        # Store using the appropriate store
        store = self._stores[metric_name]
        return await store.add_metric(metric)

    async def get_metrics(
        self,
        metric_name: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int | None = None,
        **filters,
    ) -> list[MetricBase]:
        """Get metrics of a specific type"""
        if metric_name not in self._stores:
            raise ValueError(f"Unknown metric type: {metric_name}")

        store = self._stores[metric_name]
        return await store.get_metrics(
            start_date=start_date, end_date=end_date, limit=limit, **filters
        )

    async def get_metric_summary(self, metric_name: str) -> dict[str, Any]:
        """Get summary for a specific metric type"""
        if metric_name not in self._stores:
            raise ValueError(f"Unknown metric type: {metric_name}")

        store = self._stores[metric_name]
        summary = await store.get_summary()
        summary["metric_name"] = metric_name
        return summary

    async def get_all_metrics_summary(self) -> dict[str, Any]:
        """Get combined summary for all metric types"""
        summaries = {}
        total_count = 0
        most_recent_date = None

        for metric_name in self._stores.keys():
            summary = await self.get_metric_summary(metric_name)
            summaries[metric_name] = summary

            total_count += summary.get("total_count", 0)

            if summary.get("most_recent_date"):
                if (
                    not most_recent_date
                    or summary["most_recent_date"] > most_recent_date
                ):
                    most_recent_date = summary["most_recent_date"]

        return {
            "total_metrics_count": total_count,
            "metric_types_count": len(self._stores),
            "most_recent_date": most_recent_date,
            "by_type": summaries,
        }

    async def delete_metric(
        self, metric_name: str, timestamp: datetime, **match_criteria
    ) -> bool:
        """Delete a specific metric"""
        if metric_name not in self._stores:
            raise ValueError(f"Unknown metric type: {metric_name}")

        store = self._stores[metric_name]
        return await store.delete_metric(timestamp=timestamp, **match_criteria)

    def get_metric_schema(self, metric_name: str) -> dict[str, Any]:
        """Get the schema for a metric type (for API documentation/validation)"""
        if metric_name not in self._metric_types:
            raise ValueError(f"Unknown metric type: {metric_name}")

        metric_class = self._metric_types[metric_name]

        # Get Pydantic schema
        schema = metric_class.model_json_schema()

        # Add store-specific schema info
        if metric_name in self._stores:
            store = self._stores[metric_name]
            schema["parquet_schema"] = store.get_schema()

        return schema

"""
Data models for storage layer.
"""

from datetime import datetime

from pydantic import BaseModel


class DataPoint(BaseModel):
    """Model representing a data point."""

    id: str
    user_id: str
    timestamp: datetime
    value: float
    label: str
    notes: str | None = None


class TimeSpan(BaseModel):
    """Model representing a time span."""

    id: str
    user_id: str
    start_date: datetime
    end_date: datetime | None = None
    label: str
    group: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class RefuelMetric(BaseModel):
    """Model representing a refuel metric."""

    timestamp: datetime
    user_id: str
    price: float
    amount: float
    kilometers_since_last_refuel: float
    estimated_fuel_consumption: float
    notes: str | None = None
    station_id: str | None = None

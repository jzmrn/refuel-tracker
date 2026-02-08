"""
Data models for storage layer.
"""

from datetime import datetime

from pydantic import BaseModel


class RefuelMetric(BaseModel):
    """Model representing a refuel metric."""

    timestamp: datetime
    user_id: str
    car_id: str
    price: float
    amount: float
    kilometers_since_last_refuel: float
    estimated_fuel_consumption: float
    notes: str | None = None
    station_id: str | None = None


class KilometerEntry(BaseModel):
    """Model representing a kilometer entry for a car."""

    id: str
    car_id: str
    total_kilometers: float
    timestamp: datetime
    created_at: datetime
    created_by: str

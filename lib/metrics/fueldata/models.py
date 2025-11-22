from datetime import datetime, date
from pydantic import BaseModel


class PriceEntry(BaseModel):
    """Represents a price entry for a gas station."""

    timestamp: datetime
    station_id: str
    type: str
    price: float


class DailyAggregate(BaseModel):
    """Represents daily aggregated fuel price data for a station."""

    date: date
    station_id: str
    type: str
    n_samples: int
    price_mean: float
    price_min: float
    price_max: float
    price_std: float
    ts_min: datetime
    ts_max: datetime

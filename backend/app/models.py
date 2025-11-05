from datetime import UTC, datetime

from pydantic import BaseModel, Field, field_validator


class Transaction(BaseModel):
    timestamp: datetime
    account_id: str
    amount: float
    category: str
    description: str | None = None
    transaction_type: str = Field(..., description="'income', 'expense', 'transfer'")


class AccountBalance(BaseModel):
    timestamp: datetime
    account_id: str
    balance: float


class TransactionCreate(BaseModel):
    account_id: str
    amount: float
    category: str
    description: str | None = None
    transaction_type: str


class MonthlySpendingResponse(BaseModel):
    category: str
    total_spent: float
    transaction_count: int
    avg_amount: float


class MonthlySummaryResponse(BaseModel):
    income: float
    expenses: float
    net: float
    transaction_count: int


class RefuelMetricCreate(BaseModel):
    """Request model for creating a refuel entry"""

    price: float = Field(
        ..., gt=0, le=10, description="Price per liter in euros (max 10€/L)"
    )
    amount: float = Field(..., gt=0, le=100, description="Amount in liters (max 100L)")
    kilometers_since_last_refuel: float = Field(
        ..., gt=0, description="Kilometers driven since last refuel"
    )
    estimated_fuel_consumption: float = Field(
        ...,
        gt=0,
        le=20,
        description="Car's estimated fuel consumption in L/100km (max 20L/100km)",
    )
    timestamp: datetime | None = Field(
        None, description="Optional timestamp for historical entries"
    )
    notes: str | None = Field(None, description="Optional notes")

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v):
        if v is not None:
            # Get current time - handle both timezone-aware and naive datetimes
            now = datetime.now()

            # If the input datetime has timezone info, compare with timezone-aware current time
            if v.tzinfo is not None:
                # Convert current time to UTC for comparison
                now = datetime.now(UTC)
                # If v is not in UTC, convert it
                if v.tzinfo != UTC:
                    v = v.astimezone(UTC)

            if v > now:
                raise ValueError("Timestamp cannot be in the future")
        return v


class RefuelMetricResponse(BaseModel):
    """Response model for refuel entries"""

    timestamp: datetime
    price: float
    amount: float
    kilometers_since_last_refuel: float
    estimated_fuel_consumption: float
    notes: str | None = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class RefuelCostStatistics(BaseModel):
    """Cost statistics for refuel data"""

    total_cost: float
    total_liters: float
    average_price_per_liter: float
    fill_up_count: int


class RefuelPriceTrend(BaseModel):
    """Price trend data point"""

    date: str
    timestamp: datetime
    price: float
    amount: float
    total_cost: float

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class RefuelStatisticsResponse(BaseModel):
    """Combined refuel statistics"""

    cost_statistics: RefuelCostStatistics
    price_trends: list[RefuelPriceTrend]


class RefuelMonthlySummaryResponse(BaseModel):
    """Monthly summary for refuel data"""

    total_cost: float
    total_liters: float
    average_price_per_liter: float
    fill_up_count: int
    max_price: float
    min_price: float
    largest_fillup: float
    smallest_fillup: float


class DataPointCreate(BaseModel):
    """Request model for creating a data point"""

    timestamp: datetime
    value: float = Field(..., description="Numerical value to track")
    label: str = Field(
        ..., min_length=1, max_length=100, description="Label/topic for the data point"
    )
    notes: str | None = Field(None, max_length=500, description="Optional notes")

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v):
        # Get current time - handle both timezone-aware and naive datetimes
        now = datetime.now()

        # If the input datetime has timezone info, compare with timezone-aware current time
        if v.tzinfo is not None:
            # Convert current time to UTC for comparison
            now = datetime.now(UTC)
            # If v is not in UTC, convert it
            if v.tzinfo != UTC:
                v = v.astimezone(UTC)

        if v > now:
            raise ValueError("Timestamp cannot be in the future")
        return v


class DataPointResponse(BaseModel):
    """Response model for data points"""

    id: str
    timestamp: datetime
    value: float
    label: str
    notes: str | None = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class DataSummaryResponse(BaseModel):
    """Summary statistics for data points"""

    total_entries: int
    unique_labels: int
    date_range: dict[str, datetime | None]
    value_stats: dict[str, float | None]

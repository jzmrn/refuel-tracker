from datetime import UTC, datetime

from pydantic import BaseModel, Field, field_validator, model_validator


class User(BaseModel):
    """User model for authentication"""

    id: str = Field(..., description="User ID from Google OAuth")
    email: str = Field(..., description="User email from Google")
    name: str = Field(..., description="User display name")
    picture_url: str | None = Field(None, description="User profile picture URL")
    picture_base64: str | None = Field(
        None, description="User profile picture as base64 encoded string"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_login: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        return cls(
            id=data["id"],
            email=data["email"],
            name=data["name"],
            picture_url=data.get("picture_url"),
            picture_base64=data.get("picture_base64"),
            created_at=data.get("created_at", datetime.now(UTC)),
            last_login=data.get("last_login", datetime.now(UTC)),
        )


class UserCreate(BaseModel):
    """Request model for creating a user"""

    id: str
    email: str
    name: str
    picture_url: str | None = None
    picture_base64: str | None = None


class Transaction(BaseModel):
    timestamp: datetime
    user_id: str = Field(..., description="User ID who owns this transaction")
    account_id: str
    amount: float
    category: str
    description: str | None = None
    transaction_type: str = Field(..., description="'income', 'expense', 'transfer'")


class AccountBalance(BaseModel):
    timestamp: datetime
    user_id: str = Field(..., description="User ID who owns this account")
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
    user_id: str = Field(..., description="User ID who owns this refuel entry")
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
    user_id: str = Field(..., description="User ID who owns this data point")
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


class TimeSpanCreate(BaseModel):
    """Request model for creating a time span"""

    start_date: datetime = Field(..., description="Start date/time of the time span")
    end_date: datetime | None = Field(
        None, description="End date/time (optional for ongoing)"
    )
    label: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Label/activity for the time span",
    )
    group: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Group for categorizing time spans",
    )
    notes: str | None = Field(None, max_length=500, description="Optional notes")


class TimeSpanUpdate(BaseModel):
    """Request model for updating a time span"""

    start_date: datetime | None = Field(
        None, description="Start date/time of the time span"
    )
    end_date: datetime | None = Field(
        None, description="End date/time (optional for ongoing)"
    )
    label: str | None = Field(
        None,
        min_length=1,
        max_length=100,
        description="Label/activity for the time span",
    )
    group: str | None = Field(
        None, max_length=50, description="Group for categorizing time spans"
    )
    notes: str | None = Field(None, max_length=500, description="Optional notes")

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, v):
        if v is not None:
            # Convert current time to UTC for comparison if needed
            now = datetime.now()
            if v.tzinfo is not None:
                now = datetime.now(UTC)
                if v.tzinfo != UTC:
                    v = v.astimezone(UTC)

            # Allow start dates in the past and present, but not future
            if v > now:
                raise ValueError("Start date cannot be in the future")
        return v

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v):
        if v is not None:
            # Convert current time to UTC for comparison if needed
            now = datetime.now()
            if v.tzinfo is not None:
                now = datetime.now(UTC)
                if v.tzinfo != UTC:
                    v = v.astimezone(UTC)

            # End date should not be in the future
            if v > now:
                raise ValueError("End date cannot be in the future")
        return v

    @model_validator(mode="after")
    def validate_date_relationship(self):
        """Validate that end_date is after start_date"""
        if self.end_date is not None and self.start_date is not None:
            if self.end_date < self.start_date:
                raise ValueError("End date cannot be before start date")
        return self


class TimeSpanResponse(BaseModel):
    """Response model for time spans"""

    id: str
    start_date: datetime
    end_date: datetime | None = None
    user_id: str = Field(..., description="User ID who owns this time span")
    label: str
    group: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    duration_days: int | None = None
    duration_hours: int | None = None
    duration_minutes: int | None = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class TimeSpanSummaryResponse(BaseModel):
    """Summary statistics for time spans"""

    total_entries: int
    unique_labels: int
    completed_entries: int
    ongoing_entries: int
    date_range: dict[str, datetime | None]
    duration_stats: dict[str, float | None]


# Fuel Prices Models
class GasStationSearchRequest(BaseModel):
    """Request model for searching gas stations"""

    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")
    rad: float = Field(..., gt=0, le=25, description="Search radius in km (max 25)")
    fuel_type: str = Field(
        default="all", description="Fuel type: 'e5', 'e10', 'diesel', or 'all'"
    )
    sort_by: str = Field(
        default="dist", description="Sort by: 'price' or 'dist' (distance)"
    )
    open_only: bool = Field(default=True, description="Filter for open stations only")


class GasStationResponse(BaseModel):
    """Response model for gas station information"""

    id: str
    name: str
    brand: str
    street: str
    house_number: str
    post_code: int
    place: str
    lat: float
    lng: float
    dist: float | None = None
    diesel: float | None = None
    e5: float | None = None
    e10: float | None = None
    is_open: bool


class FavoriteStationCreate(BaseModel):
    """Request model for adding a favorite station"""

    station_id: str = Field(..., description="Station ID to add to favorites")


class FavoriteStationResponse(BaseModel):
    """Response model for favorite stations"""

    user_id: str
    station_id: str
    name: str | None = None
    brand: str | None = None
    street: str | None = None
    house_number: str | None = None
    post_code: int | None = None
    place: str | None = None
    lat: float | None = None
    lng: float | None = None
    current_price_e5: float | None = None
    current_price_e10: float | None = None
    current_price_diesel: float | None = None
    is_open: bool | None = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class FuelPricesSummaryResponse(BaseModel):
    """Summary statistics for fuel prices"""

    total_favorites: int
    stations_open: int
    lowest_e5_price: float | None = None
    lowest_e10_price: float | None = None
    lowest_diesel_price: float | None = None
    average_e5_price: float | None = None
    average_e10_price: float | None = None
    average_diesel_price: float | None = None

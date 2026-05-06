from datetime import UTC, datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


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


class RefuelFuelType(str, Enum):
    """Supported fuel types for refuel entries."""

    E5 = "e5"
    E10 = "e10"
    DIESEL = "diesel"


class RefuelMetricCreate(BaseModel):
    """Request model for creating a refuel entry"""

    car_id: str = Field(..., description="ID of the car being refueled")
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
    station_id: str | None = Field(
        None, description="Optional ID of the gas station where refuel occurred"
    )
    fuel_type: RefuelFuelType | None = Field(
        None,
        description="Fuel type used (e5, e10, diesel) - optional for backward compatibility",
    )

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v):
        if v is not None:
            # Ensure timezone-aware: treat naive datetimes as UTC
            if v.tzinfo is None:
                v = v.replace(tzinfo=UTC)
            else:
                # Normalize to UTC
                v = v.astimezone(UTC)

            if v > datetime.now(UTC):
                raise ValueError("Timestamp cannot be in the future")
        return v


class RefuelMetricResponse(BaseModel):
    """Response model for refuel entries"""

    timestamp: datetime
    user_id: str = Field(..., description="User ID who owns this refuel entry")
    car_id: str = Field(..., description="ID of the car that was refueled")
    price: float
    amount: float
    kilometers_since_last_refuel: float
    estimated_fuel_consumption: float
    notes: str | None = None
    station_id: str | None = Field(
        None, description="ID of the gas station where refuel occurred"
    )
    fuel_type: str | None = Field(None, description="Fuel type used (e5, e10, diesel)")
    remaining_range_km: float | None = Field(
        None,
        description="Estimated remaining range (km) based on fuel left in tank and per-entry consumption",
    )
    # Station metadata (populated from gas_station_info table)
    station_brand: str | None = Field(None, description="Brand of the gas station")
    station_place: str | None = Field(None, description="City/place of the gas station")
    station_street: str | None = Field(None, description="Street of the gas station")
    station_house_number: str | None = Field(
        None, description="House number of the gas station"
    )
    station_post_code: int | None = Field(
        None, description="Post code of the gas station"
    )

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


# Fuel Prices Models


class FuelPrice(BaseModel):
    """A single fuel price with the timestamp it was first discovered."""

    value: float | None = None
    timestamp: datetime | None = Field(
        None, description="When this price was first observed"
    )

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class FuelPrices(BaseModel):
    """Current prices for all fuel types."""

    e5: FuelPrice = Field(default_factory=FuelPrice)
    e10: FuelPrice = Field(default_factory=FuelPrice)
    diesel: FuelPrice = Field(default_factory=FuelPrice)


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


class StationDropdownItem(BaseModel):
    """Minimal station info for dropdown selection with optional prices."""

    station_id: str
    brand: str | None = None
    street: str | None = None
    house_number: str | None = None
    place: str | None = None
    prices: "FuelPrices | None" = None  # Current prices, None if unavailable or stale


class FavoriteStationsDropdownResponse(BaseModel):
    """Response model for favorite stations dropdown."""

    favorites: list[StationDropdownItem]
    closest: StationDropdownItem | None = None


class FavoriteStationCreate(BaseModel):
    """Request model for adding a favorite station"""

    station_id: str = Field(..., description="Station ID to add to favorites")


class FavoriteStation(BaseModel):
    """A single favorite station with current prices"""

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
    prices: FuelPrices = Field(default_factory=FuelPrices)
    is_open: bool | None = None
    updated_at: datetime | None = None


class FavoriteStationsResponse(BaseModel):
    """Response model for favorite stations"""

    generated_at: datetime = Field(
        description="When the backend generated this response"
    )
    stations: list[FavoriteStation] = Field(default_factory=list)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class PriceHistoryPoint(BaseModel):
    """Price history data point"""

    timestamp: datetime
    price_e5: float | None = None
    price_e10: float | None = None
    price_diesel: float | None = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class SingleFuelPriceHistoryPoint(BaseModel):
    """Price history data point for a single fuel type"""

    timestamp: datetime
    price: float | None = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class StationMetaResponse(BaseModel):
    """Response model for station meta information (without price history)"""

    station_id: str
    name: str | None = None
    brand: str | None = None
    street: str | None = None
    house_number: str | None = None
    post_code: int | None = None
    place: str | None = None
    lat: float | None = None
    lng: float | None = None
    generated_at: datetime = Field(
        description="When the backend generated this response"
    )
    prices: FuelPrices = Field(default_factory=FuelPrices)
    is_open: bool | None = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class StationPriceHistoryResponse(BaseModel):
    """Response model for station price history for a specific fuel type"""

    station_id: str
    fuel_type: str
    price_history: list[SingleFuelPriceHistoryPoint] = Field(
        default_factory=list, description="Price history for the last 24 hours"
    )

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class DailyStatsPoint(BaseModel):
    """Response model for a single daily stats data point"""

    date: datetime
    n_samples: int
    n_price_changes: int
    n_unique_prices: int
    price_mean: float
    price_min: float
    price_max: float
    n_price_increased: int | None = None
    n_price_decreased: int | None = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class StationDailyStatsResponse(BaseModel):
    """Response model for station daily statistics"""

    station_id: str
    fuel_type: str
    daily_stats: list[DailyStatsPoint] = Field(
        default_factory=list, description="Daily statistics for the requested period"
    )

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class StationDetailsResponse(BaseModel):
    """Response model for station details with current prices (deprecated - use StationMetaResponse)"""

    station_id: str
    name: str | None = None
    brand: str | None = None
    street: str | None = None
    house_number: str | None = None
    post_code: int | None = None
    place: str | None = None
    lat: float | None = None
    lng: float | None = None
    generated_at: datetime = Field(
        description="When the backend generated this response"
    )
    prices: FuelPrices = Field(default_factory=FuelPrices)
    is_open: bool | None = None
    price_history_24h: list[PriceHistoryPoint] = Field(
        default_factory=list, description="Price history for the last 24 hours"
    )

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


# Car Models
class CarCreate(BaseModel):
    """Request model for creating a car"""

    name: str = Field(
        ..., min_length=1, max_length=100, description="Car nickname/name"
    )
    year: int = Field(..., ge=1900, le=2100, description="Manufacturing year")
    fuel_tank_size: float = Field(
        ..., gt=0, le=200, description="Fuel tank size in liters (max 200L)"
    )
    fuel_type: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Fuel type (e.g., Petrol, Diesel, Electric, Hybrid)",
    )
    shared_user_ids: list[str] = Field(
        default_factory=list, description="User IDs to share the car with"
    )


class CarUpdate(BaseModel):
    """Request model for updating a car"""

    name: str | None = Field(
        None, min_length=1, max_length=100, description="Car nickname/name"
    )
    year: int | None = Field(None, ge=1900, le=2100, description="Manufacturing year")
    fuel_tank_size: float | None = Field(
        None, gt=0, le=200, description="Fuel tank size in liters (max 200L)"
    )
    fuel_type: str | None = Field(
        None,
        min_length=1,
        max_length=50,
        description="Fuel type (e.g., Petrol, Diesel, Electric, Hybrid)",
    )
    shared_user_ids: list[str] = Field(
        default_factory=list, description="User IDs to share the car with"
    )


class CarResponse(BaseModel):
    """Response model for car"""

    id: str
    owner_user_id: str
    owner_name: str | None = None  # Owner's display name
    name: str
    year: int
    fuel_tank_size: float
    fuel_type: str | None = None  # Fuel type (optional for backward compatibility)
    created_at: datetime
    is_owner: bool = True
    shared_by: str | None = None  # User name who shared this car (if not owner)
    shared_users: list["CarAccessUser"] = Field(
        default_factory=list, description="Users who have access to this car"
    )
    refuel_count: int = 0  # Number of refuel entries for this car

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class CarAccessUser(BaseModel):
    """User with access to a car"""

    user_id: str
    user_name: str
    user_email: str
    granted_at: datetime
    granted_by_user_id: str

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class CarShareRequest(BaseModel):
    """Request model for sharing a car"""

    user_id: str = Field(..., description="User ID to share the car with")


class UserSearchResponse(BaseModel):
    """Response model for user search"""

    id: str
    name: str
    email: str


class CarStatistics(BaseModel):
    """Statistics for a specific car"""

    car_id: str
    total_refuels: int
    total_distance: float
    total_fuel: float
    total_cost: float
    average_consumption: float
    average_price_per_liter: float
    first_refuel: datetime | None = None
    last_refuel: datetime | None = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


# Kilometer Entry Models
class KilometerEntryCreate(BaseModel):
    """Request model for creating a kilometer entry"""

    car_id: str = Field(..., description="ID of the car")
    total_kilometers: float = Field(
        ..., gt=0, description="Total kilometers on the odometer"
    )
    timestamp: datetime | None = Field(
        None, description="Optional timestamp for historical entries"
    )

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v):
        if v is not None:
            # Ensure timezone-aware: treat naive datetimes as UTC
            if v.tzinfo is None:
                v = v.replace(tzinfo=UTC)
            else:
                v = v.astimezone(UTC)

            if v > datetime.now(UTC):
                raise ValueError("Timestamp cannot be in the future")
        return v


class KilometerEntryResponse(BaseModel):
    """Response model for kilometer entries"""

    id: str
    car_id: str = Field(..., description="ID of the car")
    total_kilometers: float
    timestamp: datetime
    created_at: datetime
    created_by: str = Field(..., description="User ID who created this entry")

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class KilometerPeriodAggregate(BaseModel):
    """Aggregated kilometers driven in a period, computed via interpolation"""

    period_start: str = Field(..., description="ISO date string of the period start")
    kilometers_driven: float = Field(
        ..., description="Kilometers driven during this period"
    )


class KilometerEntriesResponse(BaseModel):
    """Response model wrapping kilometer entries with optional aggregates"""

    entries: list[KilometerEntryResponse]
    aggregates: list[KilometerPeriodAggregate] | None = None


# Monthly Statistics Models
class AvailableMonth(BaseModel):
    """A single available month for statistics"""

    date: str = Field(..., description="Date string in YYYY-MM-DD format")


class MonthlyBrandAggregateResponse(BaseModel):
    """Monthly aggregated fuel price data per brand"""

    brand: str
    price_mean: float
    price_min: float
    price_max: float
    n_stations: int
    n_price_changes: int
    n_price_increased: int | None = None
    n_price_decreased: int | None = None


class MonthlyPlaceAggregateResponse(BaseModel):
    """Monthly aggregated fuel price data per place"""

    place: str
    post_code: int
    price_mean: float
    price_min: float
    price_max: float
    n_stations: int
    n_price_increased: int | None = None
    n_price_decreased: int | None = None


class PlaceDetailAggregateResponse(BaseModel):
    """Monthly aggregated fuel price data per place with full detail fields."""

    date: str
    place: str
    post_code: int
    price_mean: float
    price_min: float
    price_max: float
    price_std: float | None = None
    n_stations: int
    n_price_changes: int
    n_unique_prices: int
    n_days: int
    n_price_increased: int | None = None
    n_price_decreased: int | None = None
    price_changes_per_station_day: float
    unique_prices_per_station_day: float
    price_increased_per_station_day: float | None = None
    price_decreased_per_station_day: float | None = None


class BrandDetailAggregateResponse(BaseModel):
    """Monthly aggregated fuel price data per brand with full detail fields."""

    date: str
    brand: str
    price_mean: float
    price_min: float
    price_max: float
    price_std: float | None = None
    n_stations: int
    n_price_changes: int
    n_unique_prices: int
    n_days: int
    n_price_increased: int | None = None
    n_price_decreased: int | None = None
    price_changes_per_station_day: float
    unique_prices_per_station_day: float
    price_increased_per_station_day: float | None = None
    price_decreased_per_station_day: float | None = None


class MonthlyStationAggregateResponse(BaseModel):
    """Monthly aggregated fuel price data per station (enriched with metadata)"""

    station_id: str
    station_name: str | None = None
    brand: str | None = None
    street: str | None = None
    house_number: str | None = None
    place: str | None = None
    price_mean: float
    price_min: float
    price_max: float
    n_price_changes: int
    n_price_increased: int | None = None
    n_price_decreased: int | None = None


class StationDetailAggregateResponse(BaseModel):
    """Monthly aggregated fuel price data per station with full detail fields."""

    date: str
    station_id: str
    station_name: str | None = None
    brand: str | None = None
    place: str | None = None
    price_mean: float
    price_min: float
    price_max: float
    price_std: float | None = None
    n_stations: int
    n_price_changes: int
    n_unique_prices: int
    n_days: int
    n_price_increased: int | None = None
    n_price_decreased: int | None = None
    price_changes_per_station_day: float
    unique_prices_per_station_day: float
    price_increased_per_station_day: float | None = None
    price_decreased_per_station_day: float | None = None


class DailyPricePoint(BaseModel):
    """A single day's average prices for all fuel types at a station."""

    date: str
    e5: float | None = None
    e10: float | None = None
    diesel: float | None = None


class StationDailyPricesResponse(BaseModel):
    """Response model for daily prices of all fuel types at a station."""

    station_id: str
    days: list[DailyPricePoint] = Field(default_factory=list)


class ComparisonDailyPoint(BaseModel):
    """A single day's average price for one entity in a comparison."""

    date: str
    price_mean: float


class StationComparisonSeries(BaseModel):
    """A named series of daily price data for the comparison chart."""

    label: str
    data: list[ComparisonDailyPoint] = Field(default_factory=list)


class StationComparisonResponse(BaseModel):
    """Response model for station vs place vs brand daily price comparison."""

    station_id: str
    fuel_type: str
    station: StationComparisonSeries
    place: StationComparisonSeries
    brand: StationComparisonSeries

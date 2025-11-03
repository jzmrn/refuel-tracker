from datetime import datetime
from pydantic import BaseModel, Field


class Unit(BaseModel):
    id: str  # Unique identifier for the unit
    name: str  # Human-readable name (e.g., "Currency", "Percentage")
    symbol: str  # Display symbol (e.g., "$", "%", "kg")
    type: str  # Data type: "text", "number", "boolean"
    description: str | None = None
    created_at: datetime
    updated_at: datetime


class UnitCreate(BaseModel):
    name: str
    symbol: str
    type: str = Field(..., description="'text', 'number', 'boolean'")
    description: str | None = None


class UnitUpdate(BaseModel):
    name: str | None = None
    symbol: str | None = None
    type: str | None = None
    description: str | None = None


class Category(BaseModel):
    id: str  # Unique identifier for the category
    name: str  # Category name (e.g., "Health", "Fitness", "Finance")
    description: str | None = None
    color: str | None = None  # Hex color code for UI (e.g., "#3B82F6")
    created_at: datetime
    updated_at: datetime


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None
    color: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None


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


class MetricFieldDefinition(BaseModel):
    name: str
    unit_id: str  # References Unit.id
    required: bool = True
    default_value: str | int | float | bool | None = None
    description: str | None = None


class MetricDefinition(BaseModel):
    id: str  # Unique identifier for the metric definition
    title: str
    description: str | None = None
    category_id: str  # References Category.id
    fields: list[MetricFieldDefinition]
    created_at: datetime
    updated_at: datetime


class MetricDefinitionCreate(BaseModel):
    title: str
    description: str | None = None
    category_id: str  # References Category.id
    fields: list[MetricFieldDefinition]


class MetricDefinitionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category_id: str | None = None
    fields: list[MetricFieldDefinition] | None = None


class Metric(BaseModel):
    timestamp: datetime
    metric_id: str  # The ID of the metric definition
    metric_name: str  # Will be populated from MetricDefinition.title
    category: (
        str  # Will be populated from MetricDefinition.category_id or category name
    )
    data: dict[str, str | int | float | bool]  # Field values
    notes: str | None = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class TransactionCreate(BaseModel):
    account_id: str
    amount: float
    category: str
    description: str | None = None
    transaction_type: str


class MetricCreate(BaseModel):
    metric_id: str  # References MetricDefinition.id
    data: dict[str, str | int | float | bool]
    notes: str | None = None


class MetricSummaryResponse(BaseModel):
    total_metrics: int
    categories: int
    recent_count: int
    most_recent_date: datetime | None = None


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

    price: float = Field(..., gt=0, description="Price per liter in euros")
    amount: float = Field(..., gt=0, description="Amount in liters")
    notes: str | None = Field(None, description="Optional notes")


class RefuelMetricResponse(BaseModel):
    """Response model for refuel entries"""

    timestamp: datetime
    price: float
    amount: float
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

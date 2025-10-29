from datetime import datetime
from pydantic import BaseModel, Field


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
    type: str = Field(..., description="'text', 'number', 'boolean'")
    required: bool = True
    default_value: str | int | float | bool | None = None
    description: str | None = None


class MetricDefinition(BaseModel):
    id: str  # Unique identifier for the metric definition
    title: str
    description: str | None = None
    category: str
    unit: str | None = None
    fields: list[MetricFieldDefinition]
    created_at: datetime
    updated_at: datetime


class MetricDefinitionCreate(BaseModel):
    title: str
    description: str | None = None
    category: str
    unit: str | None = None
    fields: list[MetricFieldDefinition]


class MetricDefinitionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    unit: str | None = None
    fields: list[MetricFieldDefinition] | None = None


class Metric(BaseModel):
    timestamp: datetime
    metric_name: str  # Will be populated from MetricDefinition.title
    category: str  # Will be populated from MetricDefinition.category
    data: dict[str, str | int | float | bool]  # Field values
    notes: str | None = None


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

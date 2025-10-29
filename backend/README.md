# Personal Data Tracker - Backend

A high-performance FastAPI backend with Parquet-based storage for personal finance and metrics tracking.

## 🏗️ Architecture

- **Framework**: FastAPI with async support
- **Storage**: Parquet files with Polars for data processing
- **Data Organization**: Time-partitioned files for optimal query performance
- **Validation**: Pydantic models for type safety
- **Backup**: Automated backup system

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- UV package manager

### Installation

```bash
# Install UV if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync --group dev

# Start development server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Using Justfile (from project root)
```bash
# Install dependencies
just install

# Start backend only
just dev-backend

# Run tests
just test

# Format code
just format
```

## 📊 Data Storage

### Parquet File Structure
```
data/
├── transactions/
│   ├── year=2024/
│   │   ├── month=01/
│   │   │   ├── transactions_2024-01-01_2024-01-07.parquet
│   │   │   └── transactions_2024-01-08_2024-01-14.parquet
│   │   └── month=02/
│   └── year=2025/
├── account_balances/
│   ├── daily_snapshots_2024-01.parquet
│   └── daily_snapshots_2024-02.parquet
├── metrics/
│   └── metrics_2024-01.parquet
└── metadata/
    └── schemas.json
```

### Benefits
- **90%+ compression** compared to JSON
- **Columnar storage** for fast aggregations
- **Predicate pushdown** - only reads relevant data
- **Cross-platform** compatibility

## 🔌 API Endpoints

### Health & Status
- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /backup` - Create manual backup

### Transactions
- `POST /transactions/` - Add single transaction
- `GET /transactions/` - Query transactions with filters
- `POST /transactions/bulk` - Add multiple transactions

### Analytics
- `GET /analytics/spending-by-category` - Spending by category
- `GET /analytics/monthly-summary/{year}/{month}` - Monthly summary
- `GET /analytics/account-balance-history/{account_id}` - Balance history

### API Documentation
Visit http://localhost:8000/docs for interactive Swagger documentation.

## 🗃️ Data Models

### Transaction
```python
{
    "timestamp": "2024-01-15T10:30:00Z",
    "account_id": "checking",
    "amount": 50.00,
    "category": "groceries",
    "description": "Weekly grocery shopping",
    "transaction_type": "expense"  # "income", "expense", "transfer"
}
```

### Account Balance
```python
{
    "timestamp": "2024-01-15T23:59:59Z",
    "account_id": "checking", 
    "balance": 1250.50
}
```

### Metric
```python
{
    "timestamp": "2024-01-15T10:00:00Z",
    "metric_type": "car_kilometers",
    "value": 152340.5,
    "unit": "km",
    "metadata": {"vehicle": "toyota_prius"}
}
```

## 🛠️ Development

### Project Structure
```
app/
├── main.py              # FastAPI application entry point
├── models.py            # Pydantic data models
├── storage/
│   ├── parquet_store.py # Main storage implementation
│   └── backup_manager.py # Backup functionality
├── api/
│   ├── transactions.py  # Transaction endpoints
│   └── analytics.py     # Analytics endpoints
└── utils/
    └── date_helpers.py  # Utility functions
```

### Commands

```bash
# Development server with hot reload
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=app --cov-report=html

# Format code
uv run black app/

# Lint code
uv run ruff app/

# Type checking
uv run mypy app/
```

### Environment Variables

- `DATA_PATH`: Path to store Parquet files (default: `data`)
- `BACKUP_PATH`: Path to store backups (default: `backups`)

## 🔧 Configuration

### Development
Create `.env` file in backend directory:
```env
DATA_PATH=./data
BACKUP_PATH=./backups
```

### Production
```env
DATA_PATH=/app/data
BACKUP_PATH=/app/backups
```

## 🧪 Testing

### Run Tests
```bash
# All tests
uv run pytest

# Specific test file
uv run pytest tests/test_parquet_store.py

# With verbose output
uv run pytest -v

# With coverage
uv run pytest --cov=app
```

### Test Structure
```
tests/
├── test_main.py           # API endpoint tests
├── test_parquet_store.py  # Storage layer tests
├── test_models.py         # Data model tests
└── conftest.py           # Test configuration
```

## 📦 Docker

### Build Image
```bash
docker build -t personal-data-tracker-backend .
```

### Run Container
```bash
docker run -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  personal-data-tracker-backend
```

## 🔒 Security Considerations

- **Input Validation**: All inputs validated with Pydantic
- **CORS Protection**: Configured for frontend origins
- **No External Database**: Reduces attack surface
- **File-based Storage**: Easy to backup and secure

## 📈 Performance

### Expected Performance
- **Writes**: 10,000+ transactions/second
- **Reads**: Millions of rows scanned in milliseconds
- **Storage**: ~1MB per 10,000 transactions (compressed)
- **Memory**: Low memory footprint with lazy loading

### Optimization Tips
- Use date range filters for large datasets
- Batch transactions when possible
- Monitor file sizes in data directory
- Regular backups to prevent data loss

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

**UV not found:**
```bash
# Install UV
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc  # or ~/.zshrc
```

**Permission errors:**
```bash
# Fix data directory permissions
chmod -R 755 data/
chmod -R 755 backups/
```

**Import errors:**
```bash
# Ensure proper Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

## 🤝 Contributing

1. Make changes to the code
2. Run tests: `uv run pytest`
3. Format code: `uv run black app/`
4. Lint code: `uv run ruff app/`
5. Check types: `uv run mypy app/`

## 📝 API Examples

### Add Transaction
```bash
curl -X POST "http://localhost:8000/transactions/" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "checking",
    "amount": 50.00,
    "category": "groceries",
    "transaction_type": "expense"
  }'
```

### Query Transactions
```bash
# Recent transactions
curl "http://localhost:8000/transactions/?limit=10"

# Transactions by date range
curl "http://localhost:8000/transactions/?start_date=2024-01-01&end_date=2024-01-31"

# Transactions by category
curl "http://localhost:8000/transactions/?category=groceries"
```

### Get Analytics
```bash
# Monthly summary
curl "http://localhost:8000/analytics/monthly-summary/2024/1"

# Spending by category
curl "http://localhost:8000/analytics/spending-by-category?start_date=2024-01-01&end_date=2024-01-31"
```
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

```sh
data/
├── data_points/
│   ├── year=2024/
│   │   ├── month=01/
│   │   │   ├── data_points_2024-01-01_2024-01-07.parquet
│   │   │   └── data_points_2024-01-08_2024-01-14.parquet
│   │   └── month=02/
│   └── year=2025/
├── time_spans/
│   ├── time_spans_2024-01.parquet
│   └── time_spans_2024-02.parquet
├── metrics/
│   └── refuel/
│       └── refuel_2024-01.parquet
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

### Data Points

- `POST /api/data-points/` - Add single data point
- `GET /api/data-points/` - Query data points with filters
- `DELETE /api/data-points/{id}` - Delete data point

### Refuel Tracking

- `POST /api/metrics/refuel` - Add refuel entry
- `GET /api/metrics/refuel` - Query refuel data
- `GET /api/metrics/refuel/statistics` - Get fuel statistics

### Time Spans

- `POST /api/time-spans/` - Add time span
- `GET /api/time-spans/` - Query time spans
- `PUT /api/time-spans/{id}` - Update time span
- `DELETE /api/time-spans/{id}` - Delete time span

### API Documentation

Visit the interactive [Swagger documentation](http://localhost:8000/docs).

## 🗃️ Data Models

### Data Point

```python
{
    "timestamp": "2024-01-15T10:30:00Z",
    "label": "weight",
    "value": 75.5,
    "notes": "Morning measurement"
}
```

### Refuel Metric

```python
{
    "timestamp": "2024-01-15T10:00:00Z",
    "price": 1.589,
    "amount": 45.2,
    "kilometers_since_last_refuel": 450,
    "estimated_fuel_consumption": 7.5,
    "notes": "Shell station"
}
```

### Time Span

```python
{
    "start_date": "2024-01-15T09:00:00Z",
    "end_date": "2024-01-15T17:30:00Z",
    "label": "Work",
    "group": "Professional",
    "notes": "Regular work day"
    "unit": "km",
    "metadata": {"vehicle": "toyota_prius"}
}
```

## 🛠️ Development

### Project Structure

```sh
app/
├── main.py              # FastAPI application entry point
├── models.py            # Pydantic data models
├── storage/
│   ├── parquet_store.py # Main storage implementation
│   └── backup_manager.py # Backup functionality
├── api/
│   ├── data_points.py   # Data tracking endpoints
│   ├── refuels.py       # Refuel tracking endpoints
│   ├── time_spans.py    # Time span endpoints
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

```sh
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

- **Writes**: 10,000+ records/second
- **Reads**: Millions of rows scanned in milliseconds
- **Storage**: ~1MB per 10,000 records (compressed)
- **Memory**: Low memory footprint with lazy loading

### Optimization Tips

- Use date range filters for large datasets
- Batch data operations when possible
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

### Add Data Point

```bash
curl -X POST "http://localhost:8000/api/data-points/" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "weight",
    "value": 75.5,
    "timestamp": "2024-01-15T08:00:00Z",
    "notes": "Morning measurement"
  }'
```

### Query Data Points

```bash
# Recent data points
curl "http://localhost:8000/api/data-points/?limit=10"

# Data points by date range
curl "http://localhost:8000/api/data-points/?start_date=2024-01-01&end_date=2024-01-31"

# Data points by label
curl "http://localhost:8000/api/data-points/?label=weight"
```

### Add Refuel Entry

```bash
# Add refuel entry
curl -X POST "http://localhost:8000/api/metrics/refuel" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 1.589,
    "amount": 45.2,
    "kilometers_since_last_refuel": 450,
    "estimated_fuel_consumption": 7.5
  }'

# Get refuel statistics
curl "http://localhost:8000/api/metrics/refuel/statistics"
```

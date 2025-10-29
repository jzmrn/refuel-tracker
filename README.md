# Personal Data Tracker

A modern, self-hosted personal finance and metrics tracking application built with **Parquet-based storage** for maximum performance and data ownership.

## 🎯 Features

- **Financial Tracking**: Track income, expenses, and transfers across multiple accounts
- **Metrics Tracking**: Monitor any quantifiable data (car kilometers, weight, etc.)
- **Fast Analytics**: Lightning-fast queries thanks to Parquet columnar storage
- **Data Visualization**: Beautiful charts and graphs for insights
- **File-based Storage**: No database server required - your data stays in portable files
- **REST API**: Full-featured API for data access and manipulation
- **Modern UI**: Responsive web interface built with Next.js and Tailwind CSS
- **Docker Ready**: Easy deployment with Docker Compose

## 🏗️ Architecture

### Backend (Python)
- **FastAPI**: High-performance async API framework
- **Polars**: Blazing fast data processing library
- **Parquet Storage**: Columnar file format for efficient storage and querying
- **Pydantic**: Data validation and serialization

### Frontend (Next.js)
- **React 18**: Modern UI framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Beautiful data visualizations

### Storage Strategy
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
├── metrics/
└── metadata/
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- OR Python 3.11+ and Node.js 18+

### Option 1: Docker Compose (Recommended)

1. **Clone or download the project structure**
   ```bash
   cd /Users/janzimmermann/Developer/privat/personal-data-tracker
   ```

2. **Start the application**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Option 2: Development Setup

#### Backend Setup
```bash
cd backend

# Install dependencies with UV (recommended)
uv sync --group dev

# Or with pip
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Start the backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Or with pip
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📊 Usage Examples

### Adding Transactions via API

```bash
# Add an expense
curl -X POST "http://localhost:8000/transactions/" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "checking",
    "amount": 50.00,
    "category": "groceries",
    "description": "Weekly grocery shopping",
    "transaction_type": "expense"
  }'

# Add income
curl -X POST "http://localhost:8000/transactions/" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "checking",
    "amount": 3000.00,
    "category": "salary",
    "description": "Monthly salary",
    "transaction_type": "income"
  }'
```

### Querying Data

```bash
# Get recent transactions
curl "http://localhost:8000/transactions/?limit=10"

# Get transactions for a specific month
curl "http://localhost:8000/transactions/?start_date=2024-01-01&end_date=2024-01-31"

# Get monthly summary
curl "http://localhost:8000/analytics/monthly-summary/2024/1"

# Get spending by category
curl "http://localhost:8000/analytics/spending-by-category?start_date=2024-01-01&end_date=2024-01-31"
```

## 🛠️ Development

### Backend Development

```bash
cd backend

# Install development dependencies
uv sync --group dev

# Run tests
uv run pytest

# Format code
uv run black app/
uv run ruff app/

# Type checking
uv run mypy app/
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run type checking
npm run type-check

# Lint code
npm run lint
```

### Project Structure
```
personal-data-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── models.py            # Pydantic models
│   │   ├── storage/
│   │   │   ├── parquet_store.py # Main storage implementation
│   │   │   └── backup_manager.py # Backup functionality
│   │   ├── api/
│   │   │   ├── transactions.py  # Transaction endpoints
│   │   │   └── analytics.py     # Analytics endpoints
│   │   └── utils/
│   │       └── date_helpers.py  # Utility functions
│   ├── pyproject.toml           # Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/              # Next.js pages
│   │   └── lib/
│   │       └── api.ts          # API client
│   ├── package.json
│   └── Dockerfile
├── data/                       # Parquet files (created automatically)
├── backups/                   # Automatic backups
├── docker-compose.yml
└── README.md
```

## 🔧 Configuration

### Environment Variables

**Backend:**
- `DATA_PATH`: Path to store Parquet files (default: `data`)
- `BACKUP_PATH`: Path to store backups (default: `backups`)

**Frontend:**
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: `http://localhost:8000`)

### Docker Compose Override

Create `docker-compose.override.yml` for custom configuration:

```yaml
version: '3.8'
services:
  backend:
    volumes:
      - /custom/data/path:/app/data
      - /custom/backup/path:/app/backups
    environment:
      - CUSTOM_ENV_VAR=value
```

## 💾 Data Management

### Backup and Restore

**Manual Backup:**
```bash
# Create backup via API
curl -X POST "http://localhost:8000/backup"

# Or copy data directory
cp -r data/ backup-$(date +%Y%m%d)/
```

**Restore:**
```bash
# Stop services
docker-compose down

# Restore data
cp -r backup-20241001/ data/

# Restart services
docker-compose up
```

### Data Migration

Since data is stored in portable Parquet files, migration is simple:
1. Stop the application
2. Copy the `data/` directory to the new location
3. Update `DATA_PATH` environment variable
4. Restart the application

## 📈 Performance

### Parquet Benefits
- **90%+ compression** compared to JSON/CSV
- **Column-oriented** storage for fast aggregations
- **Predicate pushdown** - only reads relevant data
- **Cross-platform** compatibility

### Expected Performance
- **Writes**: 10,000+ transactions/second
- **Reads**: Millions of rows scanned in milliseconds
- **Storage**: ~1MB per 10,000 transactions (compressed)

## 🔒 Security

- **No external database** - reduces attack surface
- **File-based storage** - easy to backup and secure
- **CORS protection** configured
- **Input validation** via Pydantic models
- **No sensitive data** stored in configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Troubleshooting

### Common Issues

**Backend won't start:**
- Check Python version (3.11+ required)
- Verify all dependencies are installed
- Check port 8000 isn't already in use

**Frontend build fails:**
- Check Node.js version (18+ required)
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and reinstall

**Data not persisting:**
- Check Docker volume mounts
- Verify `DATA_PATH` environment variable
- Check file permissions

**Performance issues:**
- Monitor file sizes in `data/` directory  
- Consider partitioning strategy for large datasets
- Check available disk space

### Getting Help

1. Check the API documentation at http://localhost:8000/docs
2. Review application logs: `docker-compose logs`
3. Check GitHub issues
4. Monitor system resources (CPU, memory, disk)

## 🎯 Future Enhancements

- [ ] Native macOS app with Tauri
- [ ] Advanced analytics and forecasting
- [ ] Data import/export tools
- [ ] Multi-user support
- [ ] Mobile app
- [ ] Advanced visualization dashboards
- [ ] Budget planning and alerts
- [ ] Receipt scanning and OCR
# Analytics Pipeline

Dagster-based data pipeline for fetching and processing fuel price data from the Tankerkönig API.

## Overview

This pipeline consists of two main assets:

1. **`raw_fuel_prices`** (Unpartitioned): Fetches live fuel prices from Tankerkönig API

   - Runs every 10 minutes (cron: `3-53/10 * * * *`)
   - Appends timestamped data to DuckDB
   - Tracks E5, E10, and Diesel prices for specified gas stations

2. **`daily_aggregates`** (Daily Partitioned): Computes daily statistics from raw data
   - Runs daily at 6:00 AM (cron: `0 6 * * *`)
   - Calculates mean, min, max, std, and sample counts per station and fuel type
   - Partitioned by day starting from 2025-11-01

## Configuration

Set the following environment variables:

- `DATA_OUTPUT_PATH`: Path where DuckDB database will be stored (e.g., `/data/analytics` or `$(pwd)/data`)
- `TANKERKOENIG_API_KEY`: API key for Tankerkönig service
- `DAGSTER_HOME`: Path for Dagster instance storage (logs, runs, schedules)

## Development

### Docker (Production-like)

The pipeline is containerized and runs as part of the docker-compose stack:

```bash
just up  # Starts all services including Dagster
```

### Local Development (Recommended)

For faster development without Docker:

**Prerequisites:**

- Python 3.11+ (tested with Python 3.14.0)
- uv package manager

**Quick Start:**

```bash
# Install dependencies
just install-analytics

# Start Dagster development server
just dev-analytics
```

Then open <http://localhost:3000> in your browser to access the Dagster UI.

**Manual Setup (Alternative):**

```bash
cd analytics
uv sync
source .env.local
uv run dagster dev
```

**Environment Variables (Local):**

- `DAGSTER_HOME`: Points to `./home` for local storage
- `DATA_PATH`: Points to `./data` for DuckDB database output
- `TANKERKOENIG_API_KEY`: Your Tankerkönig API key

**Local Storage Structure:**

```text
analytics/
├── home/                  # Local Dagster instance storage (DAGSTER_HOME)
│   ├── storage/          # SQLite database and run metadata
│   └── logs/             # Compute logs
├── data/                 # Data output directory (DATA_PATH)
│   └── fueldata.duckdb  # DuckDB database with fuel prices
├── dagster.yaml         # Instance configuration
└── workspace.yaml       # Code location configuration
```

**Verification:**

1. After starting `just dev-analytics`, you should see:

   - Assets loaded: `raw_fuel_prices`, `daily_aggregates`
   - Schedules available: `fetch_fuel_prices`, `daily_aggregates`
   - No errors in the console output

2. In the Dagster UI:
   - Navigate to Assets tab
   - You should see: `raw_fuel_prices` (unpartitioned), `daily_aggregates` (partitioned)
   - Click "Materialize" on `raw_fuel_prices` to fetch current fuel prices
   - Click "Materialize" on `daily_aggregates` to compute statistics for a specific day

**Troubleshooting:**

- If you get import errors, verify that the `tankerkoenig` and `metrics` packages from `lib/` are properly installed
- If storage errors occur, verify `DAGSTER_HOME` points to the correct local directory
- Ensure `TANKERKOENIG_API_KEY` is set in your environment
- Check that the `data/` directory exists for DuckDB output

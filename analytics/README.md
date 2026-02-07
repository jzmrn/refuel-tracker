# Refuel Tracker - Analytics Pipeline

Dagster-based data pipeline for fetching, compressing, and aggregating fuel price data from the [Tankerkönig API](https://creativecommons.tankerkoenig.de).

## Overview

Three assets form a linear pipeline in the `fuel` group:

1. **`raw_fuel_prices`** (unpartitioned) — Fetches live E5, E10, and Diesel prices for all favorite stations from the Tankerkönig API and appends them to DuckDB. Runs every 10 minutes.

2. **`compressed_fuel_prices`** (daily partitioned) — Transforms raw wide-format data into long format (one row per station/fuel type) and deduplicates consecutive identical prices, typically achieving ~80% compression. Runs daily at 6:00 AM for the previous day.

3. **`daily_aggregates`** (daily partitioned) — Computes per-station, per-fuel-type daily statistics (mean, min, max, std, sample count, unique prices) from compressed data. Runs daily at 7:00 AM for the previous day.

A cleanup job runs daily at 8:00 AM to delete raw data older than 28 days, but only for dates where compression has been verified.

### Schedules

| Schedule                 | Cron              | Description                                            |
| ------------------------ | ----------------- | ------------------------------------------------------ |
| `fetch_fuel_prices`      | `3-53/10 * * * *` | Fetch live prices every 10 minutes                     |
| `compressed_fuel_prices` | `0 6 * * *`       | Compress yesterday's raw data                          |
| `daily_aggregates`       | `0 7 * * *`       | Aggregate yesterday's compressed data                  |
| `cleanup_raw_fuel_data`  | `0 8 * * *`       | Delete stale raw data (>28 days, compression verified) |

### IO Managers

Custom IO managers handle reading/writing to DuckDB with partition-aware filtering:

- `RawFuelPriceDataIOManager` — Appends raw data on output, filters by time window on input
- `CompressedFuelPriceDataIOManager` — Stores/reads compressed price change records
- `DailyFuelPriceAggregatesIOManager` — Stores/reads daily aggregate statistics

All IO managers use shared clients from the `metrics` (fueldata) library.

## Configuration

### Environment Variables

| Variable               | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `DATA_OUTPUT_PATH`     | Directory containing `fueldata.duckdb`           |
| `TANKERKOENIG_API_KEY` | API key for Tankerkönig                          |
| `DAGSTER_HOME`         | Dagster instance storage (logs, runs, schedules) |

## Development

### Local Development

```bash
cd analytics
uv sync
dagster dev
```

Or from the project root:

```bash
just dev-analytics
```

Then open <http://localhost:3000> to access the Dagster UI.

### Docker

The pipeline runs as part of the analytics Docker Compose stack:

```bash
just up analytics
```

Dagster is accessible at <http://localhost:8080> via Envoy proxy.

### Local Storage Layout

```text
analytics/
├── home/             # DAGSTER_HOME
│   ├── storage/      # Run metadata (SQLite)
│   └── logs/         # Compute logs
├── data/             # DATA_OUTPUT_PATH (local dev only)
│   └── fueldata.duckdb
├── dagster.yaml      # Instance config (SQLite storage, local logs)
└── workspace.yaml    # Code location: pipeline module
```

### Verification

After starting `dagster dev`:

1. Assets tab should show `raw_fuel_prices`, `compressed_fuel_prices`, and `daily_aggregates`
2. Schedules tab should list all four schedules
3. Materialize `raw_fuel_prices` to fetch current prices
4. Materialize `compressed_fuel_prices` and `daily_aggregates` for a specific partition date

### Troubleshooting

- **Import errors** — Verify that `tankerkoenig-client` and `metrics` packages from `lib/` are installed (they're referenced as path dependencies in `pyproject.toml`)
- **Storage errors** — Check that `DAGSTER_HOME` and `DATA_OUTPUT_PATH` point to existing directories
- **Empty results** — Ensure favorite stations are configured in the app before running the pipeline

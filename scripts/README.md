# Scripts

One-time data migration from DuckDB (v1.x) to SQLite + Parquet (v2.0.0).

## Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager
- The v1.x DuckDB files (`userdata.duckdb`, `fueldata.duckdb`) in the `data/` directory

## Structure

```text
scripts/
├── pyproject.toml          # Python project with migration dependencies
└── migrations/
    └── 000_import_from_duckdb.py
```

## What It Does

`000_import_from_duckdb.py` creates all SQLite tables and imports data from the legacy DuckDB databases in a single run:

1. **Creates tables & indexes** in `userdata.sqlite` and `fueldata.sqlite`
2. **Imports from `userdata.duckdb`** → users, cars, car_access, refuel_metrics, kilometer_entries
3. **Imports from `fueldata.duckdb`** → favorite_stations, gas_station_info into `userdata.sqlite`
4. **Imports from `fueldata.duckdb`** → fuel_prices into `fueldata.sqlite` (chunked, 50k rows)
5. **Exports Parquet from `fueldata.duckdb`** → compressed_fuel_prices and daily_aggregates as Hive-partitioned Parquet

If no `.duckdb` files are found, it creates the empty tables and exits. Safe to re-run.

## Execution

```bash
cd scripts
uv sync
uv run python migrations/000_import_from_duckdb.py --data-dir ../data
```

## Docker

Build the image from the **repository root** (the build context needs access to `lib/metrics`):

```bash
docker build -t refuel-scripts -f scripts/Dockerfile .
```

Run migration 000 by mounting the directory that contains the `.duckdb` files:

```bash
docker run --rm -v /path/to/data:/data refuel-scripts migrations/000_import_from_duckdb.py --data-dir /data
```

The container expects to find `userdata.duckdb` and/or `fueldata.duckdb` inside the
mounted directory. Output files (`*.sqlite`, Parquet partitions) are written to the
same directory. After a successful run the original `.duckdb` files are renamed to
`.duckdb.migrated`.

## Notes

- Datetime values are normalized to UTC ISO 8601 format (`YYYY-MM-DDTHH:MM:SSZ`) during migration.
- The original `.duckdb` files are not modified (opened read-only).
- Uses `CREATE TABLE IF NOT EXISTS` and `INSERT OR REPLACE`, so it's idempotent.

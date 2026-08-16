# Scripts

Data migration and reference dataset extraction scripts.

## Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager
- The v1.x DuckDB files (`userdata.duckdb`, `fueldata.duckdb`) in the `data/` directory (migration only)

## Structure

```text
scripts/
├── pyproject.toml          # Python project with script dependencies
├── migrations/
│   └── 000_import_from_duckdb.py
└── places/
    └── extract_places.py
```

## Migration (`migrations/000_import_from_duckdb.py`)

One-time data migration from DuckDB (v1.x) to SQLite + Parquet (v2.0.0).
It creates all SQLite tables and imports data from the legacy DuckDB databases in a single run:

1. **Creates tables & indexes** in `userdata.sqlite` and `fueldata.sqlite`
2. **Imports from `userdata.duckdb`** → users, cars, car_access, refuel_metrics, kilometer_entries
3. **Imports from `fueldata.duckdb`** → favorite_stations, gas_station_info into `userdata.sqlite`
4. **Imports from `fueldata.duckdb`** → fuel_prices into `fueldata.sqlite` (chunked, 50k rows)
5. **Exports Parquet from `fueldata.duckdb`** → compressed_fuel_prices and daily_aggregates as Hive-partitioned Parquet

If no `.duckdb` files are found, it creates the empty tables and exits. Safe to re-run.

### Execution

```bash
cd scripts
uv sync
uv run python migrations/000_import_from_duckdb.py --data-dir ../data
```

### Docker

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

### Notes

- Datetime values are normalized to UTC ISO 8601 format (`YYYY-MM-DDTHH:MM:SSZ`) during migration.
- The original `.duckdb` files are not modified (opened read-only).
- Uses `CREATE TABLE IF NOT EXISTS` and `INSERT OR REPLACE`, so it's idempotent.

## Places Dataset (`places/extract_places.py`)

Extracts all German municipalities (Gemeinden) with their geographic centre
coordinates from the quarterly "Gemeindeverzeichnis" published by the
[Statistisches Bundesamt (Destatis)](https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/Archiv/GVAuszugQ/AuszugGV2QAktuell.html).

The result is written to `backend/app/resources/places.csv` and is served by the
backend `/api/places` endpoints, which power the city autocomplete of the gas
station search.

### Execution

```bash
cd scripts
uv sync

# Download the current release from Destatis and refresh the dataset
uv run python places/extract_places.py --download

# Or use an already downloaded workbook
uv run python places/extract_places.py --input ~/Downloads/AuszugGV2QAktuell.xlsx

# Write somewhere else
uv run python places/extract_places.py --download --output /tmp/places.csv
```

### Output

The script reads the `Onlineprodukt_Gemeinden*` sheet, keeps only the municipality
rows (Satzart 60 — the only rows carrying coordinates) and resolves the state and
district names from their parent rows.

| Column        | Description                                         |
| ------------- | --------------------------------------------------- |
| `ars`         | Official regional key (Amtlicher Regionalschlüssel) |
| `name`        | Municipality name without administrative suffix     |
| `designation` | Administrative designation (`Stadt`, `M`, ...)      |
| `postal_code` | Postal code of the administrative seat              |
| `district`    | District (Kreis)                                    |
| `state`       | Federal state (Bundesland)                          |
| `lat`, `lng`  | Geographic centre coordinates                       |
| `population`  | Population (based on Zensus 2022)                   |

Re-run the script whenever Destatis publishes a new quarterly release and commit
the regenerated CSV.

"""
Migration 000: Create SQLite tables and import DuckDB data.

1. Creates all tables and indexes in userdata.sqlite and fueldata.sqlite.
2. If DuckDB files exist, imports all data from them:
   - userdata.duckdb  → userdata.sqlite  (users, cars, car_access, …)
   - fueldata.duckdb  → fueldata.sqlite  (fuel_prices)
   - fueldata.duckdb  → userdata.sqlite  (favorite_stations, gas_station_info)
   - fueldata.duckdb  → Hive-partitioned Parquet (compressed_fuel_prices, daily_aggregates)

Safe to re-run: uses CREATE TABLE IF NOT EXISTS and INSERT OR REPLACE.

Usage:
    uv run python migrations/000_create_tables.py --data-dir /path/to/data
"""

import argparse
import datetime
import logging
import sqlite3
from datetime import date
from pathlib import Path

import duckdb
import pandas as pd
from fueldata import AggregatedFuelDataClient, CompressedFuelDataClient

logger = logging.getLogger(__name__)

USERDATA_SQLITE = "userdata.sqlite"
FUELDATA_SQLITE = "fueldata.sqlite"
USERDATA_DUCKDB = "userdata.duckdb"
FUELDATA_DUCKDB = "fueldata.duckdb"

# ---------------------------------------------------------------------------
# userdata.sqlite schema
# ---------------------------------------------------------------------------

USERDATA_TABLES = {
    "users": """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT NOT NULL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            picture_url TEXT,
            picture_base64 TEXT,
            created_at TEXT NOT NULL,
            last_login TEXT NOT NULL
        )
    """,
    "cars": """
        CREATE TABLE IF NOT EXISTS cars (
            id TEXT PRIMARY KEY,
            owner_user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            year INTEGER NOT NULL,
            fuel_tank_size REAL NOT NULL,
            fuel_type TEXT,
            created_at TEXT NOT NULL
        )
    """,
    "car_access": """
        CREATE TABLE IF NOT EXISTS car_access (
            id TEXT PRIMARY KEY,
            car_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            granted_at TEXT NOT NULL,
            granted_by_user_id TEXT NOT NULL,
            UNIQUE(car_id, user_id)
        )
    """,
    "refuel_metrics": """
        CREATE TABLE IF NOT EXISTS refuel_metrics (
            timestamp TEXT NOT NULL,
            user_id TEXT NOT NULL,
            car_id TEXT,
            price REAL NOT NULL,
            amount REAL NOT NULL,
            kilometers_since_last_refuel REAL NOT NULL,
            estimated_fuel_consumption REAL NOT NULL,
            notes TEXT,
            station_id TEXT,
            PRIMARY KEY (user_id, timestamp)
        )
    """,
    "kilometer_entries": """
        CREATE TABLE IF NOT EXISTS kilometer_entries (
            id TEXT PRIMARY KEY,
            car_id TEXT NOT NULL,
            total_kilometers REAL NOT NULL,
            timestamp TEXT NOT NULL,
            created_at TEXT NOT NULL,
            created_by TEXT NOT NULL
        )
    """,
    "favorite_stations": """
        CREATE TABLE IF NOT EXISTS favorite_stations (
            user_id TEXT NOT NULL,
            station_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            PRIMARY KEY (user_id, station_id)
        )
    """,
    "gas_station_info": """
        CREATE TABLE IF NOT EXISTS gas_station_info (
            station_id TEXT NOT NULL PRIMARY KEY,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            street TEXT NOT NULL,
            place TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            house_number TEXT NOT NULL,
            post_code INTEGER NOT NULL
        )
    """,
}

USERDATA_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_cars_owner ON cars(owner_user_id)",
    "CREATE INDEX IF NOT EXISTS idx_car_access_user ON car_access(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_car_access_car ON car_access(car_id)",
    "CREATE INDEX IF NOT EXISTS idx_refuel_user_timestamp ON refuel_metrics(user_id, timestamp DESC)",
    "CREATE INDEX IF NOT EXISTS idx_kilometer_car_timestamp ON kilometer_entries(car_id, timestamp DESC)",
]

# Tables in userdata.sqlite whose data comes from fueldata.duckdb
USERDATA_TABLES_FROM_FUELDATA = ["favorite_stations", "gas_station_info"]

# ---------------------------------------------------------------------------
# fueldata.sqlite schema
# ---------------------------------------------------------------------------

FUELDATA_TABLES = {
    "fuel_prices": """
        CREATE TABLE IF NOT EXISTS fuel_prices (
            timestamp TEXT NOT NULL,
            station_id TEXT NOT NULL,
            station_status TEXT NOT NULL,
            price_e5 REAL,
            price_e10 REAL,
            price_diesel REAL,
            PRIMARY KEY (timestamp, station_id)
        )
    """,
}

FUELDATA_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_fuel_prices_station_ts ON fuel_prices(station_id, timestamp DESC)",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def to_utc_iso(val: object) -> object:
    """Convert datetime-like values to UTC ISO 8601 strings."""
    if isinstance(val, datetime.datetime):
        if val.tzinfo is None:
            val = val.replace(tzinfo=datetime.UTC)
        else:
            val = val.astimezone(datetime.UTC)
        return val.strftime("%Y-%m-%dT%H:%M:%SZ")
    if isinstance(val, date):
        return val.isoformat()
    return val


def ensure_utc_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure all datetime columns in a DataFrame are tz-aware UTC."""
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            if df[col].dt.tz is None:
                df[col] = df[col].dt.tz_localize("UTC")
            else:
                df[col] = df[col].dt.tz_convert("UTC")
    return df


def create_schema(
    db_path: Path, tables: dict[str, str], indexes: list[str]
) -> sqlite3.Connection:
    """Create tables and indexes, return the open connection."""
    con = sqlite3.connect(str(db_path))
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    for ddl in tables.values():
        con.execute(ddl)
    for idx in indexes:
        con.execute(idx)
    con.commit()
    return con


def transfer_table(
    src_con: duckdb.DuckDBPyConnection,
    dst_con: sqlite3.Connection,
    table_name: str,
) -> int:
    """Transfer a single table from DuckDB to SQLite. Returns row count."""
    try:
        rows = src_con.execute(f"SELECT * FROM {table_name}").fetchall()
    except duckdb.CatalogException:
        print(f"  ⚠  Table '{table_name}' does not exist in source — skipping")
        return 0

    if not rows:
        print(f"  ✓  {table_name}: 0 rows (empty)")
        return 0

    placeholders = ", ".join(["?"] * len(rows[0]))
    converted = [tuple(to_utc_iso(v) for v in row) for row in rows]

    dst_con.executemany(
        f"INSERT OR REPLACE INTO {table_name} VALUES ({placeholders})",
        converted,
    )
    dst_con.commit()

    print(f"  ✓  {table_name}: {len(converted)} rows")
    return len(converted)


def transfer_fuel_prices(
    src_con: duckdb.DuckDBPyConnection,
    dst_con: sqlite3.Connection,
) -> int:
    """Transfer fuel_prices in 50k-row chunks to manage memory."""
    total_rows = src_con.execute("SELECT COUNT(*) FROM fuel_prices").fetchone()[0]
    print(f"  fuel_prices: {total_rows} rows to transfer")

    if total_rows == 0:
        return 0

    chunk_size = 50_000
    offset = 0
    transferred = 0

    while offset < total_rows:
        rows = src_con.execute(
            f"SELECT * FROM fuel_prices ORDER BY timestamp "
            f"LIMIT {chunk_size} OFFSET {offset}"
        ).fetchall()
        if not rows:
            break

        placeholders = ", ".join(["?"] * len(rows[0]))
        converted = [tuple(to_utc_iso(v) for v in row) for row in rows]

        dst_con.executemany(
            f"INSERT OR REPLACE INTO fuel_prices VALUES ({placeholders})",
            converted,
        )
        dst_con.commit()

        transferred += len(converted)
        offset += chunk_size
        print(f"    ... {transferred}/{total_rows}")

    print(f"  ✓  fuel_prices: {transferred} rows")
    return transferred


def export_parquet_compressed(
    src_con: duckdb.DuckDBPyConnection,
    data_dir: Path,
) -> int:
    """Export compressed_fuel_prices → Hive-partitioned Parquet."""
    try:
        df = src_con.execute("SELECT * FROM compressed_fuel_prices").fetchdf()
    except duckdb.CatalogException:
        print("  ⚠  compressed_fuel_prices not found — skipping")
        return 0

    if df.empty:
        print("  ✓  compressed_fuel_prices: 0 rows (empty)")
        return 0

    n = len(df)
    print(f"  compressed_fuel_prices: {n} rows to export")
    df = ensure_utc_columns(df)
    CompressedFuelDataClient(str(data_dir)).store_compressed_data(df)
    print(f"  ✓  compressed_fuel_prices: {n} rows")
    return n


def export_parquet_daily_aggregates(
    src_con: duckdb.DuckDBPyConnection,
    data_dir: Path,
) -> int:
    """Export daily_aggregates → Hive-partitioned Parquet."""
    try:
        df = src_con.execute("SELECT * FROM daily_aggregates").fetchdf()
    except duckdb.CatalogException:
        print("  ⚠  daily_aggregates not found — skipping")
        return 0

    if df.empty:
        print("  ✓  daily_aggregates: 0 rows (empty)")
        return 0

    n = len(df)
    print(f"  daily_aggregates: {n} rows to export")
    df = ensure_utc_columns(df)
    AggregatedFuelDataClient(str(data_dir)).store_daily_aggregates(df)
    print(f"  ✓  daily_aggregates: {n} rows")
    return n


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def run(data_dir: Path) -> None:
    """Create all tables, then import DuckDB data if sources exist."""
    userdata_path = data_dir / USERDATA_SQLITE
    fueldata_path = data_dir / FUELDATA_SQLITE
    userdata_duckdb = data_dir / USERDATA_DUCKDB
    fueldata_duckdb = data_dir / FUELDATA_DUCKDB

    # --- 1. Create schemas ---------------------------------------------------
    print(f"\n=== Creating tables in {userdata_path.name} ===")
    userdata_con = create_schema(userdata_path, USERDATA_TABLES, USERDATA_INDEXES)
    print(f"  ✓  {len(USERDATA_TABLES)} tables, {len(USERDATA_INDEXES)} indexes")

    print(f"\n=== Creating tables in {fueldata_path.name} ===")
    fueldata_con = create_schema(fueldata_path, FUELDATA_TABLES, FUELDATA_INDEXES)
    print(f"  ✓  {len(FUELDATA_TABLES)} tables, {len(FUELDATA_INDEXES)} indexes")

    # --- 2. Import from userdata.duckdb → userdata.sqlite --------------------
    total = 0

    # Tables to skip when importing from userdata.duckdb (sourced from fueldata.duckdb instead).
    skip_from_userdata = set(USERDATA_TABLES_FROM_FUELDATA)

    if userdata_duckdb.exists():
        print(f"\n=== Importing from {userdata_duckdb.name} → {userdata_path.name} ===")
        src = duckdb.connect(str(userdata_duckdb), read_only=True)
        for table in USERDATA_TABLES:
            if table not in skip_from_userdata:
                total += transfer_table(src, userdata_con, table)
        src.close()
    else:
        print(f"\n⚠  {userdata_duckdb.name} not found — skipping userdata import")

    # --- 3. Import from fueldata.duckdb → userdata.sqlite + fueldata.sqlite --
    if fueldata_duckdb.exists():
        src = duckdb.connect(str(fueldata_duckdb), read_only=True)

        print(f"\n=== Importing from {fueldata_duckdb.name} → {userdata_path.name} ===")
        for table in USERDATA_TABLES_FROM_FUELDATA:
            total += transfer_table(src, userdata_con, table)

        print(f"\n=== Importing from {fueldata_duckdb.name} → {fueldata_path.name} ===")
        total += transfer_fuel_prices(src, fueldata_con)

        print(f"\n=== Exporting Parquet from {fueldata_duckdb.name} ===")
        total += export_parquet_compressed(src, data_dir)
        total += export_parquet_daily_aggregates(src, data_dir)

        src.close()
    else:
        print(f"\n⚠  {fueldata_duckdb.name} not found — skipping fueldata import")

    userdata_con.close()
    fueldata_con.close()

    # --- 4. Rename source DuckDB files so re-runs are safe --------------------
    for duckdb_file in [userdata_duckdb, fueldata_duckdb]:
        if duckdb_file.exists():
            renamed = duckdb_file.with_suffix(".duckdb.migrated")
            duckdb_file.rename(renamed)
            print(f"  Renamed {duckdb_file.name} → {renamed.name}")

    print(f"\nDone — {total} total rows migrated.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    parser = argparse.ArgumentParser(
        description="Create SQLite tables and import DuckDB data"
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        required=True,
        help="Path to the data directory",
    )
    args = parser.parse_args()

    if not args.data_dir.is_dir():
        args.data_dir.mkdir(parents=True, exist_ok=True)

    run(args.data_dir)

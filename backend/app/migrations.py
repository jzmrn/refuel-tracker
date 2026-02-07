"""
Database migration scripts for schema changes
"""

import logging
from pathlib import Path

from .storage.duckdb_resource import BackendDuckDBResource

# Use the app logger which is configured in main.py
logger = logging.getLogger(__name__)


def run_migrations(db_path: Path) -> None:
    """
    Run all pending database migrations.

    Args:
        db_path: Path to the DuckDB database file
    """
    logger.info(f"Running database migrations on {db_path}")

    duckdb_resource = BackendDuckDBResource(db_path)

    # Create migrations table to track applied migrations
    with duckdb_resource.get_connection() as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL
            )
            """
        )

    # Run each migration in order
    migrations = [
        (1, add_picture_base64_column),
        (2, add_station_id_to_refuel),
        (3, add_car_id_to_refuel),
        (4, update_cars_schema),
        (5, remove_notes_from_cars),
        (6, add_fuel_type_to_cars),
        (7, convert_timestamps_to_timestamptz),
    ]

    for version, migration_func in migrations:
        if not is_migration_applied(duckdb_resource, version):
            logger.info(f"Applying migration version {version}")
            migration_func(duckdb_resource)
            mark_migration_applied(duckdb_resource, version)
            logger.info(f"Migration version {version} completed")
        else:
            logger.info(f"Migration version {version} already applied, skipping")


def is_migration_applied(duckdb_resource: BackendDuckDBResource, version: int) -> bool:
    """Check if a migration has already been applied"""
    with duckdb_resource.get_connection() as con:
        result = con.execute(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = ?", [version]
        ).fetchone()
        return result[0] > 0


def mark_migration_applied(
    duckdb_resource: BackendDuckDBResource, version: int
) -> None:
    """Mark a migration as applied"""
    from datetime import UTC, datetime

    with duckdb_resource.get_connection() as con:
        con.execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
            [version, datetime.now(UTC)],
        )


def add_picture_base64_column(duckdb_resource: BackendDuckDBResource) -> None:
    """
    Migration #1: Add picture_base64 column to users table
    This allows storing the profile picture as a base64 encoded string
    instead of relying on Google's URLs which are rate-limited.
    """
    with duckdb_resource.get_connection() as con:
        # Check if column already exists
        result = con.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'picture_base64'
            """
        ).fetchone()

        if not result:
            logger.info("Adding picture_base64 column to users table")
            con.execute(
                """
                ALTER TABLE users
                ADD COLUMN picture_base64 VARCHAR
                """
            )
            logger.info("picture_base64 column added successfully")
        else:
            logger.info("picture_base64 column already exists")


def add_station_id_to_refuel(duckdb_resource: BackendDuckDBResource) -> None:
    """
    Migration #2: Add station_id column to refuel_metrics table
    This allows users to track which gas station they refueled at.
    The column is nullable as existing entries don't have this information.
    """
    with duckdb_resource.get_connection() as con:
        # Check if column already exists
        result = con.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'refuel_metrics' AND column_name = 'station_id'
            """
        ).fetchone()

        if not result:
            logger.info("Adding station_id column to refuel_metrics table")
            con.execute(
                """
                ALTER TABLE refuel_metrics
                ADD COLUMN station_id VARCHAR
                """
            )
            logger.info("station_id column added successfully")
        else:
            logger.info("station_id column already exists")


def add_car_id_to_refuel(duckdb_resource: BackendDuckDBResource) -> None:
    """
    Migration #3: Add car_id column to refuel_metrics table
    This allows users to track refuels for multiple cars.
    The column is nullable for backward compatibility with existing data.
    """
    with duckdb_resource.get_connection() as con:
        # Check if column already exists
        result = con.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'refuel_metrics' AND column_name = 'car_id'
            """
        ).fetchone()

        if not result:
            logger.info("Adding car_id column to refuel_metrics table")
            con.execute(
                """
                ALTER TABLE refuel_metrics
                ADD COLUMN car_id VARCHAR
                """
            )
            logger.info("car_id column added successfully")
        else:
            logger.info("car_id column already exists")


def update_cars_schema(duckdb_resource: BackendDuckDBResource) -> None:
    """
    Migration #4: Update cars table schema
    - Remove make, model, license_plate columns
    - Add fuel_tank_size column
    This migration preserves existing car records by removing obsolete fields
    and adding the new fuel tank size field.
    """
    with duckdb_resource.get_connection() as con:
        # Check if make column still exists (indicator that migration hasn't run)
        result = con.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'cars' AND column_name = 'make'
            """
        ).fetchone()

        if result:
            logger.info("Updating cars table schema")

            # Create a new table with the updated schema
            con.execute(
                """
                CREATE TABLE cars_new (
                    id VARCHAR PRIMARY KEY,
                    owner_user_id VARCHAR NOT NULL,
                    name VARCHAR NOT NULL,
                    year INTEGER NOT NULL,
                    fuel_tank_size DOUBLE NOT NULL,
                    notes VARCHAR,
                    created_at TIMESTAMP NOT NULL
                )
                """
            )

            # Copy data from old table to new table
            con.execute(
                """
                INSERT INTO cars_new (id, owner_user_id, name, year, notes, created_at)
                SELECT id, owner_user_id, name, year, notes, created_at
                FROM cars
                """
            )

            # Drop the old table
            con.execute("DROP TABLE cars")

            # Rename new table to cars
            con.execute("ALTER TABLE cars_new RENAME TO cars")

            # Recreate indexes
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_cars_owner
                ON cars(owner_user_id)
                """
            )

            logger.info("Cars table schema updated successfully")
        else:
            logger.info("Cars table schema already updated")


def remove_notes_from_cars(duckdb_resource: BackendDuckDBResource) -> None:
    """
    Migration #5: Remove notes column from cars table
    The notes field is no longer used and should be removed from the schema.
    """
    with duckdb_resource.get_connection() as con:
        # Check if notes column exists
        result = con.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'cars' AND column_name = 'notes'
            """
        ).fetchone()

        if result:
            logger.info("Removing notes column from cars table")

            # Create a new table without the notes column
            con.execute(
                """
                CREATE TABLE cars_new (
                    id VARCHAR PRIMARY KEY,
                    owner_user_id VARCHAR NOT NULL,
                    name VARCHAR NOT NULL,
                    year INTEGER NOT NULL,
                    fuel_tank_size DOUBLE NOT NULL,
                    created_at TIMESTAMP NOT NULL
                )
                """
            )

            # Copy data from old table to new table (excluding notes)
            con.execute(
                """
                INSERT INTO cars_new (id, owner_user_id, name, year, fuel_tank_size, created_at)
                SELECT id, owner_user_id, name, year, fuel_tank_size, created_at
                FROM cars
                """
            )

            # Drop the old table
            con.execute("DROP TABLE cars")

            # Rename new table to cars
            con.execute("ALTER TABLE cars_new RENAME TO cars")

            # Recreate indexes
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_cars_owner
                ON cars(owner_user_id)
                """
            )

            logger.info("Notes column removed from cars table successfully")
        else:
            logger.info("Notes column already removed from cars table")


def add_fuel_type_to_cars(duckdb_resource: BackendDuckDBResource) -> None:
    """
    Migration #6: Add fuel_type column to cars table
    This allows storing the fuel type (Petrol, Diesel, Electric, Hybrid, etc.)
    for each car. The column is optional for backward compatibility.
    """
    with duckdb_resource.get_connection() as con:
        # Check if fuel_type column exists
        result = con.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'cars' AND column_name = 'fuel_type'
            """
        ).fetchone()

        if not result:
            logger.info("Adding fuel_type column to cars table")

            # Add the fuel_type column (nullable for backward compatibility)
            con.execute(
                """
                ALTER TABLE cars ADD COLUMN fuel_type VARCHAR
                """
            )

            logger.info("fuel_type column added to cars table successfully")
        else:
            logger.info("fuel_type column already exists in cars table")


def convert_timestamps_to_timestamptz(
    duckdb_resource: BackendDuckDBResource,
) -> None:
    """
    Migration #7: Convert all TIMESTAMP columns to TIMESTAMPTZ.

    Existing data was stored without timezone info but was always intended
    to be UTC. This migration recreates each affected table with TIMESTAMPTZ
    columns, copying data over (DuckDB casts TIMESTAMP → TIMESTAMPTZ as UTC).

    We use the create-copy-drop-rename approach per table because DuckDB does
    not support ALTER COLUMN TYPE and the column-level approach breaks on
    primary key / index dependencies.
    """

    # Each entry: (table_name, full CREATE TABLE DDL with TIMESTAMPTZ, column list)
    # The column list is used for SELECT ... FROM old table → INSERT INTO new table
    tables_to_migrate = [
        (
            "users",
            """
            CREATE TABLE __users_tz_new (
                id VARCHAR NOT NULL PRIMARY KEY,
                email VARCHAR NOT NULL UNIQUE,
                name VARCHAR NOT NULL,
                picture_url VARCHAR,
                picture_base64 VARCHAR,
                created_at TIMESTAMPTZ NOT NULL,
                last_login TIMESTAMPTZ NOT NULL
            )
            """,
        ),
        (
            "refuel_metrics",
            """
            CREATE TABLE __refuel_metrics_tz_new (
                timestamp TIMESTAMPTZ NOT NULL,
                user_id VARCHAR NOT NULL,
                car_id VARCHAR,
                price DOUBLE NOT NULL,
                amount DOUBLE NOT NULL,
                kilometers_since_last_refuel DOUBLE NOT NULL,
                estimated_fuel_consumption DOUBLE NOT NULL,
                notes VARCHAR,
                station_id VARCHAR,
                PRIMARY KEY (user_id, timestamp)
            )
            """,
        ),
        (
            "data_points",
            """
            CREATE TABLE __data_points_tz_new (
                id VARCHAR NOT NULL,
                user_id VARCHAR NOT NULL,
                timestamp TIMESTAMPTZ NOT NULL,
                value DOUBLE NOT NULL,
                label VARCHAR NOT NULL,
                notes VARCHAR,
                PRIMARY KEY (user_id, id)
            )
            """,
        ),
        (
            "time_spans",
            """
            CREATE TABLE __time_spans_tz_new (
                id VARCHAR NOT NULL,
                user_id VARCHAR NOT NULL,
                start_date TIMESTAMPTZ NOT NULL,
                end_date TIMESTAMPTZ,
                label VARCHAR NOT NULL,
                "group" VARCHAR NOT NULL,
                notes VARCHAR,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL,
                PRIMARY KEY (user_id, id)
            )
            """,
        ),
        (
            "kilometer_entries",
            """
            CREATE TABLE __kilometer_entries_tz_new (
                id VARCHAR PRIMARY KEY,
                car_id VARCHAR NOT NULL,
                total_kilometers DOUBLE NOT NULL,
                timestamp TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                created_by VARCHAR NOT NULL
            )
            """,
        ),
        (
            "cars",
            """
            CREATE TABLE __cars_tz_new (
                id VARCHAR PRIMARY KEY,
                owner_user_id VARCHAR NOT NULL,
                name VARCHAR NOT NULL,
                year INTEGER NOT NULL,
                fuel_tank_size DOUBLE NOT NULL,
                fuel_type VARCHAR,
                created_at TIMESTAMPTZ NOT NULL
            )
            """,
        ),
        (
            "car_access",
            """
            CREATE TABLE __car_access_tz_new (
                id VARCHAR PRIMARY KEY,
                car_id VARCHAR NOT NULL,
                user_id VARCHAR NOT NULL,
                granted_at TIMESTAMPTZ NOT NULL,
                granted_by_user_id VARCHAR NOT NULL,
                UNIQUE(car_id, user_id)
            )
            """,
        ),
        (
            "schema_migrations",
            """
            CREATE TABLE __schema_migrations_tz_new (
                version INTEGER PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL
            )
            """,
        ),
    ]

    with duckdb_resource.get_connection() as con:
        for table_name, create_ddl in tables_to_migrate:
            new_table = f"__{table_name}_tz_new"

            # Check if table exists
            table_exists = con.execute(
                """
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_name = ?
                """,
                [table_name],
            ).fetchone()[0]

            if not table_exists:
                logger.info(f"Table {table_name} does not exist, skipping")
                continue

            # Check if any TIMESTAMP (non-TZ) columns remain, or if
            # the table was left in a broken state by a previous failed
            # migration (e.g. columns dropped but temp columns left behind)
            has_naive_ts = con.execute(
                """
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_name = ?
                  AND data_type = 'TIMESTAMP'
                """,
                [table_name],
            ).fetchone()[0]

            # Also check for leftover __*_tz_tmp columns from previous
            # failed column-level migration attempts
            has_leftover_tmp = con.execute(
                """
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_name = ?
                  AND column_name LIKE '\\_\\_%\\_tz\\_tmp' ESCAPE '\\'
                """,
                [table_name],
            ).fetchone()[0]

            if not has_naive_ts and not has_leftover_tmp:
                logger.info(
                    f"Table {table_name} has no naive TIMESTAMP columns, skipping"
                )
                continue

            logger.info(f"Migrating table {table_name} to TIMESTAMPTZ")

            # Clean up leftover new table from a previous failed run
            con.execute(f"DROP TABLE IF EXISTS {new_table}")

            # Create new table with TIMESTAMPTZ schema
            con.execute(create_ddl)

            # Get column names from the NEW table (authoritative schema)
            new_cols = con.execute(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_name = ?
                ORDER BY ordinal_position
                """,
                [new_table],
            ).fetchall()
            new_col_names = [c[0] for c in new_cols]

            # Get column names that exist in the OLD table
            old_cols = con.execute(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_name = ?
                """,
                [table_name],
            ).fetchall()
            old_col_set = {c[0] for c in old_cols}

            # Build SELECT: for each new column, pick from the old table's
            # matching column or its __*_tz_tmp leftover
            select_exprs = []
            for col in new_col_names:
                tmp_col = f"__{col}_tz_tmp"
                if col in old_col_set:
                    select_exprs.append(f'"{col}"')
                elif tmp_col in old_col_set:
                    # Previous failed run left the data in the temp column
                    select_exprs.append(f'"{tmp_col}" AS "{col}"')
                else:
                    logger.warning(
                        f"Column {col} missing from {table_name}, using NULL"
                    )
                    select_exprs.append(f'NULL AS "{col}"')

            col_list = ", ".join(f'"{c}"' for c in new_col_names)
            select_list = ", ".join(select_exprs)

            # Copy all data (DuckDB auto-casts TIMESTAMP → TIMESTAMPTZ as UTC)
            con.execute(
                f"INSERT INTO {new_table} ({col_list}) "
                f"SELECT {select_list} FROM {table_name}"
            )

            # Drop all indexes on the old table
            indexes = con.execute(
                """
                SELECT index_name FROM duckdb_indexes()
                WHERE table_name = ?
                """,
                [table_name],
            ).fetchall()
            for (idx_name,) in indexes:
                con.execute(f'DROP INDEX IF EXISTS "{idx_name}"')

            # Swap tables
            con.execute(f"DROP TABLE {table_name}")
            con.execute(f"ALTER TABLE {new_table} RENAME TO {table_name}")

            logger.info(f"Successfully migrated {table_name} to TIMESTAMPTZ")

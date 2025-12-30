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
                applied_at TIMESTAMP NOT NULL
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

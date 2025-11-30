"""
Database migration scripts for schema changes
"""

import logging
from pathlib import Path

from .storage.duckdb_resource import BackendDuckDBResource

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
    ]

    for version, migration_func in migrations:
        if not is_migration_applied(duckdb_resource, version):
            logger.info(f"Applying migration version {version}")
            migration_func(duckdb_resource)
            mark_migration_applied(duckdb_resource, version)
            logger.info(f"Migration version {version} completed")
        else:
            logger.debug(f"Migration version {version} already applied")


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

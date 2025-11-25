"""
DuckDB resource wrapper for backend storage.

Provides a simple wrapper around DuckDB connections similar to dagster-duckdb's DuckDBResource,
but without the full Dagster dependency for use in FastAPI.
"""

from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

import duckdb


class BackendDuckDBResource:
    """Resource for managing DuckDB connections in the backend."""

    def __init__(self, database_path: str | Path):
        """
        Initialize the DuckDB resource.

        Args:
            database_path: Path to the DuckDB database file
        """
        self.database_path = str(database_path)

    @contextmanager
    def get_connection(self) -> Generator[duckdb.DuckDBPyConnection, None, None]:
        """
        Get a connection to the DuckDB database.

        Yields:
            A DuckDB connection object
        """
        conn = duckdb.connect(self.database_path)
        try:
            yield conn
        finally:
            conn.close()

"""
SQLite resource wrapper for backend storage.

Provides a simple wrapper around SQLite connections similar to the previous
BackendDuckDBResource, with WAL journal mode for concurrent read access.
"""

import logging
import sqlite3
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path
from threading import Lock

logger = logging.getLogger(__name__)


class BackendSQLiteResource:
    """Resource for managing SQLite connections in the backend."""

    def __init__(self, database_path: str | Path):
        """
        Initialize the SQLite resource.

        Args:
            database_path: Path to the SQLite database file
        """
        self.database_path = str(database_path)
        self._lock = Lock()

        # Enable WAL mode on first connection
        conn = sqlite3.connect(self.database_path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.close()

    @contextmanager
    def get_connection(self) -> Generator[sqlite3.Connection, None, None]:
        """
        Get a connection to the SQLite database.

        Uses a lock to ensure only one connection is active at a time,
        preventing transaction conflicts in concurrent requests.

        Yields:
            A sqlite3 Connection object
        """
        with self._lock:
            conn = sqlite3.connect(self.database_path)
            conn.row_factory = None  # Return plain tuples
            conn.execute("PRAGMA foreign_keys=ON")
            try:
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

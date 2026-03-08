"""
Dagster definitions for the analytics pipeline.
"""

import os
import sqlite3
from contextlib import contextmanager

from dagster import ConfigurableResource
from fueldata import CompressedFuelDataClient
from tankerkoenig import TankerkoenigClient


class TankerkoenigResource(ConfigurableResource):
    """Dagster resource for Tankerkönig API client."""

    api_key: str

    def get_client(self) -> TankerkoenigClient:
        """Get a configured Tankerkönig client."""
        return TankerkoenigClient(api_key=self.api_key)


class CompressedFuelDataResource(ConfigurableResource):
    """Dagster resource for CompressedFuelDataClient.

    Reads DATA_OUTPUT_PATH from the environment and raises an error
    if the variable is not set.
    """

    def get_client(self) -> CompressedFuelDataClient:
        """Get a configured CompressedFuelDataClient."""
        data_path = os.environ.get("DATA_OUTPUT_PATH")
        if not data_path:
            raise EnvironmentError("DATA_OUTPUT_PATH environment variable is not set")
        return CompressedFuelDataClient(data_path)


class SQLiteResource(ConfigurableResource):
    """Dagster resource wrapping a SQLite database with WAL mode."""

    database: str

    @contextmanager
    def get_connection(self):
        """Yield a sqlite3.Connection with auto commit/rollback."""
        con = sqlite3.connect(self.database)
        con.execute("PRAGMA journal_mode=WAL")
        con.execute("PRAGMA foreign_keys=ON")
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:
            con.close()

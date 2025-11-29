from datetime import datetime

import pandas as pd
from dagster_duckdb import DuckDBResource
from pydantic import BaseModel


class FavoriteStation(BaseModel):
    """Represents a favorite gas station for a user."""

    user_id: str
    station_id: str
    timestamp: datetime


class GasStationInfo(BaseModel):
    """Represents a gas station with location information."""

    station_id: str
    name: str
    brand: str
    street: str
    place: str
    lat: float
    lng: float
    house_number: str
    post_code: int


class FuelStationClient:
    """Client for storing fuel station data."""

    def __init__(self, duckdb: DuckDBResource):
        """
        Initialize the FuelData client.

        Args:
            con: DuckDBPyConnection for database operations
        """
        self._duckdb = duckdb

        with duckdb.get_connection() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS favorite_stations (
                    user_id VARCHAR NOT NULL,
                    station_id VARCHAR NOT NULL,
                    timestamp TIMESTAMP NOT NULL,
                    PRIMARY KEY (user_id, station_id)
                )
            """
            )

            con.execute(
                """
                CREATE TABLE IF NOT EXISTS gas_station_info (
                    station_id VARCHAR NOT NULL PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    brand VARCHAR NOT NULL,
                    street VARCHAR NOT NULL,
                    place VARCHAR NOT NULL,
                    lat DOUBLE NOT NULL,
                    lng DOUBLE NOT NULL,
                    house_number VARCHAR NOT NULL,
                    post_code INTEGER NOT NULL
                )
            """
            )

    def store_favorite_station(self, user_id: str, station_id: str) -> None:
        """
        Store a favorite gas station for a user.

        Args:
            user_id: The user ID
            station_id: The station ID to mark as favorite
        """

        timestamp = datetime.now()
        with self._duckdb.get_connection() as con:
            con.execute(
                """
                INSERT OR REPLACE INTO favorite_stations (user_id, station_id, timestamp)
                VALUES (?, ?, ?)
                """,
                [user_id, station_id, timestamp],
            )

        print(f"Stored favorite station {station_id} for user {user_id}")

    def delete_favorite_station(self, user_id: str, station_id: str) -> None:
        """
        Delete a favorite gas station for a user.

        Args:
            user_id: The user ID
            station_id: The station ID to remove from favorites
        """

        with self._duckdb.get_connection() as con:
            con.execute(
                """
                DELETE FROM favorite_stations
                WHERE user_id = ? AND station_id = ?
                """,
                [user_id, station_id],
            )

        print(f"Deleted favorite station {station_id} for user {user_id}")

    def read_favorite_stations(self, user_id: str | None = None) -> pd.DataFrame:
        """
        Retrieve favorite gas stations.

        Args:
            user_id: Optional user ID to filter favorites for a specific user.
                    If None, returns all favorite stations.

        Returns:
            DataFrame with columns: user_id, station_id, timestamp
        """

        query = "SELECT user_id, station_id, timestamp FROM favorite_stations"

        if user_id is not None:
            query += f" WHERE user_id = '{user_id}'"

        query += " ORDER BY timestamp DESC"

        with self._duckdb.get_connection() as con:
            df = con.execute(query).df()
        print(f"Retrieved {len(df)} favorite stations")

        return df

    def get_favorite_stations(
        self, user_id: str | None = None
    ) -> list[FavoriteStation]:
        """
        Get favorite gas stations with Pydantic validation.

        Args:
            user_id: Optional user ID to filter favorites for a specific user.
                    If None, returns all favorite stations.

        Returns:
            List of FavoriteStation objects
        """

        df = self.read_favorite_stations(user_id)
        records = df.to_dict(orient="records")
        return [FavoriteStation.model_validate(record) for record in records]

    def store_gas_station_info(
        self, stations: list[GasStationInfo]
    ) -> list[GasStationInfo]:
        """
        Store gas station information into the database.

        Args:
            stations: List of GasStationInfo objects

        Returns:
            The input list of GasStationInfo objects
        """

        print(f"Storing {len(stations)} gas station records")

        if stations:
            with self._duckdb.get_connection() as con:
                for station in stations:
                    con.execute(
                        """
                        INSERT OR REPLACE INTO gas_station_info
                        (station_id, name, brand, street, place, lat, lng, house_number, post_code)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        [
                            station.station_id,
                            station.name,
                            station.brand,
                            station.street,
                            station.place,
                            station.lat,
                            station.lng,
                            station.house_number,
                            station.post_code,
                        ],
                    )

        return stations

    def read_gas_station_info(self, station_id: str | None = None) -> pd.DataFrame:
        """
        Read gas station information from the database.

        Args:
            station_id: Optional station ID to filter for a specific station.
                       If None, returns all gas stations.

        Returns:
            DataFrame with gas station information
        """

        query = "SELECT * FROM gas_station_info"

        if station_id is not None:
            query += f" WHERE station_id = '{station_id}'"

        with self._duckdb.get_connection() as con:
            df = con.execute(query).df()

        print(f"Read {len(df)} gas station records")

        return df

    def get_gas_station_info(
        self, station_id: str | None = None
    ) -> list[GasStationInfo]:
        """
        Get gas station information with Pydantic validation.

        Args:
            station_id: Optional station ID to filter for a specific station.
                       If None, returns all gas stations.

        Returns:
            List of GasStationInfo objects
        """

        df = self.read_gas_station_info(station_id)
        records = df.to_dict(orient="records")
        return [GasStationInfo.model_validate(record) for record in records]

    def get_favorite_stations_with_info(self, user_id: str) -> list[GasStationInfo]:
        """
        Get favorite gas stations for a user with complete station information.

        Uses SQL JOIN for optimal performance to retrieve favorite stations
        filtered by user_id and enriched with gas station details.

        Args:
            user_id: The user ID to filter favorite stations

        Returns:
            List of GasStationInfo objects for the user's favorite stations
        """

        query = """
            SELECT
                gsi.station_id,
                gsi.name,
                gsi.brand,
                gsi.street,
                gsi.place,
                gsi.lat,
                gsi.lng,
                gsi.house_number,
                gsi.post_code
            FROM favorite_stations fs
            INNER JOIN gas_station_info gsi
                ON fs.station_id = gsi.station_id
            WHERE fs.user_id = ?
            ORDER BY fs.timestamp DESC
        """

        with self._duckdb.get_connection() as con:
            df = con.execute(query, [user_id]).df()

        print(f"Retrieved {len(df)} favorite stations with info for user {user_id}")

        records = df.to_dict(orient="records")
        return [GasStationInfo.model_validate(record) for record in records]

    def delete_gas_station_info(self, station_id: str) -> None:
        """
        Delete gas station information from the database.

        Args:
            station_id: The station ID to delete
        """

        with self._duckdb.get_connection() as con:
            con.execute(
                """
                DELETE FROM gas_station_info
                WHERE station_id = ?
                """,
                [station_id],
            )

        print(f"Deleted gas station info for station {station_id}")

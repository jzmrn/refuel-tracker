"""
DuckDB client for car storage and sharing.
"""

import logging
from datetime import UTC, datetime
from uuid import uuid4

from duckdb import DuckDBPyConnection

from ..models import CarAccessUser, CarResponse, CarStatistics, UserSearchResponse
from .duckdb_resource import BackendDuckDBResource

logger = logging.getLogger(__name__)


class CarClient:
    """Client for managing cars and car access in DuckDB."""

    def __init__(self, duckdb: BackendDuckDBResource):
        """
        Initialize the CarClient.

        Args:
            duckdb: BackendDuckDBResource for database operations
        """
        self._duckdb = duckdb
        with self._duckdb.get_connection() as con:
            # Create cars table
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS cars (
                    id VARCHAR PRIMARY KEY,
                    owner_user_id VARCHAR NOT NULL,
                    name VARCHAR NOT NULL,
                    year INTEGER NOT NULL,
                    fuel_tank_size DOUBLE NOT NULL,
                    fuel_type VARCHAR,
                    created_at TIMESTAMP NOT NULL
                )
            """
            )

            # Create car_access table for sharing
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS car_access (
                    id VARCHAR PRIMARY KEY,
                    car_id VARCHAR NOT NULL,
                    user_id VARCHAR NOT NULL,
                    granted_at TIMESTAMP NOT NULL,
                    granted_by_user_id VARCHAR NOT NULL,
                    UNIQUE(car_id, user_id)
                )
            """
            )

            # Create indexes
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_cars_owner
                ON cars(owner_user_id)
            """
            )
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_car_access_user
                ON car_access(user_id)
            """
            )
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_car_access_car
                ON car_access(car_id)
            """
            )

    def create_car(
        self,
        user_id: str,
        name: str,
        year: int,
        fuel_tank_size: float,
        fuel_type: str | None = None,
    ) -> str:
        """Create a new car and return its ID."""
        car_id = str(uuid4())
        created_at = datetime.now(UTC)

        with self._duckdb.get_connection() as con:
            con.execute(
                """
                INSERT INTO cars (id, owner_user_id, name, year, fuel_tank_size, fuel_type, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    car_id,
                    user_id,
                    name,
                    year,
                    fuel_tank_size,
                    fuel_type,
                    created_at,
                ],
            )

        return car_id

    def get_cars_for_user(self, user_id: str) -> list[CarResponse]:
        """Get all cars that a user owns or has access to."""

        with self._duckdb.get_connection() as con:
            # Get owned cars with refuel count and owner name
            owned_result = con.execute(
                """
                SELECT c.id, c.owner_user_id, c.name, c.year, c.fuel_tank_size, c.fuel_type, c.created_at,
                       u.name as owner_name,
                       COALESCE((SELECT COUNT(*) FROM refuel_metrics rm WHERE rm.car_id = c.id), 0) as refuel_count
                FROM cars c
                LEFT JOIN users u ON c.owner_user_id = u.id
                WHERE c.owner_user_id = ?
                ORDER BY c.created_at DESC
                """,
                [user_id],
            ).fetchall()

            # Get shared cars with refuel count and owner name
            shared_result = con.execute(
                """
                SELECT c.id, c.owner_user_id, c.name, c.year,
                       c.fuel_tank_size, c.fuel_type, c.created_at, u.name as shared_by_name,
                       COALESCE((SELECT COUNT(*) FROM refuel_metrics rm WHERE rm.car_id = c.id), 0) as refuel_count
                FROM cars c
                JOIN car_access ca ON c.id = ca.car_id
                JOIN users u ON c.owner_user_id = u.id
                WHERE ca.user_id = ?
                ORDER BY c.created_at DESC
                """,
                [user_id],
            ).fetchall()

        cars = []

        # Process owned cars
        for row in owned_result:
            # Get shared users for this car
            shared_users = self.get_car_shared_users(row[0], user_id)
            cars.append(
                CarResponse(
                    id=row[0],
                    owner_user_id=row[1],
                    owner_name=row[7],
                    name=row[2],
                    year=row[3],
                    fuel_tank_size=row[4],
                    fuel_type=row[5],
                    created_at=row[6],
                    is_owner=True,
                    shared_by=None,
                    shared_users=shared_users,
                    refuel_count=row[8],
                )
            )

        # Process shared cars
        for row in shared_result:
            cars.append(
                CarResponse(
                    id=row[0],
                    owner_user_id=row[1],
                    owner_name=row[7],  # Owner name for shared cars
                    name=row[2],
                    year=row[3],
                    fuel_tank_size=row[4],
                    fuel_type=row[5],
                    created_at=row[6],
                    is_owner=False,
                    shared_by=row[7],
                    shared_users=[],  # Don't include shared users for shared cars
                    refuel_count=row[8],
                )
            )

        return cars

    def user_has_car_access(self, car_id: str, user_id: str) -> bool:
        """Check if a user has access to a car (owner or shared access)."""
        with self._duckdb.get_connection() as con:
            # Check if user owns the car
            result = con.execute(
                """
                SELECT 1 FROM cars WHERE id = ? AND owner_user_id = ?
                """,
                [car_id, user_id],
            ).fetchone()

            if result:
                return True

            # Check if user has shared access
            result = con.execute(
                """
                SELECT 1 FROM car_access WHERE car_id = ? AND user_id = ?
                """,
                [car_id, user_id],
            ).fetchone()

            return result is not None

    def get_car(self, car_id: str, user_id: str) -> CarResponse | None:
        """Get a specific car if user has access."""

        with self._duckdb.get_connection() as con:
            # Check if user owns the car - include owner name and refuel count
            result = con.execute(
                """
                SELECT c.id, c.owner_user_id, c.name, c.year, c.fuel_tank_size, c.created_at,
                       u.name as owner_name,
                       COALESCE((SELECT COUNT(*) FROM refuel_metrics rm WHERE rm.car_id = c.id), 0) as refuel_count
                FROM cars c
                LEFT JOIN users u ON c.owner_user_id = u.id
                WHERE c.id = ? AND c.owner_user_id = ?
                """,
                [car_id, user_id],
            ).fetchone()

            if result:
                # Get shared users for this car
                shared_users = self._get_car_shared_users(con, car_id, user_id)
                return CarResponse(
                    id=result[0],
                    owner_user_id=result[1],
                    owner_name=result[6],
                    name=result[2],
                    year=result[3],
                    fuel_tank_size=result[4],
                    created_at=result[5],
                    is_owner=True,
                    shared_by=None,
                    shared_users=shared_users,
                    refuel_count=result[7],
                )

            # Check if user has shared access - include refuel count
            result = con.execute(
                """
                SELECT c.id, c.owner_user_id, c.name, c.year,
                       c.fuel_tank_size, c.created_at, u.name as owner_name,
                       COALESCE((SELECT COUNT(*) FROM refuel_metrics rm WHERE rm.car_id = c.id), 0) as refuel_count
                FROM cars c
                JOIN car_access ca ON c.id = ca.car_id
                JOIN users u ON c.owner_user_id = u.id
                WHERE c.id = ? AND ca.user_id = ?
                """,
                [car_id, user_id],
            ).fetchone()

            if result:
                return CarResponse(
                    id=result[0],
                    owner_user_id=result[1],
                    owner_name=result[6],
                    name=result[2],
                    year=result[3],
                    fuel_tank_size=result[4],
                    created_at=result[5],
                    is_owner=False,
                    shared_by=result[
                        6
                    ],  # Owner name is also shared_by for non-owned cars
                    shared_users=[],  # Don't include shared users for shared cars
                    refuel_count=result[7],
                )

        return None

    def update_car(
        self,
        car_id: str,
        owner_user_id: str,
        name: str | None = None,
        year: int | None = None,
        fuel_tank_size: float | None = None,
        fuel_type: str | None = None,
    ) -> bool:
        """Update a car (owner only)."""
        updates = []
        params = []

        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if year is not None:
            updates.append("year = ?")
            params.append(year)
        if fuel_tank_size is not None:
            updates.append("fuel_tank_size = ?")
            params.append(fuel_tank_size)
        if fuel_type is not None:
            updates.append("fuel_type = ?")
            params.append(fuel_type)

        if not updates:
            return True  # Nothing to update

        params.extend([car_id, owner_user_id])

        with self._duckdb.get_connection() as con:
            result = con.execute(
                f"""
                UPDATE cars
                SET {", ".join(updates)}
                WHERE id = ? AND owner_user_id = ?
                """,
                params,
            )
            return result.fetchone() is not None

    def delete_car(self, car_id: str, owner_user_id: str) -> bool:
        """Delete a car (owner only)."""
        with self._duckdb.get_connection() as con:
            # Delete refuel metrics associated with this car first
            con.execute(
                """
                DELETE FROM refuel_metrics WHERE car_id = ?
                """,
                [car_id],
            )

            # Delete car access entries
            con.execute(
                """
                DELETE FROM car_access WHERE car_id = ?
                """,
                [car_id],
            )

            # Delete the car
            con.execute(
                """
                DELETE FROM cars WHERE id = ? AND owner_user_id = ?
                """,
                [car_id, owner_user_id],
            )

        return True

    def share_car(self, car_id: str, owner_user_id: str, target_user_id: str) -> bool:
        """Share a car with another user (owner only)."""
        # Verify ownership
        with self._duckdb.get_connection() as con:
            owner_check = con.execute(
                """
                SELECT id FROM cars WHERE id = ? AND owner_user_id = ?
                """,
                [car_id, owner_user_id],
            ).fetchone()

            if not owner_check:
                return False

            # Don't allow sharing with self
            if owner_user_id == target_user_id:
                return False

            # Add access
            access_id = str(uuid4())
            granted_at = datetime.now(UTC)

            try:
                con.execute(
                    """
                    INSERT INTO car_access (id, car_id, user_id, granted_at, granted_by_user_id)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    [access_id, car_id, target_user_id, granted_at, owner_user_id],
                )
                return True
            except Exception:
                # Handle duplicate sharing
                logger.error(
                    "Failed to share car",
                    exc_info=True,
                    extra={
                        "car_id": car_id,
                        "owner_user_id": owner_user_id,
                        "shared_with_user_id": target_user_id,
                    },
                )
                return False

    def revoke_car_access(
        self, car_id: str, owner_user_id: str, target_user_id: str
    ) -> bool:
        """Revoke car access from a user (owner only)."""
        with self._duckdb.get_connection() as con:
            # Verify ownership
            owner_check = con.execute(
                """
                SELECT id FROM cars WHERE id = ? AND owner_user_id = ?
                """,
                [car_id, owner_user_id],
            ).fetchone()

            if not owner_check:
                return False

            # Remove access
            con.execute(
                """
                DELETE FROM car_access WHERE car_id = ? AND user_id = ?
                """,
                [car_id, target_user_id],
            )

        return True

    def get_car_shared_users(
        self, car_id: str, owner_user_id: str
    ) -> list[CarAccessUser]:
        """Get list of users who have access to a car (owner only)."""

        with self._duckdb.get_connection() as con:
            users = self._get_car_shared_users(con, car_id, owner_user_id)

        return users

    def _get_car_shared_users(
        self, con: DuckDBPyConnection, car_id: str, owner_user_id: str
    ) -> list[CarAccessUser]:
        owner_check = con.execute(
            """
            SELECT id FROM cars WHERE id = ? AND owner_user_id = ?
            """,
            [car_id, owner_user_id],
        ).fetchone()

        if not owner_check:
            return []

        result = con.execute(
            """
            SELECT ca.user_id, u.name, u.email, ca.granted_at, ca.granted_by_user_id
            FROM car_access ca
            JOIN users u ON ca.user_id = u.id
            WHERE ca.car_id = ?
            ORDER BY ca.granted_at DESC
            """,
            [car_id],
        ).fetchall()

        users = []
        for row in result:
            users.append(
                CarAccessUser(
                    user_id=row[0],
                    user_name=row[1],
                    user_email=row[2],
                    granted_at=row[3],
                    granted_by_user_id=row[4],
                )
            )

        return users

    def search_users(
        self, query: str, exclude_user_id: str
    ) -> list[UserSearchResponse]:
        """Search for users by name or email (for sharing)."""
        with self._duckdb.get_connection() as con:
            result = con.execute(
                """
                SELECT id, name, email
                FROM users
                WHERE (LOWER(name) LIKE ? OR LOWER(email) LIKE ?)
                AND id != ?
                LIMIT 20
                """,
                [f"%{query.lower()}%", f"%{query.lower()}%", exclude_user_id],
            ).fetchall()

        users = []
        for row in result:
            users.append(UserSearchResponse(id=row[0], name=row[1], email=row[2]))

        return users

    def sync_shared_users(
        self, car_id: str, owner_user_id: str, shared_user_ids: list[str]
    ) -> bool:
        """Sync the list of users who have access to a car (owner only)."""
        with self._duckdb.get_connection() as con:
            # Verify ownership
            owner_check = con.execute(
                """
                SELECT id FROM cars WHERE id = ? AND owner_user_id = ?
                """,
                [car_id, owner_user_id],
            ).fetchone()

            if not owner_check:
                return False

            # Get current shared users
            current_users = con.execute(
                """
                SELECT user_id FROM car_access WHERE car_id = ?
                """,
                [car_id],
            ).fetchall()
            current_user_ids = {row[0] for row in current_users}

            # Determine users to add and remove
            new_user_ids = set(shared_user_ids) - {
                owner_user_id
            }  # Don't share with self
            to_add = new_user_ids - current_user_ids
            to_remove = current_user_ids - new_user_ids

            # Remove users
            for user_id in to_remove:
                con.execute(
                    """
                    DELETE FROM car_access WHERE car_id = ? AND user_id = ?
                    """,
                    [car_id, user_id],
                )

            # Add new users
            granted_at = datetime.now(UTC)
            for user_id in to_add:
                access_id = str(uuid4())
                try:
                    con.execute(
                        """
                        INSERT INTO car_access (id, car_id, user_id, granted_at, granted_by_user_id)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        [access_id, car_id, user_id, granted_at, owner_user_id],
                    )
                except Exception:
                    # Handle any errors (e.g., user doesn't exist)
                    logger.error(
                        "Failed to add shared user to car",
                        exc_info=True,
                        extra={
                            "car_id": car_id,
                            "user_id": user_id,
                            "owner_user_id": owner_user_id,
                        },
                    )

        return True

    def get_car_statistics(self, car_id: str, user_id: str) -> CarStatistics | None:
        """Get statistics for a specific car (if user has access)."""
        # Verify access
        car = self.get_car(car_id, user_id)
        if not car:
            return None

        with self._duckdb.get_connection() as con:
            result = con.execute(
                """
                SELECT
                    COUNT(*) as total_refuels,
                    SUM(kilometers_since_last_refuel) as total_distance,
                    SUM(amount) as total_fuel,
                    SUM(price * amount) as total_cost,
                    AVG(estimated_fuel_consumption) as avg_consumption,
                    AVG(price) as avg_price,
                    MIN(timestamp) as first_refuel,
                    MAX(timestamp) as last_refuel
                FROM refuel_metrics
                WHERE car_id = ?
                """,
                [car_id],
            ).fetchone()

        if not result or result[0] == 0:
            return CarStatistics(
                car_id=car_id,
                total_refuels=0,
                total_distance=0.0,
                total_fuel=0.0,
                total_cost=0.0,
                average_consumption=0.0,
                average_price_per_liter=0.0,
                first_refuel=None,
                last_refuel=None,
            )

        return CarStatistics(
            car_id=car_id,
            total_refuels=result[0] or 0,
            total_distance=result[1] or 0.0,
            total_fuel=result[2] or 0.0,
            total_cost=result[3] or 0.0,
            average_consumption=result[4] or 0.0,
            average_price_per_liter=result[5] or 0.0,
            first_refuel=result[6],
            last_refuel=result[7],
        )

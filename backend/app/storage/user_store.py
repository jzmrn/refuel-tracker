"""User storage layer using DuckDB"""

import logging
from datetime import UTC, datetime

from ..models import User, UserCreate
from .duckdb_resource import BackendDuckDBResource

logger = logging.getLogger(__name__)


class UserStore:
    """User storage with DuckDB backend"""

    def __init__(self, duckdb: BackendDuckDBResource):
        """
        Initialize the UserStore.

        Args:
            duckdb: BackendDuckDBResource for database operations
        """
        self._duckdb = duckdb
        with self._duckdb.get_connection() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR NOT NULL PRIMARY KEY,
                    email VARCHAR NOT NULL UNIQUE,
                    name VARCHAR NOT NULL,
                    picture_url VARCHAR,
                    created_at TIMESTAMP NOT NULL,
                    last_login TIMESTAMP NOT NULL
                )
            """
            )
            # Create index for email lookups
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_users_email
                ON users(email)
            """
            )

    def create_or_update_user(self, user_data: UserCreate) -> User:
        """Create or update a user in the database"""

        now = datetime.now(UTC)
        existing_user = self.get_user(user_data.id)
        if existing_user:
            updated_user = User(
                id=user_data.id,
                email=user_data.email,
                name=user_data.name,
                picture_url=user_data.picture_url
                if user_data.picture_url
                else existing_user.picture_url,
                created_at=existing_user.created_at,
                last_login=now,
            )

            try:
                with self._duckdb.get_connection() as con:
                    con.execute(
                        """
                        UPDATE users
                        SET email = ?, name = ?, picture_url = ?, last_login = ?
                        WHERE id = ?
                        """,
                        [
                            updated_user.email,
                            updated_user.name,
                            updated_user.picture_url,
                            updated_user.last_login,
                            updated_user.id,
                        ],
                    )
                # Connection closes here
                return self.get_user(user_data.id)

            except Exception as e:
                logger.error(f"Error updating user: {e}")
                raise Exception("Failed to update user")

        else:
            new_user = User(
                id=user_data.id,
                email=user_data.email,
                name=user_data.name,
                picture_url=user_data.picture_url,
                created_at=now,
                last_login=now,
            )

            try:
                with self._duckdb.get_connection() as con:
                    con.execute(
                        """
                        INSERT INTO users (id, email, name, picture_url, created_at, last_login)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        [
                            new_user.id,
                            new_user.email,
                            new_user.name,
                            new_user.picture_url,
                            new_user.created_at,
                            new_user.last_login,
                        ],
                    )
                # Connection closes here
                return self.get_user(user_data.id)
            except Exception as e:
                logger.error(f"Error creating user: {e}")
                raise Exception("Failed to create user")

    def get_user(self, user_id: str) -> User | None:
        """Get a user by ID"""

        try:
            with self._duckdb.get_connection() as con:
                result = con.execute(
                    "SELECT * FROM users WHERE id = ?", [user_id]
                ).fetchone()
                columns = [desc[0] for desc in con.description]

            if not result:
                return None

            user_dict = dict(zip(columns, result))
            return User.from_dict(user_dict)

        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None

    def get_user_by_email(self, email: str) -> User | None:
        """Get a user by email"""

        try:
            with self._duckdb.get_connection() as con:
                result = con.execute(
                    "SELECT * FROM users WHERE email = ?", [email]
                ).fetchone()
                columns = [desc[0] for desc in con.description]

            if not result:
                return None

            user_dict = dict(zip(columns, result))
            return User.from_dict(user_dict)

        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None

    def list_all_users(self) -> list[User]:
        """Get all users"""
        query = "SELECT * FROM users ORDER BY created_at DESC"

        try:
            with self._duckdb.get_connection() as con:
                results = con.execute(query).fetchall()
                columns = [desc[0] for desc in con.description]

            users = []
            for row in results:
                user_dict = dict(zip(columns, row))
                users.append(User.from_dict(user_dict))
            return users
        except Exception as e:
            logger.error(f"Error listing users: {e}")
            return []

    def delete_user(self, user_id: str) -> bool:
        """Delete a user"""
        try:
            with self._duckdb.get_connection() as con:
                result = con.execute(
                    "DELETE FROM users WHERE id = ?",
                    [user_id],
                )
                return result.fetchone()[0] > 0
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False

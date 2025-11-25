"""User storage layer using DuckDB"""

import logging
from datetime import UTC, datetime

import pandas as pd

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
        if existing_user := self.get_user(user_data.id):
            df = pd.DataFrame(
                [
                    User(
                        id=user_data.id,
                        email=user_data.email,
                        name=user_data.name,
                        picture_url=user_data.picture_url
                        if user_data.picture_url
                        else existing_user.picture_url,
                        created_at=existing_user.created_at,
                        last_login=now,
                    ).model_dump()
                ]
            )

            try:
                with self._duckdb.get_connection() as con:
                    # Delete then insert (UPSERT pattern for DuckDB)
                    con.execute("DELETE FROM users WHERE id = ?", [user_data.id])
                    con.execute("INSERT INTO users SELECT * FROM df")
                    result = self.get_user(user_data.id)
                return result
            except Exception as e:
                logger.error(f"Error updating user: {e}")
                raise Exception("Failed to update user")

        else:
            df = pd.DataFrame(  # noqa: F841 DuckDB reads the value internally
                [
                    User(
                        id=user_data.id,
                        email=user_data.email,
                        name=user_data.name,
                        picture_url=user_data.picture_url,
                        created_at=now,
                        last_login=now,
                    ).model_dump()
                ]
            )

            try:
                with self._duckdb.get_connection() as con:
                    con.execute("INSERT INTO users SELECT * FROM df")
                    result = self.get_user(user_data.id)
                return result
            except Exception as e:
                logger.error(f"Error creating user: {e}")
                raise Exception("Failed to create user")

    def get_user(self, user_id: str) -> User | None:
        """Get a user by ID"""

        try:
            with self._duckdb.get_connection() as con:
                df = con.execute("SELECT * FROM users WHERE id = ?", [user_id]).df()

            if df.empty:
                return None

            user = df.iloc[0].to_dict()
            return User.from_dict(user)

        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None

    def get_user_by_email(self, email: str) -> User | None:
        """Get a user by email"""

        try:
            with self._duckdb.get_connection() as con:
                df = con.execute("SELECT * FROM users WHERE email = ?", [email]).df()

            if df.empty:
                return None

            user = df.iloc[0].to_dict()
            return User.from_dict(user)

        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None

    def list_all_users(self) -> list[User]:
        """Get all users"""
        query = "SELECT * FROM users ORDER BY created_at DESC"

        try:
            with self._duckdb.get_connection() as con:
                df = con.execute(query).df()

            if df.empty:
                return []

            users = []
            for _, row in df.iterrows():
                users.append(
                    User(
                        id=row["id"],
                        email=row["email"],
                        name=row["name"],
                        picture_url=row["picture_url"],
                        created_at=row["created_at"],
                        last_login=row["last_login"],
                    )
                )
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

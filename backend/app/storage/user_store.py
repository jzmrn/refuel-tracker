"""User storage layer using SQLite"""
import base64
import logging
from datetime import UTC, datetime
from pathlib import Path

import httpx
from sqlalchemy import Column, DateTime, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

Base = declarative_base()


class UserModel(Base):
    """SQLAlchemy model for users"""

    __tablename__ = "users"

    id = Column(String(255), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    picture = Column(Text, nullable=True)  # Store base64-encoded image data
    picture_url = Column(String(500), nullable=True)  # Original URL for reference
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    last_login = Column(DateTime, default=lambda: datetime.now(UTC))


class UserStore:
    """User storage with SQLite backend"""

    def __init__(self, data_path: str | Path):
        """Initialize user store with SQLite database"""
        self.data_path = Path(data_path)
        self.data_path.mkdir(parents=True, exist_ok=True)

        # Create SQLite database
        db_path = self.data_path / "users.db"
        self.engine = create_engine(f"sqlite:///{db_path}")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

        # Run migrations
        self._run_migrations()

    def _run_migrations(self):
        """Run database migrations to add missing columns"""
        from sqlalchemy import inspect, text

        with self.engine.connect() as connection:
            inspector = inspect(self.engine)
            columns = [col["name"] for col in inspector.get_columns("users")]

            # Add picture_url column if it doesn't exist
            if "picture_url" not in columns:
                logger.info("Adding picture_url column to users table")
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN picture_url VARCHAR(500)")
                )
                connection.commit()

    @staticmethod
    def _cache_profile_picture(picture_url: str | None) -> str | None:
        """Download and cache profile picture as base64"""
        if not picture_url:
            return None

        try:
            # Download image with timeout
            response = httpx.get(picture_url, timeout=5.0, follow_redirects=True)
            response.raise_for_status()

            # Convert to base64
            image_data = base64.b64encode(response.content).decode("utf-8")

            # Determine media type from content-type header
            content_type = response.headers.get("content-type", "image/jpeg")

            # Return as data URL
            return f"data:{content_type};base64,{image_data}"
        except Exception as e:
            logger.warning(f"Failed to cache profile picture from {picture_url}: {e}")
            return None

    def create_or_update_user(
        self,
        user_id: str,
        email: str,
        name: str,
        picture: str | None = None,
    ) -> dict:
        """Create or update a user in the database"""
        session = self.SessionLocal()
        try:
            user = session.query(UserModel).filter(UserModel.id == user_id).first()

            # Cache the profile picture as base64 data URL
            cached_picture = self._cache_profile_picture(picture)

            if user:
                # Update existing user
                user.email = email
                user.name = name
                if cached_picture:
                    user.picture = cached_picture
                    user.picture_url = picture
                user.last_login = datetime.now(UTC)
            else:
                # Create new user
                user = UserModel(
                    id=user_id,
                    email=email,
                    name=name,
                    picture=cached_picture,
                    picture_url=picture,
                    created_at=datetime.now(UTC),
                    last_login=datetime.now(UTC),
                )
                session.add(user)

            session.commit()
            return self._model_to_dict(user)
        finally:
            session.close()

    def get_user(self, user_id: str) -> dict | None:
        """Get a user by ID"""
        session = self.SessionLocal()
        try:
            user = session.query(UserModel).filter(UserModel.id == user_id).first()
            if user:
                return self._model_to_dict(user)
            return None
        finally:
            session.close()

    def get_user_by_email(self, email: str) -> dict | None:
        """Get a user by email"""
        session = self.SessionLocal()
        try:
            user = session.query(UserModel).filter(UserModel.email == email).first()
            if user:
                return self._model_to_dict(user)
            return None
        finally:
            session.close()

    def list_all_users(self) -> list[dict]:
        """Get all users"""
        session = self.SessionLocal()
        try:
            users = session.query(UserModel).all()
            return [self._model_to_dict(user) for user in users]
        finally:
            session.close()

    def delete_user(self, user_id: str) -> bool:
        """Delete a user"""
        session = self.SessionLocal()
        try:
            user = session.query(UserModel).filter(UserModel.id == user_id).first()
            if user:
                session.delete(user)
                session.commit()
                return True
            return False
        finally:
            session.close()

    @staticmethod
    def _model_to_dict(user: UserModel) -> dict:
        """Convert SQLAlchemy model to dictionary"""
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
            "created_at": user.created_at.isoformat(),
            "last_login": user.last_login.isoformat(),
        }

"""
Authentication using OAuth2 with authlib and secure session management
"""
import os
import secrets
from typing import Annotated

from authlib.integrations.starlette_client import OAuth
from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.storage.user_store import UserStore


class UserData(BaseModel):
    """User data from OAuth token"""

    sub: str  # User ID
    email: str
    name: str
    picture: str | None = None


class AuthService:
    """Authentication service for handling OAuth2 with authlib"""

    def __init__(self, user_store: UserStore):
        self.user_store = user_store
        self.oauth = OAuth()
        self.session_timeout = 24 * 60 * 60  # 24 hours in seconds

        # Configure Google OAuth
        self.oauth.register(
            name="google",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={"scope": "openid email profile"},
        )

    def get_oauth_client(self):
        """Get OAuth client instance"""
        return self.oauth.google

    def create_session_token(self, user_id: str) -> str:
        """Create a secure session token"""
        return secrets.token_urlsafe(32)

    def extract_user_from_token(self, token: dict) -> UserData:
        """Extract user data from OAuth token"""
        # authlib returns userinfo in a nested 'userinfo' dict when using openid scope
        userinfo = token.get("userinfo", {})

        # Try to get user ID from multiple possible locations
        user_id = (
            userinfo.get("sub")
            or token.get("sub")
            or userinfo.get("id")
            or token.get("id")
        )
        email = userinfo.get("email") or token.get("email")
        name = userinfo.get("name") or email or "User"
        picture = userinfo.get("picture") or token.get("picture")

        if not user_id:
            raise ValueError("Could not extract user ID from token")
        if not email:
            raise ValueError("Could not extract email from token")

        return UserData(
            sub=user_id,
            email=email,
            name=name,
            picture=picture,
        )

    def handle_oauth_callback(self, token: dict) -> tuple[UserData, str]:
        """Handle OAuth callback and create/update user"""
        user_data = self.extract_user_from_token(token)

        # Store/update user in database
        self.user_store.create_or_update_user(
            user_id=user_data.sub,
            email=user_data.email,
            name=user_data.name,
            picture=user_data.picture,
        )

        # Create session token
        session_token = self.create_session_token(user_data.sub)
        return user_data, session_token

    def get_user_from_session(self, request: Request) -> UserData | None:
        """Extract user from session cookie"""
        user_id = request.cookies.get("user_id")
        if not user_id:
            return None

        user = self.user_store.get_user(user_id)
        if not user:
            return None

        return UserData(
            sub=user["id"],
            email=user["email"],
            name=user["name"],
            picture=user["picture"],
        )


# Global auth service instance (will be initialized in main.py)
auth_service: AuthService | None = None


def init_auth_service(user_store: UserStore) -> AuthService:
    """Initialize auth service with user store"""
    global auth_service
    auth_service = AuthService(user_store)
    return auth_service


async def get_current_user(request: Request) -> UserData:
    """FastAPI dependency to get current user from session"""
    if auth_service is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth service not initialized",
        )

    user = auth_service.get_user_from_session(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    return user


async def get_current_user_id(
    current_user: Annotated[UserData, Depends(get_current_user)]
) -> str:
    """FastAPI dependency to get current user ID"""
    return current_user.sub


# Type aliases for dependencies
CurrentUser = Annotated[UserData, Depends(get_current_user)]
CurrentUserId = Annotated[str, Depends(get_current_user_id)]

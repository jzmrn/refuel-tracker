"""
Authentication using Google OAuth2 token validation
"""

import os
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from google.auth.transport import requests
from google.oauth2 import id_token

from .models import User, UserCreate
from .storage.user_store import UserStore


def get_user_info_from_id_token(request: Request) -> User:
    """Extract and validate user ID from Google OAuth2 token"""

    token = request.cookies.get("IdToken")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - IdToken cookie missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get the expected client ID from environment variable
    web_client_id = os.environ.get("GOOGLE_CLIENT_ID")
    if not web_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error - GOOGLE_CLIENT_ID not set",
        )

    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), web_client_id)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = idinfo["sub"]
    email = idinfo.get("email")
    name = idinfo.get("name")

    if not user_id or not email or not name:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - token missing required user info",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_store: UserStore = request.app.state.user_store

    user_create = UserCreate(
        id=user_id,
        email=email,
        name=name,
        picture_url=idinfo.get("picture"),
    )

    try:
        return user_store.create_or_update_user(user_create)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register user: {str(e)}",
        )


# Type alias for dependency injection
CurrentUser = Annotated[User, Depends(get_user_info_from_id_token)]

"""
Authentication using Google OAuth2 token validation
"""

import base64
import logging
import os
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, Request, status
from google.auth.transport import requests
from google.oauth2 import id_token

from .models import User, UserCreate
from .storage.user_store import UserStore

logger = logging.getLogger(__name__)


async def fetch_and_encode_picture(picture_url: str | None) -> str | None:
    """
    Fetch profile picture from URL and encode it as base64.

    Args:
        picture_url: URL of the profile picture

    Returns:
        Base64 encoded image string with data URI prefix, or None if fetch fails
    """
    if not picture_url:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(picture_url)
            response.raise_for_status()

            # Get content type to include in data URI
            content_type = response.headers.get("content-type", "image/jpeg")

            # Encode image as base64
            image_base64 = base64.b64encode(response.content).decode("utf-8")

            # Return as data URI
            return f"data:{content_type};base64,{image_base64}"

    except Exception as e:
        logger.warning(f"Failed to fetch profile picture from {picture_url}: {e}")
        return None


async def get_user_info_from_id_token(request: Request) -> User:
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

    # Fetch and encode profile picture on every sign in
    picture_url = idinfo.get("picture")
    picture_base64 = await fetch_and_encode_picture(picture_url)

    user_create = UserCreate(
        id=user_id,
        email=email,
        name=name,
        picture_url=picture_url,
        picture_base64=picture_base64,
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

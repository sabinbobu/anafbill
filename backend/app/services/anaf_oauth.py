import logging
import secrets
from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

ANAF_AUTH_BASE = "https://logincert.anaf.ro/anaf-oauth2/v1"


def get_authorization_url(state: str) -> str:
    """Build the ANAF OAuth2 authorization URL the user must visit."""
    params = {
        "response_type": "code",
        "client_id": settings.anaf_client_id,
        "redirect_uri": settings.anaf_redirect_uri,
        "token_content_type": "jwt",
        "state": state,
    }
    return f"{ANAF_AUTH_BASE}/authorize?{urlencode(params)}"


def generate_state() -> str:
    return secrets.token_urlsafe(32)


async def exchange_code(code: str) -> dict:
    """Exchange an authorization code for access + refresh tokens."""
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{ANAF_AUTH_BASE}/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.anaf_redirect_uri,
                "client_id": settings.anaf_client_id,
                "client_secret": settings.anaf_client_secret,
                "token_content_type": "jwt",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        response.raise_for_status()
        return response.json()


async def refresh_access_token(refresh_token: str) -> dict:
    """Use a refresh token to get a new access token."""
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{ANAF_AUTH_BASE}/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": settings.anaf_client_id,
                "client_secret": settings.anaf_client_secret,
                "token_content_type": "jwt",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        response.raise_for_status()
        return response.json()


async def get_valid_token(org: dict, supabase) -> str:
    """Return a valid ANAF access token, auto-refreshing if expired.

    Raises ValueError if no ANAF connection exists.
    """
    access_token = org.get("anaf_access_token")
    refresh_token = org.get("anaf_refresh_token")
    expires_at_str = org.get("anaf_token_expires_at")

    if not access_token or not refresh_token:
        raise ValueError("ANAF not connected. Please authorize from Settings.")

    # Check if token is still valid (with 60s buffer)
    if expires_at_str:
        try:
            expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            if (expires_at - now).total_seconds() > 60:
                return access_token
        except ValueError:
            pass

    # Token expired — refresh it
    logger.info("ANAF token expired for org %s, refreshing...", org["id"])
    try:
        token_data = await refresh_access_token(refresh_token)
    except httpx.HTTPStatusError as exc:
        logger.error("ANAF token refresh failed: %s", exc)
        raise ValueError("ANAF token refresh failed. Please reconnect from Settings.")

    new_access = token_data["access_token"]
    new_refresh = token_data.get("refresh_token", refresh_token)
    expires_in = token_data.get("expires_in", 3600)
    new_expires = datetime.now(timezone.utc).timestamp() + expires_in
    new_expires_iso = datetime.fromtimestamp(new_expires, tz=timezone.utc).isoformat()

    supabase.table("organizations").update({
        "anaf_access_token": new_access,
        "anaf_refresh_token": new_refresh,
        "anaf_token_expires_at": new_expires_iso,
    }).eq("id", org["id"]).execute()

    return new_access

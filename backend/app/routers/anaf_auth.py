import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

from ..config import settings
from ..dependencies import CurrentUser, SupabaseClient
from ..services.anaf_oauth import (
    exchange_code,
    generate_state,
    get_authorization_url,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory state store for CSRF protection (keyed by state → user_id)
# For production use Redis instead
_pending_states: dict[str, str] = {}


def _get_org(supabase, user_id: str) -> dict:
    result = (
        supabase.table("organizations")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Organization not found")
    return result.data[0]


@router.get("/authorize")
async def authorize(
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> dict:
    """Generate the ANAF OAuth2 authorization URL for this user.

    The frontend should redirect the user to the returned URL.
    """
    _get_org(supabase, current_user["id"])  # ensure org exists

    state = generate_state()
    _pending_states[state] = current_user["id"]
    url = get_authorization_url(state)

    logger.info("ANAF authorize URL generated for user %s", current_user["id"])
    return {"authorization_url": url}


@router.get("/callback")
async def callback(
    supabase: SupabaseClient,
    code: str = Query(...),
    state: str = Query(...),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
) -> RedirectResponse:
    """ANAF OAuth2 callback — exchange code for tokens and store them."""
    app_url = settings.app_url

    if error:
        logger.warning("ANAF auth error: %s — %s", error, error_description)
        return RedirectResponse(url=f"{app_url}/settings?anaf_error={error}")

    user_id = _pending_states.pop(state, None)
    if not user_id:
        return RedirectResponse(url=f"{app_url}/settings?anaf_error=invalid_state")

    try:
        token_data = await exchange_code(code)
    except Exception as exc:
        logger.error("ANAF token exchange failed: %s", exc)
        return RedirectResponse(url=f"{app_url}/settings?anaf_error=token_exchange_failed")

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)

    if not access_token:
        return RedirectResponse(url=f"{app_url}/settings?anaf_error=no_token")

    expires_at = datetime.fromtimestamp(
        datetime.now(timezone.utc).timestamp() + expires_in, tz=timezone.utc
    ).isoformat()

    supabase.table("organizations").update({
        "anaf_access_token": access_token,
        "anaf_refresh_token": refresh_token,
        "anaf_token_expires_at": expires_at,
    }).eq("user_id", user_id).execute()

    logger.info("ANAF connected for user %s, expires at %s", user_id, expires_at)
    return RedirectResponse(url=f"{app_url}/settings?anaf_connected=true")


@router.get("/status")
async def anaf_status(
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> dict:
    """Return the ANAF connection status for the current user's organization."""
    try:
        org = _get_org(supabase, current_user["id"])
    except HTTPException:
        return {"connected": False, "expires_at": None}

    access_token = org.get("anaf_access_token")
    expires_at_str = org.get("anaf_token_expires_at")

    if not access_token:
        return {"connected": False, "expires_at": None}

    expired = False
    if expires_at_str:
        try:
            expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            expired = expires_at <= datetime.now(timezone.utc)
        except ValueError:
            expired = True

    return {
        "connected": not expired,
        "expires_at": expires_at_str,
        "expired": expired,
    }


@router.delete("/disconnect")
async def disconnect(
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> dict:
    """Revoke the ANAF connection by clearing stored tokens."""
    try:
        org = _get_org(supabase, current_user["id"])
    except HTTPException:
        return {"disconnected": True}

    supabase.table("organizations").update({
        "anaf_access_token": None,
        "anaf_refresh_token": None,
        "anaf_token_expires_at": None,
    }).eq("id", org["id"]).execute()

    logger.info("ANAF disconnected for user %s", current_user["id"])
    return {"disconnected": True}

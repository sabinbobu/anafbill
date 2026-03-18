import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from ..dependencies import CurrentUser, SupabaseClient
from ..models.organization import OrganizationCreate, OrganizationResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_org_for_user(supabase, user_id: str) -> dict | None:
    """Return the organization row for *user_id*, or None if not found."""
    result = (
        supabase.table("organizations")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]
    return None


@router.get("/me", response_model=OrganizationResponse)
async def get_organization(
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> OrganizationResponse:
    """Return the organization profile for the currently authenticated user."""
    org = _get_org_for_user(supabase, current_user["id"])
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrganizationResponse(**org)


@router.post("/", response_model=OrganizationResponse, status_code=201)
async def create_organization(
    body: OrganizationCreate,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> OrganizationResponse:
    """Create a new organization for the currently authenticated user."""
    # Prevent duplicate organizations per user
    existing = _get_org_for_user(supabase, current_user["id"])
    if existing:
        raise HTTPException(
            status_code=409, detail="Organization already exists for this user"
        )

    now = datetime.now(timezone.utc).isoformat()
    payload = {
        **body.model_dump(),
        "user_id": current_user["id"],
        "next_invoice_number": 1,
        "created_at": now,
        "updated_at": now,
    }

    result = supabase.table("organizations").insert(payload).execute()
    if not result.data:
        logger.error("Failed to create organization for user %s", current_user["id"])
        raise HTTPException(status_code=500, detail="Failed to create organization")

    org = result.data[0]
    logger.info("Created organization %s for user %s", org["id"], current_user["id"])
    return OrganizationResponse(**org)


@router.put("/me", response_model=OrganizationResponse)
async def update_organization(
    body: OrganizationCreate,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> OrganizationResponse:
    """Update the organization profile for the currently authenticated user."""
    org = _get_org_for_user(supabase, current_user["id"])
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    now = datetime.now(timezone.utc).isoformat()
    updates = {**body.model_dump(), "updated_at": now}

    result = (
        supabase.table("organizations")
        .update(updates)
        .eq("id", org["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update organization")

    logger.info("Updated organization %s", org["id"])
    return OrganizationResponse(**result.data[0])


@router.get("/me/anaf-status")
async def get_anaf_status(
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> dict:
    """Return whether valid ANAF OAuth2 tokens are configured for the current org."""
    org = _get_org_for_user(supabase, current_user["id"])
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    access_token: str | None = org.get("anaf_access_token")
    expires_at_raw: str | None = org.get("anaf_token_expires_at")

    connected = bool(access_token)
    token_expired = False

    if connected and expires_at_raw:
        try:
            expires_at = datetime.fromisoformat(expires_at_raw)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            token_expired = expires_at <= datetime.now(timezone.utc)
        except ValueError:
            token_expired = True

    return {
        "connected": connected,
        "token_expired": token_expired,
        "expires_at": expires_at_raw,
    }

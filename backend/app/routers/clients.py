import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from ..dependencies import CurrentUser, SupabaseClient
from ..models.client import ClientCreate, ClientResponse
from ..services.cui_lookup import lookup_cui

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_organization_id(supabase, user_id: str) -> str:
    """Return the organization_id for *user_id*, raising 404 if not found."""
    result = (
        supabase.table("organizations")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Organization not found. Please complete your organization profile first.")
    return result.data[0]["id"]


@router.get("/", response_model=list[ClientResponse])
async def list_clients(
    current_user: CurrentUser,
    supabase: SupabaseClient,
    search: str | None = Query(default=None, description="Filter by name or CUI"),
) -> list[ClientResponse]:
    """List all clients for the authenticated user's organization."""
    org_id = _get_organization_id(supabase, current_user["id"])

    query = (
        supabase.table("clients")
        .select("*")
        .eq("organization_id", org_id)
        .order("name")
    )

    result = query.execute()
    clients = result.data or []

    # Apply in-memory search filter when a search term is provided
    if search:
        search_lower = search.lower()
        clients = [
            c for c in clients
            if search_lower in (c.get("name") or "").lower()
            or search_lower in (c.get("cui") or "").lower()
        ]

    return [ClientResponse(**c) for c in clients]


@router.post("/", response_model=ClientResponse, status_code=201)
async def create_client(
    body: ClientCreate,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> ClientResponse:
    """Create a new client for the authenticated user's organization."""
    org_id = _get_organization_id(supabase, current_user["id"])

    now = datetime.now(timezone.utc).isoformat()
    payload = {
        **body.model_dump(),
        "organization_id": org_id,
        "created_at": now,
    }

    result = supabase.table("clients").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create client")

    client = result.data[0]
    logger.info("Created client %s for org %s", client["id"], org_id)
    return ClientResponse(**client)


@router.get("/cui/{cui}")
async def lookup_client_by_cui(
    cui: str,
    current_user: CurrentUser,  # noqa: ARG001 — auth check only
    supabase: SupabaseClient,  # noqa: ARG001 — auth check only
) -> dict:
    """Lookup company information from the ANAF public API by CUI."""
    data = await lookup_cui(cui)
    if not data:
        raise HTTPException(
            status_code=404, detail=f"Company with CUI {cui} not found in ANAF registry"
        )
    return data


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> ClientResponse:
    """Get a single client by ID (must belong to the authenticated user's org)."""
    org_id = _get_organization_id(supabase, current_user["id"])

    result = (
        supabase.table("clients")
        .select("*")
        .eq("id", client_id)
        .eq("organization_id", org_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Client not found")
    return ClientResponse(**result.data[0])


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    body: ClientCreate,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> ClientResponse:
    """Update a client record (must belong to the authenticated user's org)."""
    org_id = _get_organization_id(supabase, current_user["id"])

    # Verify ownership
    existing = (
        supabase.table("clients")
        .select("id")
        .eq("id", client_id)
        .eq("organization_id", org_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Client not found")

    result = (
        supabase.table("clients")
        .update(body.model_dump())
        .eq("id", client_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update client")

    logger.info("Updated client %s", client_id)
    return ClientResponse(**result.data[0])


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: str,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> None:
    """Delete a client record (must belong to the authenticated user's org)."""
    org_id = _get_organization_id(supabase, current_user["id"])

    existing = (
        supabase.table("clients")
        .select("id")
        .eq("id", client_id)
        .eq("organization_id", org_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Client not found")

    supabase.table("clients").delete().eq("id", client_id).execute()
    logger.info("Deleted client %s", client_id)

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from ..dependencies import CurrentUser, SupabaseClient
from ..models.chat import ChatRequest, ChatResponse
from ..services.chat_service import get_chat_reply

logger = logging.getLogger(__name__)
router = APIRouter()

_HISTORY_LIMIT = 50


def _get_org_id(supabase, user_id: str) -> str:
    result = (
        supabase.table("organizations")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Organization not found")
    return result.data[0]["id"]


@router.post("/", response_model=ChatResponse, status_code=201)
async def chat(
    body: ChatRequest,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> ChatResponse:
    """Send a message to the AI fiscal assistant and persist both turns."""
    org_id = _get_org_id(supabase, current_user["id"])
    now = datetime.now(timezone.utc).isoformat()

    # Persist the user's message
    supabase.table("chat_messages").insert(
        {
            "organization_id": org_id,
            "role": "user",
            "content": body.message,
            "created_at": now,
        }
    ).execute()

    # Build history list for the Anthropic API
    history = [{"role": m.role, "content": m.content} for m in body.history]

    try:
        reply = await get_chat_reply(body.message, history)
    except Exception as exc:
        logger.error("Chat service error for org %s: %s", org_id, exc)
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable")

    # Persist the assistant's reply
    supabase.table("chat_messages").insert(
        {
            "organization_id": org_id,
            "role": "assistant",
            "content": reply,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()

    return ChatResponse(reply=reply)


@router.get("/history")
async def get_chat_history(
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> list[dict]:
    """Return the last 50 chat messages for the authenticated user's organization."""
    org_id = _get_org_id(supabase, current_user["id"])

    result = (
        supabase.table("chat_messages")
        .select("id, role, content, created_at")
        .eq("organization_id", org_id)
        .order("created_at", desc=True)
        .limit(_HISTORY_LIMIT)
        .execute()
    )

    # Return in chronological order (oldest first) so the UI can render correctly
    messages = list(reversed(result.data or []))
    return messages

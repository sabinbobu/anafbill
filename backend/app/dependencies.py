import logging
from fastapi import HTTPException, Header, Depends
from typing import Annotated
from supabase import create_client, Client
from .config import settings

logger = logging.getLogger(__name__)


def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_key)


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    supabase: Client = Depends(get_supabase),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": user.user.id, "email": user.user.email, "token": token}
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Token validation failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired token")


CurrentUser = Annotated[dict, Depends(get_current_user)]
SupabaseClient = Annotated[Client, Depends(get_supabase)]

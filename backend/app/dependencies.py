from fastapi import HTTPException, Header
from typing import Annotated
from .config import settings


async def get_current_user(authorization: Annotated[str | None, Header()] = None) -> dict:
    """Extract and validate the current user from the Supabase JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    # TODO: validate JWT with Supabase
    return {"token": authorization.split(" ")[1]}

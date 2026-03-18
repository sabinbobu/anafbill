from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_archive() -> dict:
    # TODO: implement
    return {"items": []}

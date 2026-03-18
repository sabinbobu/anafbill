from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_clients() -> dict:
    # TODO: implement
    return {"clients": []}

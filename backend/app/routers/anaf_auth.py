from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
async def anaf_status() -> dict:
    # TODO: implement
    return {"connected": False}

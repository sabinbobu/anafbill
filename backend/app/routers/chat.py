from fastapi import APIRouter

router = APIRouter()


@router.post("/")
async def chat() -> dict:
    # TODO: implement
    return {"message": ""}

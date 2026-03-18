from fastapi import APIRouter

router = APIRouter()


@router.get("/me")
async def get_organization() -> dict:
    # TODO: implement
    return {}

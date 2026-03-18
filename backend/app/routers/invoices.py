from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_invoices() -> dict:
    # TODO: implement
    return {"invoices": []}

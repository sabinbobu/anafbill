from pydantic import BaseModel
from typing import Optional


class ClientCreate(BaseModel):
    cui: Optional[str] = None
    name: str
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_county: Optional[str] = None
    address_postal_code: Optional[str] = None
    email: Optional[str] = None
    is_company: bool = True


class ClientResponse(BaseModel):
    id: str
    organization_id: str
    cui: Optional[str] = None
    name: str
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_county: Optional[str] = None
    address_postal_code: Optional[str] = None
    email: Optional[str] = None
    is_company: bool
    created_at: str

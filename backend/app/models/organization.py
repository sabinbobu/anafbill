from pydantic import BaseModel
from typing import Optional


class OrganizationCreate(BaseModel):
    cui: str
    company_name: str
    trade_register_nr: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_county: Optional[str] = None
    address_postal_code: Optional[str] = None
    vat_registered: bool = False
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    invoice_series: str = "FACT"


class OrganizationResponse(BaseModel):
    id: str
    user_id: str
    cui: str
    company_name: str
    trade_register_nr: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_county: Optional[str] = None
    address_postal_code: Optional[str] = None
    vat_registered: bool
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    invoice_series: str
    next_invoice_number: int
    created_at: str
    updated_at: str

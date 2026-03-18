from pydantic import BaseModel
from typing import Optional
from datetime import date


class InvoiceLineCreate(BaseModel):
    line_number: int
    description: str
    quantity: float
    unit_code: str = "H87"
    unit_price: float
    vat_rate: float = 19.00
    vat_category_code: str = "S"
    line_total: float


class InvoiceCreate(BaseModel):
    client_id: str
    issue_date: date
    due_date: date
    currency: str = "RON"
    invoice_type: str = "b2b"
    notes: Optional[str] = None
    lines: list[InvoiceLineCreate]


class InvoiceResponse(BaseModel):
    id: str
    organization_id: str
    client_id: str
    invoice_number: str
    issue_date: date
    due_date: date
    currency: str
    status: str
    invoice_type: str
    subtotal_amount: float
    vat_amount: float
    total_amount: float
    anaf_error_message: Optional[str] = None
    deadline_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str

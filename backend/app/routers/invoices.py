import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from ..dependencies import CurrentUser, SupabaseClient
from ..models.invoice import InvoiceCreate, InvoiceResponse
from ..services.deadline_engine import calculate_deadline
from ..services.xml_builder import build_invoice_xml
from ..services.anaf_oauth import get_valid_token
from ..services.anaf_client import upload_invoice

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_org(supabase, user_id: str) -> dict:
    """Return the organization row for *user_id*, raising 404 if not found."""
    result = (
        supabase.table("organizations")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Organization not found. Please complete your organization profile first.",
        )
    return result.data[0]


def _require_invoice(supabase, invoice_id: str, org_id: str) -> dict:
    """Fetch an invoice and verify it belongs to *org_id*. Raises 404 if missing."""
    result = (
        supabase.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("organization_id", org_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result.data[0]


def _get_lines(supabase, invoice_id: str) -> list[dict]:
    result = (
        supabase.table("invoice_lines")
        .select("*")
        .eq("invoice_id", invoice_id)
        .order("line_number")
        .execute()
    )
    return result.data or []


@router.get("/", response_model=list[InvoiceResponse])
async def list_invoices(
    current_user: CurrentUser,
    supabase: SupabaseClient,
    status: str | None = Query(default=None, description="Filter by status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[InvoiceResponse]:
    """List invoices for the authenticated user's organization."""
    org = _get_org(supabase, current_user["id"])

    query = (
        supabase.table("invoices")
        .select("*")
        .eq("organization_id", org["id"])
        .order("created_at", desc=True)
        .range(skip, skip + limit - 1)
    )
    if status:
        query = query.eq("status", status)

    result = query.execute()
    return [InvoiceResponse(**inv) for inv in (result.data or [])]


@router.post("/", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    body: InvoiceCreate,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> InvoiceResponse:
    """Create a new invoice with its line items."""
    org = _get_org(supabase, current_user["id"])

    # Verify the client belongs to this org
    client_result = (
        supabase.table("clients")
        .select("id")
        .eq("id", body.client_id)
        .eq("organization_id", org["id"])
        .limit(1)
        .execute()
    )
    if not client_result.data:
        raise HTTPException(status_code=404, detail="Client not found")

    # Assign invoice number from series and increment counter
    series: str = org.get("invoice_series", "FACT")
    next_number: int = org.get("next_invoice_number", 1)
    invoice_number = f"{series}-{next_number:04d}"

    # Increment next_invoice_number atomically
    supabase.table("organizations").update(
        {"next_invoice_number": next_number + 1}
    ).eq("id", org["id"]).execute()

    # Calculate deadline (5 Romanian working days)
    deadline_date = calculate_deadline(body.issue_date)

    # Compute monetary totals
    subtotal = sum(float(ln.line_total) for ln in body.lines)
    vat_amount = sum(
        round(float(ln.line_total) * float(ln.vat_rate) / 100, 2) for ln in body.lines
    )
    total_amount = subtotal + vat_amount

    now = datetime.now(timezone.utc).isoformat()
    invoice_payload = {
        "organization_id": org["id"],
        "client_id": body.client_id,
        "invoice_number": invoice_number,
        "issue_date": body.issue_date.isoformat(),
        "due_date": body.due_date.isoformat(),
        "currency": body.currency,
        "status": "draft",
        "invoice_type": body.invoice_type,
        "subtotal_amount": subtotal,
        "vat_amount": vat_amount,
        "total_amount": total_amount,
        "deadline_date": deadline_date.isoformat(),
        "notes": body.notes,
        "created_at": now,
        "updated_at": now,
    }

    inv_result = supabase.table("invoices").insert(invoice_payload).execute()
    if not inv_result.data:
        raise HTTPException(status_code=500, detail="Failed to create invoice")
    invoice = inv_result.data[0]

    # Insert line items
    lines_payload = [
        {
            "invoice_id": invoice["id"],
            "line_number": ln.line_number,
            "description": ln.description,
            "quantity": float(ln.quantity),
            "unit_code": ln.unit_code,
            "unit_price": float(ln.unit_price),
            "vat_rate": float(ln.vat_rate),
            "vat_category_code": ln.vat_category_code,
            "line_total": float(ln.line_total),
            "created_at": now,
        }
        for ln in body.lines
    ]
    supabase.table("invoice_lines").insert(lines_payload).execute()

    logger.info("Created invoice %s (%s) for org %s", invoice["id"], invoice_number, org["id"])
    return InvoiceResponse(**invoice)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> InvoiceResponse:
    """Get a single invoice with its line items."""
    org = _get_org(supabase, current_user["id"])
    invoice = _require_invoice(supabase, invoice_id, org["id"])
    lines = _get_lines(supabase, invoice_id)
    # Attach lines to the response for convenience (not in InvoiceResponse model
    # but avoids a second round-trip when callers need them)
    invoice["lines"] = lines
    return InvoiceResponse(**{k: v for k, v in invoice.items() if k != "lines"})


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    body: InvoiceCreate,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> InvoiceResponse:
    """Update a draft invoice and its line items."""
    org = _get_org(supabase, current_user["id"])
    invoice = _require_invoice(supabase, invoice_id, org["id"])

    if invoice["status"] != "draft":
        raise HTTPException(
            status_code=409,
            detail=f"Invoice cannot be edited in status '{invoice['status']}'. Only drafts can be edited.",
        )

    # Verify client ownership
    client_result = (
        supabase.table("clients")
        .select("id")
        .eq("id", body.client_id)
        .eq("organization_id", org["id"])
        .limit(1)
        .execute()
    )
    if not client_result.data:
        raise HTTPException(status_code=404, detail="Client not found")

    deadline_date = calculate_deadline(body.issue_date)
    subtotal = sum(float(ln.line_total) for ln in body.lines)
    vat_amount = sum(
        round(float(ln.line_total) * float(ln.vat_rate) / 100, 2) for ln in body.lines
    )
    total_amount = subtotal + vat_amount

    now = datetime.now(timezone.utc).isoformat()
    updates = {
        "client_id": body.client_id,
        "issue_date": body.issue_date.isoformat(),
        "due_date": body.due_date.isoformat(),
        "currency": body.currency,
        "invoice_type": body.invoice_type,
        "subtotal_amount": subtotal,
        "vat_amount": vat_amount,
        "total_amount": total_amount,
        "deadline_date": deadline_date.isoformat(),
        "notes": body.notes,
        "updated_at": now,
    }

    inv_result = (
        supabase.table("invoices").update(updates).eq("id", invoice_id).execute()
    )
    if not inv_result.data:
        raise HTTPException(status_code=500, detail="Failed to update invoice")

    # Replace all line items
    supabase.table("invoice_lines").delete().eq("invoice_id", invoice_id).execute()
    lines_payload = [
        {
            "invoice_id": invoice_id,
            "line_number": ln.line_number,
            "description": ln.description,
            "quantity": float(ln.quantity),
            "unit_code": ln.unit_code,
            "unit_price": float(ln.unit_price),
            "vat_rate": float(ln.vat_rate),
            "vat_category_code": ln.vat_category_code,
            "line_total": float(ln.line_total),
            "created_at": now,
        }
        for ln in body.lines
    ]
    supabase.table("invoice_lines").insert(lines_payload).execute()

    logger.info("Updated invoice %s", invoice_id)
    return InvoiceResponse(**inv_result.data[0])


@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(
    invoice_id: str,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> None:
    """Delete a draft invoice and all its line items."""
    org = _get_org(supabase, current_user["id"])
    invoice = _require_invoice(supabase, invoice_id, org["id"])

    if invoice["status"] != "draft":
        raise HTTPException(
            status_code=409,
            detail=f"Invoice cannot be deleted in status '{invoice['status']}'. Only drafts can be deleted.",
        )

    # Cascade-delete lines first (Supabase RLS may not auto-cascade via FK)
    supabase.table("invoice_lines").delete().eq("invoice_id", invoice_id).execute()
    supabase.table("invoices").delete().eq("id", invoice_id).execute()
    logger.info("Deleted invoice %s", invoice_id)


@router.post("/{invoice_id}/generate-xml", response_model=InvoiceResponse)
async def generate_xml(
    invoice_id: str,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> InvoiceResponse:
    """Generate the UBL 2.1 XML for an invoice and transition it to 'generated' status."""
    org = _get_org(supabase, current_user["id"])
    invoice = _require_invoice(supabase, invoice_id, org["id"])

    if invoice["status"] not in ("draft", "generated"):
        raise HTTPException(
            status_code=409,
            detail=f"XML can only be generated for draft/generated invoices, not '{invoice['status']}'.",
        )

    # Fetch client and lines
    client_result = (
        supabase.table("clients")
        .select("*")
        .eq("id", invoice["client_id"])
        .limit(1)
        .execute()
    )
    if not client_result.data:
        raise HTTPException(status_code=404, detail="Client record not found")
    client = client_result.data[0]

    lines = _get_lines(supabase, invoice_id)
    if not lines:
        raise HTTPException(status_code=422, detail="Invoice has no line items")

    try:
        xml_content = build_invoice_xml(invoice, org, client, lines)
    except Exception as exc:
        logger.error("XML generation failed for invoice %s: %s", invoice_id, exc)
        raise HTTPException(status_code=500, detail=f"XML generation failed: {exc}")

    now = datetime.now(timezone.utc).isoformat()
    result = (
        supabase.table("invoices")
        .update({"xml_content": xml_content, "status": "generated", "updated_at": now})
        .eq("id", invoice_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save XML content")

    logger.info("Generated XML for invoice %s", invoice_id)
    return InvoiceResponse(**result.data[0])


@router.post("/{invoice_id}/submit", response_model=InvoiceResponse)
async def submit_invoice(
    invoice_id: str,
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> InvoiceResponse:
    """Upload a generated invoice XML to ANAF and set status to 'uploaded'."""
    org = _get_org(supabase, current_user["id"])
    invoice = _require_invoice(supabase, invoice_id, org["id"])

    if invoice["status"] != "generated":
        raise HTTPException(
            status_code=409,
            detail=f"Only 'generated' invoices can be submitted. Current status: '{invoice['status']}'.",
        )

    xml_content = invoice.get("xml_content")
    if not xml_content:
        raise HTTPException(status_code=422, detail="No XML content found. Generate XML first.")

    # Get a valid ANAF access token (auto-refreshes if needed)
    try:
        token = await get_valid_token(org, supabase)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    cif = org.get("cui", "").lstrip("RO")
    b2c = invoice.get("invoice_type") == "b2c"

    try:
        upload_id = await upload_invoice(xml_content, cif, token, b2c=b2c)
    except Exception as exc:
        logger.error("ANAF upload failed for invoice %s: %s", invoice_id, exc)
        raise HTTPException(status_code=502, detail=f"ANAF upload failed: {exc}")

    now = datetime.now(timezone.utc).isoformat()
    result = (
        supabase.table("invoices")
        .update({
            "status": "uploaded",
            "anaf_upload_id": upload_id,
            "submitted_at": now,
            "updated_at": now,
        })
        .eq("id", invoice_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update invoice after upload")

    logger.info("Invoice %s submitted to ANAF, id_incarcare=%s", invoice_id, upload_id)
    return InvoiceResponse(**result.data[0])

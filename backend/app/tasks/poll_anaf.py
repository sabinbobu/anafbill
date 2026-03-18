import logging
from datetime import datetime, timezone

from . import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.poll_anaf.poll_pending_invoices", bind=True, max_retries=3)
def poll_pending_invoices(self) -> dict:
    """Poll ANAF for status updates on all uploaded/pending invoices.

    Runs every 5 minutes via Celery Beat. For each invoice:
    - "in prelucrare" → keep as pending, retry later
    - "ok"            → download signed XML, set status=accepted
    - "nok"           → set status=rejected, store error message
    """
    import asyncio
    from supabase import create_client
    from ..config import settings
    from ..services.anaf_oauth import get_valid_token
    from ..services.anaf_client import check_status, download_response, extract_signed_xml

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    result = (
        supabase.table("invoices")
        .select("*, organizations(*)")
        .in_("status", ["uploaded", "pending"])
        .not_.is_("anaf_upload_id", "null")
        .execute()
    )
    invoices = result.data or []
    if not invoices:
        return {"polled": 0}

    polled = accepted = rejected = 0

    async def process() -> None:
        nonlocal polled, accepted, rejected
        for invoice in invoices:
            upload_id = invoice.get("anaf_upload_id")
            org = invoice.get("organizations") or {}
            if not upload_id or not org:
                continue

            try:
                token = await get_valid_token(org, supabase)
            except ValueError:
                logger.warning(
                    "Skipping invoice %s — ANAF token unavailable for org %s",
                    invoice["id"], org.get("id"),
                )
                continue

            try:
                status_data = await check_status(upload_id, token)
            except Exception as exc:
                logger.error("Failed to check ANAF status for invoice %s: %s", invoice["id"], exc)
                continue

            polled += 1
            stare = status_data["status"]
            now = datetime.now(timezone.utc).isoformat()

            if stare == "ok":
                download_id = status_data.get("download_id")
                signed_xml = None
                if download_id:
                    try:
                        zip_bytes = await download_response(download_id, token)
                        signed_xml = extract_signed_xml(zip_bytes)
                    except Exception as exc:
                        logger.error("Failed to download signed XML for %s: %s", invoice["id"], exc)

                supabase.table("invoices").update({
                    "status": "accepted",
                    "anaf_download_id": download_id,
                    "anaf_response_xml": signed_xml,
                    "updated_at": now,
                }).eq("id", invoice["id"]).execute()
                accepted += 1
                logger.info("Invoice %s accepted by ANAF", invoice["id"])

            elif stare in ("nok", "xml cu erori neprelucrat"):
                errors = status_data.get("errors", [])
                error_msg = "; ".join(errors) if errors else stare
                supabase.table("invoices").update({
                    "status": "rejected",
                    "anaf_error_message": error_msg,
                    "updated_at": now,
                }).eq("id", invoice["id"]).execute()
                rejected += 1
                logger.warning("Invoice %s rejected by ANAF: %s", invoice["id"], error_msg)

            elif stare == "in prelucrare":
                if invoice["status"] == "uploaded":
                    supabase.table("invoices").update({
                        "status": "pending",
                        "updated_at": now,
                    }).eq("id", invoice["id"]).execute()

    asyncio.run(process())
    logger.info("ANAF poll: %d polled, %d accepted, %d rejected", polled, accepted, rejected)
    return {"polled": polled, "accepted": accepted, "rejected": rejected}

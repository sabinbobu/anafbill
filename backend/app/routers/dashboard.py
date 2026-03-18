import logging
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException
from ..dependencies import CurrentUser, SupabaseClient

logger = logging.getLogger(__name__)
router = APIRouter()

_PENDING_STATUSES = ("generated", "uploaded", "pending")
_TERMINAL_STATUSES = ("accepted", "archived")


def _get_org_id(supabase, user_id: str) -> str:
    result = (
        supabase.table("organizations")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Organization not found")
    return result.data[0]["id"]


@router.get("/")
async def get_dashboard(
    current_user: CurrentUser,
    supabase: SupabaseClient,
) -> dict:
    """Return dashboard statistics for the authenticated user's organization."""
    org_id = _get_org_id(supabase, current_user["id"])

    # Fetch all invoices for the org (we aggregate in Python to avoid multiple queries)
    result = (
        supabase.table("invoices")
        .select("id, status, deadline_date, total_amount, issue_date, invoice_number, client_id")
        .eq("organization_id", org_id)
        .execute()
    )
    invoices: list[dict] = result.data or []

    today = date.today()
    first_of_month = today.replace(day=1)
    deadline_warning_horizon = today + timedelta(days=3)

    total_invoices = len(invoices)
    pending_submission = 0
    overdue_count = 0
    accepted_this_month = 0
    total_value_this_month = 0.0
    upcoming_deadlines: list[dict] = []

    for inv in invoices:
        status: str = inv.get("status", "")
        deadline_raw: str | None = inv.get("deadline_date")
        issue_raw: str | None = inv.get("issue_date")

        deadline: date | None = None
        if deadline_raw:
            try:
                deadline = date.fromisoformat(deadline_raw)
            except ValueError:
                pass

        issue_date: date | None = None
        if issue_raw:
            try:
                issue_date = date.fromisoformat(issue_raw)
            except ValueError:
                pass

        # Pending submission
        if status in _PENDING_STATUSES:
            pending_submission += 1

        # Overdue: deadline passed and not yet in a terminal state
        if (
            deadline
            and deadline < today
            and status not in _TERMINAL_STATUSES
            and status != "draft"
        ):
            overdue_count += 1

        # Accepted this month
        if status == "accepted" and issue_date and issue_date >= first_of_month:
            accepted_this_month += 1
            total_value_this_month += float(inv.get("total_amount") or 0)

        # Upcoming deadlines (within the next 3 calendar days, not yet accepted/archived)
        if (
            deadline
            and today <= deadline <= deadline_warning_horizon
            and status not in _TERMINAL_STATUSES
        ):
            upcoming_deadlines.append(
                {
                    "id": inv.get("id"),
                    "invoice_number": inv.get("invoice_number"),
                    "deadline_date": deadline_raw,
                    "status": status,
                }
            )

    # Sort upcoming deadlines by deadline date ascending
    upcoming_deadlines.sort(key=lambda x: x["deadline_date"] or "")

    return {
        "total_invoices": total_invoices,
        "pending_submission": pending_submission,
        "overdue": overdue_count,
        "accepted_this_month": accepted_this_month,
        "total_value_this_month": round(total_value_this_month, 2),
        "upcoming_deadlines": upcoming_deadlines,
    }

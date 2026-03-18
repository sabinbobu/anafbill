from celery import Celery
from ..config import settings

celery_app = Celery(
    "anafbill",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.poll_anaf", "app.tasks.daily_deadlines", "app.tasks.send_alerts"],
)

celery_app.conf.beat_schedule = {
    "poll-anaf-status": {
        "task": "app.tasks.poll_anaf.poll_pending_invoices",
        "schedule": 300.0,  # every 5 minutes
    },
    "daily-deadlines": {
        "task": "app.tasks.daily_deadlines.recalculate_deadlines",
        "schedule": 86400.0,  # once per day
    },
}

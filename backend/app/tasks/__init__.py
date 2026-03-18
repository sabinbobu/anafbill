from celery import Celery
from ..config import settings

celery_app = Celery(
    "facturai",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.poll_anaf", "app.tasks.daily_deadlines", "app.tasks.send_alerts"],
)

celery_app.conf.beat_schedule = {
    "daily-deadlines": {
        "task": "app.tasks.daily_deadlines.recalculate_deadlines",
        "schedule": 86400.0,  # once per day
    },
}

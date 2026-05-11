from celery import Celery
from app.config import settings

celery_app = Celery(
    "applicant_portal",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Moscow",
    enable_utc=True,
    # Результат хранится 1 час
    result_expires=3600,
)
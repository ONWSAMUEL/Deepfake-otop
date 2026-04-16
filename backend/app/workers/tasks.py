"""Celery tasks — background AI processing."""
import os
import json
import logging

from celery import Celery
import redis as redis_lib

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Shared Redis connection pool ─────────────────────────────────────────────
# One pool per worker process — avoids opening a new TCP connection on every call.
_redis_pool = redis_lib.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=False)


def _redis() -> redis_lib.Redis:
    return redis_lib.Redis(connection_pool=_redis_pool)


def _publish(job_id: str, payload: dict):
    """Push a JSON message to the Redis pub/sub channel for this job."""
    _redis().publish(f"job:{job_id}", json.dumps(payload))


# ─── Celery app ───────────────────────────────────────────────────────────────
celery_app = Celery(
    "deepfake_otop",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)
celery_app.conf.update(
    task_routes={"app.workers.tasks.*": {"queue": "deepfake"}},
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_prefetch_multiplier=1,  # one heavy GPU task at a time
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _build_result_url(filename: str) -> str:
    """
    Build an absolute result URL that remote clients can reach.

    In a Celery worker there is no HTTP request context, so we rely on
    EXTERNAL_BASE_URL (set via env var in production).  Falls back to a
    relative path in local dev where the API and worker share the same host.
    """
    from app.services.storage import storage
    base = settings.EXTERNAL_BASE_URL.rstrip("/") if settings.EXTERNAL_BASE_URL else None
    return storage.get_url(f"outputs/{filename}", base_url=base or "")


# ─── Main processing task ─────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="process_deepfake",
    max_retries=0,
    soft_time_limit=3600,
)
def process_deepfake(
    self,
    job_id: str,
    source_video_path: str,
    target_image_path: str,
    output_path: str,
    options: dict,
):
    """
    Execute the full deepfake pipeline as a background Celery task.

    Publishes progress to Redis pub/sub so the API WebSocket layer can relay
    updates to connected clients.  All job state is stored in Redis so both
    the API process and the worker process see a consistent view.
    """
    from app.services import job_manager
    from app.services.pipeline import pipeline
    from app.models.schemas import JobOptions

    job_options = JobOptions(**options)

    def progress_cb(step: str, percent: int, message: str = ""):
        job_manager.update_progress(job_id, step, percent, message)
        _publish(job_id, {
            "type": "progress",
            "job_id": job_id,
            "step": step,
            "progress": percent,
            "message": message,
        })

    try:
        job_manager.update_progress(job_id, "Démarrage", 0, "Initialisation du pipeline...")
        _publish(job_id, {
            "type": "progress",
            "job_id": job_id,
            "step": "Démarrage",
            "progress": 0,
            "message": "Initialisation du pipeline...",
        })

        output = pipeline.process(
            source_video_path=source_video_path,
            target_image_path=target_image_path,
            output_path=output_path,
            options=job_options,
            progress_cb=progress_cb,
        )

        filename = os.path.basename(output)
        result_url = _build_result_url(filename)

        job_manager.mark_completed(job_id, result_url)
        _publish(job_id, {"type": "completed", "job_id": job_id, "result_url": result_url})

        return {"status": "completed", "result_url": result_url}

    except Exception as exc:
        error_msg = str(exc)
        logger.exception(f"Job {job_id} failed: {error_msg}")
        job_manager.mark_failed(job_id, error_msg)
        _publish(job_id, {"type": "error", "job_id": job_id, "error": error_msg})
        raise

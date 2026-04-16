"""Celery tasks — background AI processing."""
import os
import logging
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure

from app.config import settings

logger = logging.getLogger(__name__)

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


# ─── WebSocket progress publisher ────────────────────────────────────────────

def _publish_progress(job_id: str, step: str, percent: int, message: str = ""):
    """Push progress updates to Redis pub/sub for WebSocket relay."""
    import redis
    import json

    r = redis.from_url(settings.REDIS_URL)
    payload = json.dumps(
        {"type": "progress", "job_id": job_id, "step": step, "progress": percent, "message": message}
    )
    r.publish(f"job:{job_id}", payload)


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

    Updates Redis pub/sub with progress; updates job_manager state.
    """
    from app.services import job_manager
    from app.services.pipeline import pipeline
    from app.models.schemas import JobOptions

    job_options = JobOptions(**options)

    def progress_cb(step: str, percent: int, message: str = ""):
        job_manager.update_progress(job_id, step, percent, message)
        _publish_progress(job_id, step, percent, message)

    try:
        job_manager.update_progress(job_id, "Démarrage", 0, "Initialisation du pipeline...")
        _publish_progress(job_id, "Démarrage", 0, "Initialisation du pipeline...")

        output = pipeline.process(
            source_video_path=source_video_path,
            target_image_path=target_image_path,
            output_path=output_path,
            options=job_options,
            progress_cb=progress_cb,
        )

        # Determine public URL
        from app.services.storage import storage
        from app.config import settings as cfg
        filename = os.path.basename(output)
        result_url = storage.get_url(f"outputs/{filename}")

        job_manager.mark_completed(job_id, result_url)

        import redis, json
        r = redis.from_url(settings.REDIS_URL)
        r.publish(
            f"job:{job_id}",
            json.dumps({"type": "completed", "job_id": job_id, "result_url": result_url}),
        )

        return {"status": "completed", "result_url": result_url}

    except Exception as exc:
        error_msg = str(exc)
        logger.exception(f"Job {job_id} failed: {error_msg}")
        job_manager.mark_failed(job_id, error_msg)

        import redis, json
        r = redis.from_url(settings.REDIS_URL)
        r.publish(
            f"job:{job_id}",
            json.dumps({"type": "error", "job_id": job_id, "error": error_msg}),
        )
        raise

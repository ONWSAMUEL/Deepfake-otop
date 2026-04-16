"""Redis-backed job registry — shared between API and Celery worker."""
import uuid
import json
import logging
from datetime import datetime
from typing import Optional

import redis as redis_lib

from app.config import settings
from app.models.schemas import JobStatus, JobProgress, JobResponse

logger = logging.getLogger(__name__)

# Shared connection pool — all processes reuse the same pool instance per worker
_pool = redis_lib.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)

# Job TTL: 24 hours (auto-clean old jobs from Redis)
_JOB_TTL_SECONDS = 60 * 60 * 24


def _r() -> redis_lib.Redis:
    return redis_lib.Redis(connection_pool=_pool)


def _key(job_id: str) -> str:
    return f"job_meta:{job_id}"


def create_job(source_video_id: str, target_image_id: str, options: dict) -> str:
    """Register a new job in Redis and return its ID."""
    job_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    data = {
        "id": job_id,
        "status": JobStatus.PENDING.value,
        "step": "En attente",
        "progress": "0",
        "message": "",
        "source_video_id": source_video_id,
        "target_image_id": target_image_id,
        "options": json.dumps(options),
        "result_url": "",
        "error": "",
        "created_at": now,
        "updated_at": now,
    }
    r = _r()
    r.hset(_key(job_id), mapping=data)
    r.expire(_key(job_id), _JOB_TTL_SECONDS)
    logger.info(f"Job created: {job_id}")
    return job_id


def update_progress(job_id: str, step: str, percent: int, message: str = ""):
    r = _r()
    if not r.exists(_key(job_id)):
        return
    r.hset(_key(job_id), mapping={
        "status": JobStatus.PROCESSING.value,
        "step": step,
        "progress": str(percent),
        "message": message,
        "updated_at": datetime.utcnow().isoformat(),
    })


def mark_completed(job_id: str, result_url: str):
    r = _r()
    if not r.exists(_key(job_id)):
        return
    r.hset(_key(job_id), mapping={
        "status": JobStatus.COMPLETED.value,
        "step": "Terminé",
        "progress": "100",
        "message": "",
        "result_url": result_url,
        "updated_at": datetime.utcnow().isoformat(),
    })
    logger.info(f"Job {job_id} completed → {result_url}")


def mark_failed(job_id: str, error: str):
    r = _r()
    if not r.exists(_key(job_id)):
        return
    r.hset(_key(job_id), mapping={
        "status": JobStatus.FAILED.value,
        "error": error,
        "updated_at": datetime.utcnow().isoformat(),
    })
    logger.error(f"Job {job_id} failed: {error}")


def get_job(job_id: str) -> Optional[dict]:
    return _r().hgetall(_key(job_id)) or None


def get_job_response(job_id: str) -> Optional[JobResponse]:
    job = get_job(job_id)
    if job is None:
        return None
    return JobResponse(
        id=job["id"],
        status=JobStatus(job["status"]),
        progress=JobProgress(
            step=job.get("step", ""),
            progress=int(job.get("progress", 0)),
            message=job.get("message", ""),
        ),
        result_url=job.get("result_url") or None,
        error=job.get("error") or None,
        created_at=datetime.fromisoformat(job["created_at"]),
        updated_at=datetime.fromisoformat(job["updated_at"]),
    )

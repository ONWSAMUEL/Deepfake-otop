"""In-memory job registry with Redis-backed persistence via Celery results."""
import uuid
import logging
from datetime import datetime
from typing import Dict, Optional

from app.models.schemas import JobStatus, JobProgress, JobResponse

logger = logging.getLogger(__name__)

# In-process store (supplemented by Celery result backend in production)
_jobs: Dict[str, dict] = {}


def create_job(source_video_id: str, target_image_id: str, options: dict) -> str:
    """Register a new job and return its ID."""
    job_id = str(uuid.uuid4())
    now = datetime.utcnow()
    _jobs[job_id] = {
        "id": job_id,
        "status": JobStatus.PENDING,
        "progress": {"step": "En attente", "progress": 0, "message": ""},
        "source_video_id": source_video_id,
        "target_image_id": target_image_id,
        "options": options,
        "result_url": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
    }
    logger.info(f"Job created: {job_id}")
    return job_id


def update_progress(job_id: str, step: str, percent: int, message: str = ""):
    if job_id not in _jobs:
        return
    _jobs[job_id]["status"] = JobStatus.PROCESSING
    _jobs[job_id]["progress"] = {"step": step, "progress": percent, "message": message}
    _jobs[job_id]["updated_at"] = datetime.utcnow()


def mark_completed(job_id: str, result_url: str):
    if job_id not in _jobs:
        return
    _jobs[job_id]["status"] = JobStatus.COMPLETED
    _jobs[job_id]["progress"] = {"step": "Terminé", "progress": 100, "message": ""}
    _jobs[job_id]["result_url"] = result_url
    _jobs[job_id]["updated_at"] = datetime.utcnow()
    logger.info(f"Job {job_id} completed → {result_url}")


def mark_failed(job_id: str, error: str):
    if job_id not in _jobs:
        return
    _jobs[job_id]["status"] = JobStatus.FAILED
    _jobs[job_id]["error"] = error
    _jobs[job_id]["updated_at"] = datetime.utcnow()
    logger.error(f"Job {job_id} failed: {error}")


def get_job(job_id: str) -> Optional[dict]:
    return _jobs.get(job_id)


def get_job_response(job_id: str) -> Optional[JobResponse]:
    job = get_job(job_id)
    if job is None:
        return None
    return JobResponse(
        id=job["id"],
        status=job["status"],
        progress=JobProgress(**job["progress"]),
        result_url=job.get("result_url"),
        error=job.get("error"),
        created_at=job["created_at"],
        updated_at=job["updated_at"],
    )

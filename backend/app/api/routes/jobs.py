"""Job creation and status endpoints."""
import re
import uuid
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.deps import limiter, require_api_key
from app.config import settings
from app.models.schemas import JobCreate, JobResponse
from app.services import job_manager
from app.services.storage import storage
# M11: Module-level import avoids repeated import overhead and circular import risk
from app.workers.tasks import process_deepfake

router = APIRouter(prefix="/jobs", tags=["Jobs"])
logger = logging.getLogger(__name__)


@router.post("", response_model=JobResponse, status_code=202)
@limiter.limit(settings.RATE_LIMIT_JOB)  # C2: rate limit per IP
async def create_job(
    request: Request,
    payload: JobCreate,
    _auth=Depends(require_api_key),  # C1: API key auth
):
    """
    Create a new deepfake processing job.

    - **source_video_id**: ID of the uploaded driving video.
    - **target_image_id**: ID of the uploaded target person image.
    - **options**: Processing options (lip sync, relative motion, etc.).
    """
    # Resolve local paths for source video and target image
    source_video_path = _resolve_upload_path(payload.source_video_id)
    target_image_path = _resolve_upload_path(payload.target_image_id)

    # Output file path
    output_filename = f"{uuid.uuid4()}.mp4"
    output_path = str(settings.OUTPUT_DIR / output_filename)

    # Register job
    job_id = job_manager.create_job(
        source_video_id=payload.source_video_id,
        target_image_id=payload.target_image_id,
        options=payload.options.model_dump(),
    )

    # Dispatch Celery task
    process_deepfake.apply_async(
        kwargs={
            "job_id": job_id,
            "source_video_path": source_video_path,
            "target_image_path": target_image_path,
            "output_path": output_path,
            "options": payload.options.model_dump(),
        },
        queue="deepfake",
        task_id=job_id,
    )

    logger.info(f"Job {job_id} dispatched")
    return job_manager.get_job_response(job_id)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    request: Request,
    _auth=Depends(require_api_key),  # C1: API key auth
):
    """Get the current status of a processing job."""
    if not _UUID_RE.match(job_id):
        raise HTTPException(400, "ID de job invalide.")
    job = job_manager.get_job_response(job_id)
    if job is None:
        raise HTTPException(404, f"Job {job_id} introuvable.")

    # Enrich result URL with base URL if local
    if job.result_url and not job.result_url.startswith("http"):
        base = str(request.base_url).rstrip("/")
        job.result_url = f"{base}/files/{Path(job.result_url).name}"

    return job


# ─── Helpers ──────────────────────────────────────────────────────────────────

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _resolve_upload_path(file_id: str) -> str:
    """Find the uploaded file by its UUID on local storage.

    Validates the ID is a proper UUID to prevent path traversal attacks —
    a glob on unsanitised input would allow an attacker to escape UPLOAD_DIR.
    """
    if not _UUID_RE.match(file_id):
        raise HTTPException(400, "ID de fichier invalide.")
    upload_dir = settings.UPLOAD_DIR
    matches = list(upload_dir.glob(f"{file_id}.*"))
    if not matches:
        raise HTTPException(
            404,
            f"Fichier {file_id} introuvable. Veuillez d'abord l'uploader via /api/v1/media/upload.",
        )
    return str(matches[0])

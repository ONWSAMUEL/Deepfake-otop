"""Media upload & download endpoints."""
import uuid
import os
import logging
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import FileResponse

from app.config import settings
from app.models.schemas import MediaType, UploadResponse
from app.services.storage import storage

router = APIRouter(prefix="/media", tags=["Media"])
logger = logging.getLogger(__name__)

ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _validate_file(file: UploadFile, media_type: MediaType) -> None:
    if media_type == MediaType.SOURCE_VIDEO:
        if file.content_type not in ALLOWED_VIDEO_TYPES:
            raise HTTPException(
                400, f"Type de fichier invalide: {file.content_type}. Attendu: MP4, MOV, AVI ou WebM."
            )
        max_bytes = settings.MAX_VIDEO_SIZE_MB * 1024 * 1024
    else:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                400, f"Type de fichier invalide: {file.content_type}. Attendu: JPEG, PNG ou WebP."
            )
        max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024

    # Check file size via content-length header (not always present)
    if file.size and file.size > max_bytes:
        raise HTTPException(
            413,
            f"Fichier trop volumineux ({file.size // (1024*1024)} Mo). "
            f"Maximum: {max_bytes // (1024*1024)} Mo.",
        )


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    media_type: MediaType = Form(...),
):
    """Upload a source video or target person image."""
    _validate_file(file, media_type)

    ext = Path(file.filename or "file").suffix.lower() or (
        ".mp4" if media_type == MediaType.SOURCE_VIDEO else ".jpg"
    )
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{ext}"

    content = await file.read()

    if len(content) == 0:
        raise HTTPException(400, "Le fichier est vide.")

    key = storage.save_upload(content, filename)
    url = storage.get_url(key, base_url=str(request.base_url).rstrip("/"))

    logger.info(f"Uploaded {media_type.value}: {filename} ({len(content)} bytes)")
    return UploadResponse(
        file_id=file_id,
        filename=filename,
        size_bytes=len(content),
        media_type=media_type,
        url=url,
    )


@router.get("/files/{filename}")
async def serve_file(filename: str):
    """Serve locally stored files (development mode)."""
    # Try uploads first, then outputs
    for directory in (settings.UPLOAD_DIR, settings.OUTPUT_DIR):
        path = directory / filename
        if path.exists():
            return FileResponse(str(path))
    raise HTTPException(404, "Fichier introuvable.")

"""Media upload & download endpoints."""
import sys
import uuid
import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import FileResponse

from app.api.deps import limiter, require_api_key
from app.config import settings
from app.models.schemas import MediaType, UploadResponse
from app.services import video_processor as _vp
from app.services.storage import storage

router = APIRouter(prefix="/media", tags=["Media"])
logger = logging.getLogger(__name__)

ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

_video_proc = _vp.VideoProcessor()


def _max_bytes(media_type: MediaType) -> int:
    if media_type == MediaType.SOURCE_VIDEO:
        return settings.MAX_VIDEO_SIZE_MB * 1024 * 1024
    return settings.MAX_IMAGE_SIZE_MB * 1024 * 1024


def _validate_content_type(file: UploadFile, media_type: MediaType) -> None:
    if media_type == MediaType.SOURCE_VIDEO:
        if file.content_type not in ALLOWED_VIDEO_TYPES:
            raise HTTPException(
                400,
                f"Type de fichier invalide: {file.content_type}. Attendu: MP4, MOV, AVI ou WebM.",
            )
    else:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                400,
                f"Type de fichier invalide: {file.content_type}. Attendu: JPEG, PNG ou WebP.",
            )


@router.post("/upload", response_model=UploadResponse)
@limiter.limit(settings.RATE_LIMIT_UPLOAD)  # C2: rate limit per IP
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    media_type: MediaType = Form(...),
    _auth=Depends(require_api_key),  # C1: API key auth
):
    """Upload a source video or target person image.

    The file is streamed chunk-by-chunk to a temporary location on disk so we
    never load the entire payload into memory.  Size enforcement happens during
    streaming — an oversized upload is rejected as soon as the limit is hit
    without buffering the rest.
    """
    _validate_content_type(file, media_type)

    max_bytes = _max_bytes(media_type)

    # Pre-check Content-Length header when present (fast path)
    cl = request.headers.get("content-length")
    if cl and int(cl) > max_bytes:
        raise HTTPException(
            413,
            f"Fichier trop volumineux. Maximum: {max_bytes // (1024 * 1024)} Mo.",
        )

    ext = Path(file.filename or "file").suffix.lower() or (
        ".mp4" if media_type == MediaType.SOURCE_VIDEO else ".jpg"
    )
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{ext}"

    # Stream to a temp file inside UPLOAD_DIR so rename() is atomic (same FS)
    tmp_path: Path | None = None
    written = 0
    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".tmp", dir=str(settings.UPLOAD_DIR)
        ) as tmp:
            tmp_path = Path(tmp.name)
            async for chunk in file:
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        413,
                        f"Fichier trop volumineux. Maximum: {max_bytes // (1024 * 1024)} Mo.",
                    )
                tmp.write(chunk)
    except HTTPException:
        if tmp_path and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        raise

    if written == 0:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(400, "Le fichier est vide.")

    # Atomically rename to final name
    final_path = settings.UPLOAD_DIR / filename
    tmp_path.rename(final_path)

    # M2: Validate video duration after upload
    if media_type == MediaType.SOURCE_VIDEO:
        try:
            info = _video_proc.get_video_info(str(final_path))
            max_dur = settings.MAX_VIDEO_DURATION_SECONDS
            if info["duration_seconds"] > max_dur:
                final_path.unlink(missing_ok=True)
                raise HTTPException(
                    400,
                    f"Vidéo trop longue ({info['duration_seconds']:.0f}s). Maximum: {max_dur}s.",
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Could not validate video duration: {e}")

    # Build storage key and public URL
    key = f"uploads/{filename}"
    if settings.STORAGE_BACKEND == "s3":
        # M3: Use streaming upload rather than loading the entire file into RAM
        storage.save_upload_file(str(final_path), filename)
        key = f"uploads/{filename}"
        final_path.unlink(missing_ok=True)

    url = storage.get_url(key, base_url=str(request.base_url).rstrip("/"))

    logger.info(f"Uploaded {media_type.value}: {filename} ({written} bytes)")
    return UploadResponse(
        file_id=file_id,
        filename=filename,
        size_bytes=written,
        media_type=media_type,
        url=url,
    )


@router.get("/files/{filename}")
async def serve_file(filename: str):
    """Serve locally stored files (development mode)."""
    # Reject any path traversal attempt — keep only the bare filename
    safe_name = Path(filename).name
    if safe_name != filename or not safe_name:
        raise HTTPException(400, "Nom de fichier invalide.")
    for directory in (settings.UPLOAD_DIR, settings.OUTPUT_DIR):
        path = directory / safe_name
        if path.exists():
            return FileResponse(str(path))
    raise HTTPException(404, "Fichier introuvable.")

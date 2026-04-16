"""
Abstracted file storage — local filesystem or AWS S3.
Configured via STORAGE_BACKEND environment variable.
"""
import logging
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Handles file persistence (local or S3) and URL generation."""

    def __init__(self):
        self.backend = settings.STORAGE_BACKEND

    # ─── Save ────────────────────────────────────────────────────────────────

    def save_upload_file(self, local_path: str, filename: str, subfolder: str = "uploads") -> str:
        """Upload a local file to S3 using streaming (no RAM spike).
        M3: boto3.upload_file() streams directly from disk.
        """
        key = f"{subfolder}/{filename}"
        if self.backend == "s3":
            return self._s3_upload_file(local_path, key)
        # Local backend: file is already in UPLOAD_DIR — nothing to copy
        return f"uploads/{filename}"

    def save_output(self, src_path: str, filename: str) -> str:
        """Copy a processed output file to storage and return the key."""
        key = f"outputs/{filename}"
        if self.backend == "s3":
            return self._s3_upload_file(src_path, key)
        # Local: just copy to OUTPUT_DIR
        import shutil
        dest = settings.OUTPUT_DIR / filename
        shutil.copy2(src_path, dest)
        return key

    # ─── URL generation ───────────────────────────────────────────────────────

    def get_url(self, key: str, base_url: str = "") -> str:
        """Return a publicly accessible URL for the given storage key."""
        if self.backend == "s3":
            if settings.CLOUDFRONT_DOMAIN:
                return f"https://{settings.CLOUDFRONT_DOMAIN}/{key}"
            return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
        # Local: serve via /files/ endpoint
        filename = Path(key).name
        return f"{base_url}/files/{filename}"

    def get_local_path(self, key: str) -> str:
        """Return the absolute local filesystem path for a key."""
        if key.startswith("outputs/"):
            return str(settings.OUTPUT_DIR / Path(key).name)
        return str(settings.UPLOAD_DIR / Path(key).name)

    # ─── Internal ─────────────────────────────────────────────────────────────

    def _s3_upload_file(self, local_path: str, key: str) -> str:
        """M3: Stream a file to S3 using boto3 upload_file — avoids loading
        the entire file into memory (critical for 500 MB video uploads).
        """
        import boto3
        s3 = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        )
        extra = {"ContentType": self._content_type(key)}
        s3.upload_file(local_path, settings.S3_BUCKET_NAME, key, ExtraArgs=extra)
        logger.debug(f"Uploaded to S3: s3://{settings.S3_BUCKET_NAME}/{key}")
        return key

    @staticmethod
    def _content_type(key: str) -> str:
        ext = Path(key).suffix.lower()
        return {
            ".mp4": "video/mp4",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".wav": "audio/wav",
        }.get(ext, "application/octet-stream")


storage = StorageService()

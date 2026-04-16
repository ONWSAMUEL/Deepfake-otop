"""
Abstracted file storage — local filesystem or AWS S3.
Configured via STORAGE_BACKEND environment variable.
"""
import os
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

    def save_upload(self, file_bytes: bytes, filename: str, subfolder: str = "uploads") -> str:
        """Persist uploaded bytes and return the storage key."""
        if self.backend == "s3":
            return self._s3_put(file_bytes, f"{subfolder}/{filename}")
        return self._local_put(file_bytes, settings.UPLOAD_DIR / filename)

    def save_output(self, src_path: str, filename: str) -> str:
        """Copy a processed output file to storage and return the key."""
        with open(src_path, "rb") as f:
            data = f.read()
        if self.backend == "s3":
            return self._s3_put(data, f"outputs/{filename}")
        return self._local_put(data, settings.OUTPUT_DIR / filename)

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

    def _local_put(self, data: bytes, path: Path) -> str:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        logger.debug(f"Saved locally: {path}")
        # Key = relative to UPLOAD_DIR or OUTPUT_DIR
        if str(path).startswith(str(settings.OUTPUT_DIR)):
            return f"outputs/{path.name}"
        return f"uploads/{path.name}"

    def _s3_put(self, data: bytes, key: str) -> str:
        import boto3
        s3 = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        s3.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=key,
            Body=data,
            ContentType=self._content_type(key),
        )
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

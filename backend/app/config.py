from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Literal


class Settings(BaseSettings):
    # App
    APP_NAME: str = "DeepFake OTOP"
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production"

    # Storage
    STORAGE_BACKEND: Literal["local", "s3"] = "local"
    UPLOAD_DIR: Path = Path("/app/uploads")
    OUTPUT_DIR: Path = Path("/app/outputs")
    MODELS_DIR: Path = Path("/app/models")

    # AWS
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "deepfake-otop-media"
    CLOUDFRONT_DOMAIN: str = ""

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # AI model paths
    FOMM_DIR: Path = Path("/app/models/first-order-model")
    FOMM_CONFIG: str = "config/vox-256.yaml"
    FOMM_CHECKPOINT: Path = Path("/app/models/checkpoints/vox-cpk.pth.tar")

    WAV2LIP_DIR: Path = Path("/app/models/Wav2Lip")
    WAV2LIP_CHECKPOINT: Path = Path("/app/models/checkpoints/wav2lip_gan.pth")

    # Limits
    MAX_VIDEO_SIZE_MB: int = 500
    MAX_IMAGE_SIZE_MB: int = 20
    MAX_VIDEO_DURATION_SECONDS: int = 300
    PROCESSING_DEVICE: str = "auto"  # "auto" | "cuda" | "cpu"

    class Config:
        env_file = ".env"


settings = Settings()

# Ensure runtime directories exist
for _dir in (settings.UPLOAD_DIR, settings.OUTPUT_DIR):
    _dir.mkdir(parents=True, exist_ok=True)

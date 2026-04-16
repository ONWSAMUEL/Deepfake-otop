from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Literal


class Settings(BaseSettings):
    # App
    APP_NAME: str = "DeepFake OTOP"
    APP_ENV: str = "development"
    # C10: No default — the app will refuse to start if SECRET_KEY is not set
    SECRET_KEY: str

    # C1: API key for authenticating requests (leave empty to disable in local dev)
    API_KEY: str = ""

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

    # API / CORS
    # Absolute URL exposed to clients — used by Celery workers to build result URLs.
    # Example: "https://api.myapp.com"  Leave empty in local dev (auto-detected from request).
    EXTERNAL_BASE_URL: str = ""
    # Comma-separated list of allowed CORS origins.
    # Example: "https://app.myapp.com,https://staging.myapp.com"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Rate limiting (requests per minute per IP)
    RATE_LIMIT_UPLOAD: str = "20/minute"
    RATE_LIMIT_JOB: str = "10/minute"

    class Config:
        env_file = ".env"


settings = Settings()

# Ensure runtime directories exist
for _dir in (settings.UPLOAD_DIR, settings.OUTPUT_DIR):
    _dir.mkdir(parents=True, exist_ok=True)

from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime
import uuid


class MediaType(str, Enum):
    SOURCE_VIDEO = "source_video"
    TARGET_IMAGE = "target_image"


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStep(str, Enum):
    EXTRACTING_FRAMES = "Extraction des frames"
    EXTRACTING_AUDIO = "Extraction de l'audio"
    RUNNING_FOMM = "Animation FOMM (transfert de mouvements)"
    RUNNING_LIP_SYNC = "Synchronisation labiale (Wav2Lip)"
    RECONSTRUCTING_VIDEO = "Reconstruction de la vidéo"
    UPLOADING_RESULT = "Sauvegarde du résultat"


# ─── Upload ───────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    file_id: str
    filename: str
    size_bytes: int
    media_type: MediaType
    url: str


# ─── Jobs ────────────────────────────────────────────────────────────────────

class JobOptions(BaseModel):
    relative_motion: bool = Field(True, description="Utiliser le mouvement relatif (recommandé)")
    adapt_movement_scale: bool = Field(True, description="Adapter l'échelle des mouvements")
    lip_sync: bool = Field(True, description="Activer la synchronisation labiale")
    enhance_face: bool = Field(False, description="Post-traitement qualité (GFPGAN)")


class JobCreate(BaseModel):
    source_video_id: str = Field(..., description="ID de la vidéo source (fournit les mouvements)")
    target_image_id: str = Field(..., description="ID de l'image de la personne cible")
    options: JobOptions = Field(default_factory=JobOptions)


class JobProgress(BaseModel):
    step: str
    progress: int = Field(ge=0, le=100)
    message: str = ""


class JobResponse(BaseModel):
    id: str
    status: JobStatus
    progress: JobProgress
    result_url: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── WebSocket messages ───────────────────────────────────────────────────────

class WSMessage(BaseModel):
    type: str  # "progress" | "completed" | "error"
    job_id: str
    data: Dict[str, Any]

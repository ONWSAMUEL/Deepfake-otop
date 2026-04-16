"""FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.config import settings
from app.api.routes import media, jobs, websocket

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} ({settings.APP_ENV})")
    # Ensure directories exist
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    yield
    logger.info("Shutdown complete")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "API de remplacement de personne dans une vidéo par IA "
        "(First Order Motion Model + Wav2Lip)."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict in production via env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(media.router, prefix=API_PREFIX)
app.include_router(jobs.router, prefix=API_PREFIX)
app.include_router(websocket.router)   # WebSocket lives at /ws/jobs/{id}

# Static files for outputs (local dev)
if settings.STORAGE_BACKEND == "local":
    app.mount(
        "/files",
        StaticFiles(directory=str(settings.OUTPUT_DIR), check_dir=False),
        name="outputs",
    )


# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return JSONResponse({"status": "ok", "app": settings.APP_NAME})


@app.get("/", tags=["System"])
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API", "docs": "/docs"}

"""WebSocket endpoint for real-time job progress updates."""
import asyncio
import json
import logging
from typing import Dict, Set

import redis.asyncio as aioredis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings
from app.services import job_manager

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger(__name__)

# Active WebSocket connections per job_id
_connections: Dict[str, Set[WebSocket]] = {}


@router.websocket("/ws/jobs/{job_id}")
async def job_progress_ws(websocket: WebSocket, job_id: str):
    """
    Real-time progress stream for a processing job.

    Messages:
        { "type": "progress", "job_id": "...", "step": "...", "progress": 42, "message": "..." }
        { "type": "completed", "job_id": "...", "result_url": "https://..." }
        { "type": "error",     "job_id": "...", "error": "..." }
    """
    await websocket.accept()
    logger.info(f"WS connected for job {job_id}")

    # Immediately send current state
    job = job_manager.get_job_response(job_id)
    if job:
        await websocket.send_json(
            {"type": "progress", "job_id": job_id, **job.progress.model_dump()}
        )
        if job.status.value in ("completed", "failed"):
            await websocket.send_json(
                {
                    "type": "completed" if job.status.value == "completed" else "error",
                    "job_id": job_id,
                    "result_url": job.result_url,
                    "error": job.error,
                }
            )
            await websocket.close()
            return

    # Subscribe to Redis pub/sub channel
    try:
        r = aioredis.from_url(settings.REDIS_URL)
        pubsub = r.pubsub()
        await pubsub.subscribe(f"job:{job_id}")

        async def listen():
            async for msg in pubsub.listen():
                if msg["type"] != "message":
                    continue
                try:
                    data = json.loads(msg["data"])
                    await websocket.send_json(data)
                    if data.get("type") in ("completed", "error"):
                        break
                except Exception as e:
                    logger.warning(f"WS send error: {e}")
                    break

        await asyncio.wait_for(listen(), timeout=3600)

    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    except Exception as e:
        logger.error(f"WS error for job {job_id}: {e}")
    finally:
        try:
            await pubsub.unsubscribe(f"job:{job_id}")
            await r.aclose()
        except Exception:
            pass
        logger.info(f"WS disconnected for job {job_id}")

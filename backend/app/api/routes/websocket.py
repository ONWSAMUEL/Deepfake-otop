"""WebSocket endpoint for real-time job progress updates."""
import asyncio
import json
import logging
import re
from typing import Dict, Set

import redis.asyncio as aioredis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings
from app.services import job_manager

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger(__name__)

# Active WebSocket connections per job_id
_connections: Dict[str, Set[WebSocket]] = {}

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


@router.websocket("/ws/jobs/{job_id}")
async def job_progress_ws(websocket: WebSocket, job_id: str):
    """
    Real-time progress stream for a processing job.

    Messages:
        { "type": "progress", "job_id": "...", "step": "...", "progress": 42, "message": "..." }
        { "type": "completed", "job_id": "...", "result_url": "https://..." }
        { "type": "error",     "job_id": "...", "error": "..." }
    """
    # C9: Validate job_id is a UUID before accepting — reject bogus IDs immediately
    if not _UUID_RE.match(job_id):
        await websocket.close(code=4400, reason="Invalid job ID")
        return

    await websocket.accept()

    # C9: Close immediately if the job doesn't exist — don't leave the socket
    # open for an hour waiting for a job that will never publish.
    if job_manager.get_job(job_id) is None:
        await websocket.send_json({"type": "error", "job_id": job_id, "error": "Job introuvable."})
        await websocket.close()
        return

    logger.info(f"WS connected for job {job_id}")

    # M8: Declare before the try block so finally can safely reference them
    r = None
    pubsub = None

    try:
        r = aioredis.from_url(settings.REDIS_URL)
        pubsub = r.pubsub()

        # M9: Subscribe FIRST, then read the snapshot.
        # If we read the snapshot first there is a window where the worker can
        # publish "completed" between the snapshot read and the subscribe, and
        # we would silently miss that message.
        await pubsub.subscribe(f"job:{job_id}")

        # Send current state snapshot (now safe — we won't miss subsequent publishes)
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
        # M8: pubsub/r may be None if exception occurred before assignment
        try:
            if pubsub is not None:
                await pubsub.unsubscribe(f"job:{job_id}")
            if r is not None:
                await r.aclose()
        except Exception:
            pass
        logger.info(f"WS disconnected for job {job_id}")

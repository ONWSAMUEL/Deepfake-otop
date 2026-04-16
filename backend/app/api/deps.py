"""Shared FastAPI dependencies — authentication and rate limiting."""
from fastapi import Header, HTTPException, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

# ─── Rate limiter ─────────────────────────────────────────────────────────────
# Keyed by client IP.  Attach to app in main.py via app.state.limiter.
limiter = Limiter(key_func=get_remote_address)


# ─── API key auth ─────────────────────────────────────────────────────────────

def require_api_key(x_api_key: str = Header(default="")) -> None:
    """
    C1: Validate the X-API-Key header against settings.API_KEY.

    When API_KEY is empty (local dev), authentication is skipped so developers
    can test without configuring a key.  In production, set API_KEY via the
    environment / SSM Parameter Store.
    """
    if not settings.API_KEY:
        return  # Auth disabled in development
    if x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

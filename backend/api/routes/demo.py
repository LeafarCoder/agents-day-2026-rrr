from __future__ import annotations

import secrets
import time
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse

from config import FRONTEND_URL
from gmail.auth import DEMO_USER_EMAIL

router = APIRouter()

# In-memory token store (per-process, short-lived)
# For multi-instance deployments, use Redis or DB
_DEMO_TOKENS: dict[str, tuple[str, float]] = {}  # token -> (demo_user_email, expiry_ts)

DEMO_TOKEN_TTL_SECONDS = 60  # Token valid for 60 seconds


def _clean_expired_tokens():
    """Remove expired tokens to prevent memory bloat."""
    now = time.time()
    expired = [t for t, (_, exp) in _DEMO_TOKENS.items() if exp < now]
    for t in expired:
        del _DEMO_TOKENS[t]


@router.get("/demo")
def enter_demo(request: Request):
    """
    Generate a short-lived token for demo mode handoff.
    The token is passed back to the frontend via redirect URL
    to work around third-party cookie blocking.
    """
    _clean_expired_tokens()
    
    # Generate secure random token
    token = secrets.token_urlsafe(32)
    _DEMO_TOKENS[token] = (DEMO_USER_EMAIL, time.time() + DEMO_TOKEN_TTL_SECONDS)
    
    redirect_url = f"{FRONTEND_URL}/?demo_token={token}"
    return RedirectResponse(redirect_url)


@router.post("/api/auth/exchange")
def exchange_demo_token(request: Request, body: dict):
    """
    Exchange a demo token for a server-side session.
    Called by the frontend after following the /demo redirect.
    """
    token = body.get("token", "").strip()
    
    if not token:
        return JSONResponse({"error": "missing_token"}, status_code=400)
    
    _clean_expired_tokens()
    
    entry = _DEMO_TOKENS.get(token)
    if not entry:
        return JSONResponse({"error": "invalid_or_expired_token"}, status_code=401)
    
    demo_email, expiry = entry
    
    # Check expiry (belt and suspenders)
    if time.time() > expiry:
        del _DEMO_TOKENS[token]
        return JSONResponse({"error": "token_expired"}, status_code=401)
    
    # Consume the token (one-time use)
    del _DEMO_TOKENS[token]
    
    # Set session variables
    request.session.clear()
    request.session["demo"] = True
    request.session["demo_user_email"] = demo_email
    
    return {
        "success": True,
        "demo": True,
        "user_email": demo_email,
    }
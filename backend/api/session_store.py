from __future__ import annotations

import secrets
import time
from typing import Dict, Tuple, Optional

# In-memory session store: token -> (session_data_dict, expiry_ts)
# For multi-instance deployments, replace this with Redis or a DB-backed store.
_SESSIONS: Dict[str, Tuple[dict, float]] = {}

DEFAULT_SESSION_TTL = 60 * 60 * 24 * 14  # 14 days


def _clean_expired_sessions() -> None:
    now = time.time()
    expired = [t for t, (_, exp) in _SESSIONS.items() if exp < now]
    for t in expired:
        del _SESSIONS[t]


def create_session(data: dict, ttl_seconds: int = DEFAULT_SESSION_TTL) -> str:
    """Create a new server-side session and return its opaque token."""
    _clean_expired_sessions()
    token = secrets.token_urlsafe(32)
    _SESSIONS[token] = (data.copy(), time.time() + ttl_seconds)
    return token


def get_session(token: str) -> Optional[dict]:
    _clean_expired_sessions()
    entry = _SESSIONS.get(token)
    if not entry:
        return None
    data, expiry = entry
    if time.time() > expiry:
        del _SESSIONS[token]
        return None
    # Return a shallow copy to avoid accidental mutation of stored state
    return dict(data)


def delete_session(token: str) -> None:
    _SESSIONS.pop(token, None)


def update_session(token: str, data: dict, ttl_seconds: Optional[int] = None) -> bool:
    """Replace session data for token. Returns False if token not found."""
    entry = _SESSIONS.get(token)
    if not entry:
        return False
    _, expiry = entry
    if ttl_seconds is not None:
        expiry = time.time() + ttl_seconds
    _SESSIONS[token] = (data.copy(), expiry)
    return True

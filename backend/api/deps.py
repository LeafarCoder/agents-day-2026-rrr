from __future__ import annotations

from fastapi import Request
from api.session_store import get_session


def _bearer_session(request: Request) -> dict | None:
    auth_hdr = request.headers.get("authorization", "")
    if not auth_hdr.lower().startswith("bearer "):
        return None
    token = auth_hdr.split(" ", 1)[1].strip()
    return get_session(token) if token else None


def is_demo_request(request: Request) -> bool:
    """True if this request carries a valid demo session via Bearer token or cookie."""
    bs = _bearer_session(request)
    return bool((bs or {}).get("demo")) or bool(request.session.get("demo"))


def get_demo_email(request: Request) -> str:
    from gmail.auth import DEMO_USER_EMAIL
    bs = _bearer_session(request)
    return (
        (bs or {}).get("demo_user_email")
        or request.session.get("demo_user_email")
        or DEMO_USER_EMAIL
    )


def get_user_email(request: Request) -> str | None:
    """Return the authenticated user's email regardless of auth mechanism."""
    if is_demo_request(request):
        return get_demo_email(request)
    return request.session.get("user_email")

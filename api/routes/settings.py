from __future__ import annotations

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from gmail.auth import get_current_user_email
import db.writer as writer

router = APIRouter(prefix="/api/settings")


class KeyPayload(BaseModel):
    key: str


class ProfilePayload(BaseModel):
    display_name:      str | None = None
    home_city:         str | None = None
    home_country:      str | None = None
    home_country_code: str | None = None


@router.patch("/profile")
def save_profile(payload: ProfilePayload, request: Request):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)

    user_email = get_current_user_email(request.session)
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    writer.save_user_profile_info(
        user_email,
        display_name=payload.display_name.strip() if payload.display_name else None,
        home_city=payload.home_city.strip() if payload.home_city else None,
        home_country=payload.home_country,
        home_country_code=payload.home_country_code,
    )
    return {"ok": True}


@router.post("/openrouter-key")
def save_openrouter_key(payload: KeyPayload, request: Request):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)

    user_email = get_current_user_email(request.session)
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    key = payload.key.strip()
    if not key.startswith("sk-or-"):
        return JSONResponse({"error": "invalid_key_format", "detail": "OpenRouter keys start with sk-or-"}, status_code=400)

    try:
        resp = httpx.get(
            "https://openrouter.ai/api/v1/models",
            headers={"Authorization": f"Bearer {key}"},
            timeout=10.0,
        )
        if resp.status_code == 401:
            return JSONResponse({"error": "invalid_key", "detail": "Key was rejected by OpenRouter."}, status_code=400)
        resp.raise_for_status()
    except httpx.TimeoutException:
        return JSONResponse({"error": "validation_timeout", "detail": "Could not reach OpenRouter to validate the key."}, status_code=503)
    except httpx.HTTPStatusError as exc:
        return JSONResponse({"error": "openrouter_error", "detail": str(exc)}, status_code=502)

    writer.set_openrouter_key(user_email, key)
    return {"ok": True}


@router.delete("/openrouter-key")
def delete_openrouter_key(request: Request):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)

    user_email = get_current_user_email(request.session)
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    writer.clear_openrouter_key(user_email)
    return {"ok": True}

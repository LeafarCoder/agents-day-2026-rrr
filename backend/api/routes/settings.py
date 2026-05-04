from __future__ import annotations

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import db.writer as writer

router = APIRouter(prefix="/api/settings")


class KeyPayload(BaseModel):
    key: str


class ProfilePayload(BaseModel):
    display_name:      str | None = None
    home_city:         str | None = None
    home_country:      str | None = None
    home_country_code: str | None = None


class ExcludedLabelsPayload(BaseModel):
    labels: list[str]


@router.patch("/profile")
def save_profile(payload: ProfilePayload, request: Request):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)

    user_email = request.session.get("user_email")
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


@router.get("/openrouter-key")
def get_openrouter_key(request: Request):
    user_email = request.session.get("user_email")
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    try:
        from db.client import get as get_client
        from crypto.secrets import decrypt_secret
        db = get_client()
        res = db.table("users").select("openrouter_api_key_encrypted").eq("email", user_email).execute()
        if not res.data or not res.data[0].get("openrouter_api_key_encrypted"):
            return JSONResponse({"error": "no_key"}, status_code=404)
        raw = res.data[0]["openrouter_api_key_encrypted"]
        from crypto.secrets import decrypt_stored_key
        return {"key": decrypt_stored_key(raw)}
    except Exception as exc:
        return JSONResponse({"error": "decrypt_failed", "detail": str(exc)}, status_code=500)


@router.post("/openrouter-key")
def save_openrouter_key(payload: KeyPayload, request: Request):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)

    user_email = request.session.get("user_email")
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    key = payload.key.strip()
    if not key.startswith("sk-or-"):
        return JSONResponse({"error": "invalid_key_format", "detail": "OpenRouter keys start with sk-or-"}, status_code=400)

    try:
        resp = httpx.get(
            "https://openrouter.ai/api/v1/auth/key",
            headers={"Authorization": f"Bearer {key}"},
            timeout=10.0,
        )
        if resp.status_code in (401, 403):
            return JSONResponse({"error": "invalid_key", "detail": "This API key was not recognised by OpenRouter. Please check and try again."}, status_code=400)
        resp.raise_for_status()
    except httpx.TimeoutException:
        return JSONResponse({"error": "validation_timeout", "detail": "Could not reach OpenRouter to validate the key. Please try again."}, status_code=503)
    except httpx.HTTPStatusError as exc:
        return JSONResponse({"error": "openrouter_error", "detail": f"OpenRouter returned an unexpected error: {exc.response.status_code}."}, status_code=502)

    writer.set_openrouter_key(user_email, key)
    return {"ok": True}


@router.delete("/openrouter-key")
def delete_openrouter_key(request: Request):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)

    user_email = request.session.get("user_email")
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    writer.clear_openrouter_key(user_email)
    return {"ok": True}


@router.post("/tour-complete")
def tour_complete(request: Request):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)

    user_email = request.session.get("user_email")
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    writer.set_tour_seen(user_email, seen=True)
    return {"ok": True}


@router.get("/excluded-labels")
def get_excluded_labels(request: Request):
    user_email = request.session.get("user_email")
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)
    from db.client import get as get_client
    db = get_client()
    res = db.table("users").select("excluded_gmail_labels").eq("email", user_email).execute()
    labels = (res.data[0].get("excluded_gmail_labels") or []) if res.data else []
    return {"labels": labels}


@router.put("/excluded-labels")
def put_excluded_labels(payload: ExcludedLabelsPayload, request: Request):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)
    user_email = request.session.get("user_email")
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)
    labels = [lbl.strip() for lbl in payload.labels if lbl.strip()]
    writer.save_excluded_labels(user_email, labels)
    return {"ok": True}


@router.post("/tour-reset")
def tour_reset(request: Request):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)

    user_email = request.session.get("user_email")
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    writer.set_tour_seen(user_email, seen=False)
    return {"ok": True}

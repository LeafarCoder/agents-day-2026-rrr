from __future__ import annotations

from fastapi import APIRouter, Form, Query, Request
from fastapi.responses import JSONResponse

from gmail.auth import get_current_user_email
from detection import config as det_config
import db.reader as reader
import db.writer as writer

router = APIRouter(prefix="/api/preferences")


def _require_user(request: Request):
    """Return user_email or raise 401. Blocks demo writes."""
    user_email = get_current_user_email(request.session)
    if not user_email:
        return None, JSONResponse({"error": "not_authenticated"}, status_code=401)
    return user_email, None


@router.get("")
def preferences(request: Request):
    user_email = get_current_user_email(request.session)
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)
    user_custom = reader.get_user_signals(user_email)
    merged = det_config.get_merged_signals(user_custom)
    return {
        "signals": merged,
        "defaults": list(det_config._DEFAULT_ACTIVITY_SIGNALS.keys()),
        "custom": {k: v for k, v in user_custom.items() if not k.startswith('__')},
    }


@router.post("/categories")
def create_category(request: Request, name: str = Form(...)):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)
    user_email, err = _require_user(request)
    if err:
        return err
    name = name.strip().lower().replace(" ", "_")
    if not name:
        return {"ok": True}
    custom = reader.get_user_signals(user_email)
    if name not in custom and name not in det_config._DEFAULT_ACTIVITY_SIGNALS:
        custom[name] = []
        writer.save_user_signals(user_email, custom)
    return {"ok": True}


@router.delete("/categories/{name}")
def delete_category(name: str, request: Request):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)
    user_email, err = _require_user(request)
    if err:
        return err
    if name in det_config._DEFAULT_ACTIVITY_SIGNALS:
        return JSONResponse({"error": "cannot_delete_default_category"}, status_code=400)
    custom = reader.get_user_signals(user_email)
    custom.pop(name, None)
    writer.save_user_signals(user_email, custom)
    return {"ok": True}


@router.post("/keywords")
def create_keyword(request: Request, category: str = Form(...), keyword: str = Form(...)):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)
    user_email, err = _require_user(request)
    if err:
        return err
    keyword = keyword.strip().lower()
    category = category.strip()
    if not keyword or not category:
        return {"ok": True}
    custom = reader.get_user_signals(user_email)
    # If it was previously removed from defaults, un-remove it
    removed = custom.get('__removed__', {})
    if keyword in removed.get(category, []):
        removed[category].remove(keyword)
        writer.save_user_signals(user_email, custom)
        return {"ok": True}
    if keyword not in det_config._DEFAULT_ACTIVITY_SIGNALS.get(category, []):
        bucket = custom.setdefault(category, [])
        if keyword not in bucket:
            bucket.append(keyword)
            writer.save_user_signals(user_email, custom)
    return {"ok": True}


@router.delete("/keywords")
def delete_keyword(
    request: Request,
    category: str = Query(...),
    keyword: str = Query(...),
):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)
    user_email, err = _require_user(request)
    if err:
        return err
    keyword = keyword.strip().lower()
    custom = reader.get_user_signals(user_email)
    if keyword in det_config._DEFAULT_ACTIVITY_SIGNALS.get(category, []):
        # Record as a removed default rather than hard-deleting
        bucket = custom.setdefault('__removed__', {}).setdefault(category, [])
        if keyword not in bucket:
            bucket.append(keyword)
            writer.save_user_signals(user_email, custom)
    else:
        if category in custom and keyword in custom[category]:
            custom[category].remove(keyword)
            writer.save_user_signals(user_email, custom)
    return {"ok": True}

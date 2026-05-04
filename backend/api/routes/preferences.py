from __future__ import annotations

from fastapi import APIRouter, Form, Query, Request
from fastapi.responses import JSONResponse

from gmail.auth import get_current_user_email
from detection.config import _DEFAULT_ACTIVITY_SIGNALS
import db.reader as reader

router = APIRouter(prefix="/api/preferences")


def _require_user(request: Request):
    user_email = get_current_user_email(request.session)
    if not user_email:
        return None, JSONResponse({"error": "not_authenticated"}, status_code=401)
    return user_email, None


def _get_db_user_id(db, user_email: str) -> str | None:
    res = db.table("users").select("id").eq("email", user_email).execute()
    return res.data[0]["id"] if res.data else None


def _get_category_id(db, user_id: str, category: str) -> str | None:
    res = (
        db.table("activity_categories")
        .select("id")
        .eq("user_id", user_id)
        .eq("name", category)
        .execute()
    )
    return res.data[0]["id"] if res.data else None


@router.get("")
def preferences(request: Request):
    user_email = get_current_user_email(request.session)
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)
    return {
        "signals":  reader.get_user_keywords(user_email),
        "defaults": list(_DEFAULT_ACTIVITY_SIGNALS.keys()),
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

    from db.client import get as get_client
    db = get_client()
    user_id = _get_db_user_id(db, user_email)
    if not user_id:
        return JSONResponse({"error": "user_not_found"}, status_code=404)

    db.table("activity_categories").upsert(
        {"user_id": user_id, "name": name},
        on_conflict="user_id,name",
    ).execute()
    return {"ok": True}


@router.delete("/categories/{name}")
def delete_category(name: str, request: Request):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)
    user_email, err = _require_user(request)
    if err:
        return err

    from db.client import get as get_client
    db = get_client()
    user_id = _get_db_user_id(db, user_email)
    if not user_id:
        return JSONResponse({"error": "user_not_found"}, status_code=404)

    db.table("activity_categories").delete().eq("user_id", user_id).eq("name", name).execute()
    return {"ok": True}


@router.post("/keywords")
def create_keyword(request: Request, category: str = Form(...), keyword: str = Form(...)):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)
    user_email, err = _require_user(request)
    if err:
        return err
    keyword  = keyword.strip().lower()
    category = category.strip()
    if not keyword or not category:
        return {"ok": True}

    from db.client import get as get_client
    db = get_client()
    user_id = _get_db_user_id(db, user_email)
    if not user_id:
        return JSONResponse({"error": "user_not_found"}, status_code=404)

    cat_id = _get_category_id(db, user_id, category)
    if not cat_id:
        return JSONResponse({"error": "category_not_found"}, status_code=404)

    db.table("activity_keywords").upsert(
        {"user_id": user_id, "category_id": cat_id, "keyword": keyword},
        on_conflict="category_id,keyword",
        returning="minimal",
    ).execute()
    return {"ok": True}


@router.delete("/keywords")
def delete_keyword(
    request: Request,
    category: str = Query(...),
    keyword:  str = Query(...),
):
    if request.session.get("demo"):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)
    user_email, err = _require_user(request)
    if err:
        return err
    keyword = keyword.strip().lower()

    from db.client import get as get_client
    db = get_client()
    user_id = _get_db_user_id(db, user_email)
    if not user_id:
        return JSONResponse({"error": "user_not_found"}, status_code=404)

    cat_id = _get_category_id(db, user_id, category)
    if not cat_id:
        return {"ok": True}

    db.table("activity_keywords").delete().eq("user_id", user_id).eq("category_id", cat_id).eq("keyword", keyword).execute()
    return {"ok": True}

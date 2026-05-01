from __future__ import annotations

from fastapi import APIRouter, Form

from detection.config import add_category, add_keyword, get_activity_signals

router = APIRouter(prefix="/api/preferences")


@router.get("")
def preferences():
    return {"signals": get_activity_signals()}


@router.post("/categories")
def create_category(name: str = Form(...)):
    name = name.strip().lower().replace(" ", "_")
    if name:
        add_category(name)
    return {"ok": True}


@router.post("/keywords")
def create_keyword(category: str = Form(...), keyword: str = Form(...)):
    keyword  = keyword.strip().lower()
    category = category.strip()
    if keyword and category:
        try:
            add_keyword(category, keyword)
        except ValueError:
            pass
    return {"ok": True}

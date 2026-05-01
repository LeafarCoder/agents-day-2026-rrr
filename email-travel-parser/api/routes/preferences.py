from __future__ import annotations

from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from detection.config import add_category, add_keyword, get_activity_signals

router    = APIRouter(prefix="/preferences")
templates = Jinja2Templates(directory="templates")


@router.get("")
def preferences_page(request: Request):
    return templates.TemplateResponse(
        "preferences.html",
        {"request": request, "signals": get_activity_signals()},
    )


@router.post("/categories")
def create_category(request: Request, name: str = Form(...)):
    name = name.strip().lower().replace(" ", "_")
    if name:
        add_category(name)
    return RedirectResponse("/preferences", status_code=303)


@router.post("/keywords")
def create_keyword(
    request: Request,
    category: str = Form(...),
    keyword: str  = Form(...),
):
    keyword  = keyword.strip().lower()
    category = category.strip()
    if keyword and category:
        try:
            add_keyword(category, keyword)
        except ValueError:
            pass
    return RedirectResponse("/preferences", status_code=303)

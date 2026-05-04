from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from config import FRONTEND_URL
from gmail.auth import DEMO_USER_EMAIL

router = APIRouter()


@router.get("/demo")
def enter_demo(request: Request):
    request.session.clear()
    request.session["demo"] = True
    request.session["demo_user_email"] = DEMO_USER_EMAIL
    return RedirectResponse(FRONTEND_URL)

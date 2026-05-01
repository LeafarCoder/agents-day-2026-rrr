from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import RedirectResponse

from config import FRONTEND_URL

router = APIRouter()


@router.get("/profile")
def profile():
    return RedirectResponse(FRONTEND_URL)

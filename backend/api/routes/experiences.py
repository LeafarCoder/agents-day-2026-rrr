from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from api.deps import get_user_email
import db.reader as reader

router = APIRouter()


@router.get("/api/experiences/{country_code}")
def country_experiences(country_code: str, request: Request):
    user_email = get_user_email(request)
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    data = reader.get_country_experiences(user_email, country_code)
    if not data:
        return JSONResponse({"error": "not_found"}, status_code=404)
    return data

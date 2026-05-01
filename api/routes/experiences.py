from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from gmail.auth import credentials_from_session
import db.reader as reader

router = APIRouter()


@router.get("/api/experiences/{country_code}")
def country_experiences(country_code: str, request: Request):
    from googleapiclient.discovery import build

    creds = credentials_from_session(request.session)
    if not creds:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    service    = build("gmail", "v1", credentials=creds)
    user_email = service.users().getProfile(userId="me").execute()["emailAddress"]

    data = reader.get_country_experiences(user_email, country_code)
    if not data:
        return JSONResponse({"error": "not_found"}, status_code=404)
    return data

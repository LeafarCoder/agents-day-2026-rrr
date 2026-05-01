from __future__ import annotations

import os
from datetime import date, timedelta

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from googleapiclient.discovery import build

from config import CREDENTIALS_FILE, FRONTEND_URL, GOOGLE_CREDENTIALS_ERROR, GOOGLE_REDIRECT_URI
from gmail.auth import credentials_from_session, make_flow, save_credentials_to_session
from db import reader


def _redirect_uri(request: Request) -> str:
    return GOOGLE_REDIRECT_URI or str(request.url_for("oauth_callback"))

router = APIRouter()


@router.get("/api/me")
def me(request: Request):
    creds = credentials_from_session(request.session)
    connected = creds is not None
    today = date.today()
    profile_data = None
    user_email = None

    if connected:
        try:
            service = build("gmail", "v1", credentials=creds)
            user_email = service.users().getProfile(userId="me").execute()["emailAddress"]
            profile_data = reader.get_profile(user_email)
        except Exception:
            request.session.pop("credentials", None)
            connected = False

    return {
        "connected": connected,
        "user_email": user_email,
        "profile": profile_data,
        "default_from": (today - timedelta(days=365)).isoformat(),
        "default_to": today.isoformat(),
    }


@router.get("/auth")
def auth(request: Request):
    if GOOGLE_CREDENTIALS_ERROR:
        return {"error": f"credentials_json_invalid: {GOOGLE_CREDENTIALS_ERROR}"}
    if not os.path.exists(CREDENTIALS_FILE):
        return {"error": "credentials.json not found"}
    try:
        flow = make_flow(redirect_uri=_redirect_uri(request))
    except Exception as exc:
        return {"error": f"oauth_flow_init_failed: {exc}"}
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
    )
    request.session["oauth_state"] = state
    request.session["code_verifier"] = flow.code_verifier
    return RedirectResponse(auth_url)


@router.get("/oauth/callback", name="oauth_callback")
def oauth_callback(request: Request):
    flow = make_flow(redirect_uri=_redirect_uri(request))
    flow.state = request.session.get("oauth_state")
    flow.code_verifier = request.session.get("code_verifier")
    auth_response = str(request.url)
    if auth_response.startswith("http://"):
        auth_response = "https://" + auth_response[7:]
    flow.fetch_token(authorization_response=auth_response)
    save_credentials_to_session(flow.credentials, request.session)
    return RedirectResponse(FRONTEND_URL)


@router.get("/disconnect")
def disconnect(request: Request):
    request.session.clear()
    return RedirectResponse(FRONTEND_URL)

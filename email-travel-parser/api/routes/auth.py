from __future__ import annotations

import os
from datetime import date, timedelta

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from googleapiclient.discovery import build

from config import CREDENTIALS_FILE
from gmail.auth import credentials_from_session, make_flow, save_credentials_to_session
from db import reader

router    = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.get("/")
def index(request: Request):
    creds     = credentials_from_session(request.session)
    connected = creds is not None
    today     = date.today()

    profile_data = None
    user_email   = None

    if connected:
        service    = build("gmail", "v1", credentials=creds)
        user_email = service.users().getProfile(userId="me").execute()["emailAddress"]
        profile_data = reader.get_profile(user_email)

    return templates.TemplateResponse(
        request,
        "profile.html",
        {
            "connected":    connected,
            "user_email":   user_email,
            "profile":      profile_data,
            "default_from": (today - timedelta(days=365)).isoformat(),
            "default_to":   today.isoformat(),
        },
    )


@router.get("/auth")
def auth(request: Request):
    if not os.path.exists(CREDENTIALS_FILE):
        return {"error": "credentials.json not found"}
    flow = make_flow(redirect_uri=str(request.url_for("oauth_callback")))
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
    )
    request.session["oauth_state"]    = state
    request.session["code_verifier"]  = flow.code_verifier
    return RedirectResponse(auth_url)


@router.get("/oauth/callback", name="oauth_callback")
def oauth_callback(request: Request):
    flow = make_flow(redirect_uri=str(request.url_for("oauth_callback")))
    flow.state          = request.session.get("oauth_state")
    flow.code_verifier  = request.session.get("code_verifier")
    flow.fetch_token(authorization_response=str(request.url))
    save_credentials_to_session(flow.credentials, request.session)
    return RedirectResponse("/")


@router.get("/disconnect")
def disconnect(request: Request):
    request.session.clear()
    return RedirectResponse("/")

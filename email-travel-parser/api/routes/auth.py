from __future__ import annotations

import os

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from config import CREDENTIALS_FILE
from gmail.auth import credentials_from_session, make_flow, save_credentials_to_session

router    = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.get("/")
def index(request: Request):
    connected = credentials_from_session(request.session) is not None
    return templates.TemplateResponse("index.html", {"request": request, "connected": connected})


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
    return RedirectResponse("/scan")


@router.get("/disconnect")
def disconnect(request: Request):
    request.session.clear()
    return RedirectResponse("/")

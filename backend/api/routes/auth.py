from __future__ import annotations

import os
from datetime import date, timedelta

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from googleapiclient.discovery import build

from config import CREDENTIALS_FILE, FRONTEND_URL, GOOGLE_CREDENTIALS_ERROR, GOOGLE_REDIRECT_URI
from gmail.auth import credentials_from_session, make_flow, save_credentials_to_session, DEMO_USER_EMAIL
from db import reader, writer
import db.reader as db_reader
from api.deps import is_demo_request, get_demo_email


def _redirect_uri(request: Request) -> str:
    return GOOGLE_REDIRECT_URI or str(request.url_for("oauth_callback"))


router = APIRouter()


@router.get("/api/me")
def me(request: Request):
    today = date.today()

    # Bearer token (localStorage) takes priority over session cookie so Chrome's
    # third-party cookie blocking doesn't break the demo flow.
    if is_demo_request(request):
        demo_email = get_demo_email(request)
        profile_data = reader.get_profile(demo_email)
        user_row = (profile_data or {}).get("user") or {}
        return {
            "connected":          True,
            "demo":               True,
            "has_openrouter_key": False,
            "has_seen_tour":      True,
            "user_email":         demo_email,
            "display_name":       user_row.get("display_name"),
            "home_city":          user_row.get("home_city"),
            "home_country":       user_row.get("home_country"),
            "home_country_code":  user_row.get("home_country_code"),
            "profile":            profile_data,
            "default_from":       (today - timedelta(days=365)).isoformat(),
            "default_to":         today.isoformat(),
        }

    creds = credentials_from_session(request.session)
    connected = creds is not None
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

    user_row = (profile_data or {}).get("user") or {}
    return {
        "connected":              connected,
        "demo":                   False,
        "has_openrouter_key":     db_reader.has_openrouter_key(user_email) if user_email else False,
        "has_seen_tour":          bool(user_row.get("has_seen_tour")),
        "user_email":             user_email,
        "display_name":           user_row.get("display_name"),
        "home_city":              user_row.get("home_city"),
        "home_country":           user_row.get("home_country"),
        "home_country_code":      user_row.get("home_country_code"),
        "excluded_gmail_labels":  user_row.get("excluded_gmail_labels") or ["promotions", "spam", "social", "forums"],
        "profile":                profile_data,
        "default_from":           (today - timedelta(days=365)).isoformat(),
        "default_to":             today.isoformat(),
    }


@router.delete("/api/me")
def delete_me(request: Request):
    creds = credentials_from_session(request.session)
    if not creds:
        return {"error": "not_authenticated"}
    try:
        service = build("gmail", "v1", credentials=creds)
        user_email = service.users().getProfile(userId="me").execute()["emailAddress"]
    except Exception:
        request.session.pop("credentials", None)
        return {"error": "failed_to_resolve_user"}
    writer.delete_user(user_email)

    # If a bearer token was used for this session, also remove the server-side session
    auth_hdr = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_hdr and auth_hdr.lower().startswith("bearer "):
        token = auth_hdr.split(" ", 1)[1].strip()
        try:
            from api.session_store import delete_session as _delete_sess
            _delete_sess(token)
        except Exception:
            pass

    return {"deleted": True, "email": user_email}


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
    request.session.clear()  # Removes demo flag and stale OAuth state
    save_credentials_to_session(flow.credentials, request.session)
    session_data = {"credentials": request.session.get("credentials")}
    try:
        service = build("gmail", "v1", credentials=flow.credentials)
        email = service.users().getProfile(userId="me").execute()["emailAddress"]
        request.session["user_email"] = email
        session_data["user_email"] = email
    except Exception:
        pass

    # Cross-site cookies are unreliable in private/strict browsing modes. Return
    # an opaque server-side session token so the frontend can use Bearer auth.
    from api.session_store import create_session
    access_token = create_session(session_data)
    sep = "&" if "?" in FRONTEND_URL else "?"
    return RedirectResponse(f"{FRONTEND_URL}{sep}auth_token={access_token}")


@router.get("/disconnect")
def disconnect(request: Request):
    # If a bearer token was provided, delete the server-side session mapping
    auth_hdr = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_hdr and auth_hdr.lower().startswith("bearer "):
        token = auth_hdr.split(" ", 1)[1].strip()
        try:
            from api.session_store import delete_session as _delete_sess
            _delete_sess(token)
        except Exception:
            pass

    request.session.clear()
    return RedirectResponse(FRONTEND_URL)

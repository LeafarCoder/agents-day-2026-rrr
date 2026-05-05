from __future__ import annotations

import os
import time
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

# Server-side store for OAuth PKCE state: state_param -> (code_verifier, expiry_ts)
# Avoids relying on the session cookie surviving cross-site redirects in incognito/mobile.
_OAUTH_STATES: dict[str, tuple[str | None, float]] = {}
_OAUTH_STATE_TTL = 600  # 10 minutes — enough for any OAuth consent flow


def _clean_oauth_states() -> None:
    now = time.time()
    for k in [k for k, (_, exp) in _OAUTH_STATES.items() if exp < now]:
        del _OAUTH_STATES[k]


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
            # If credentials_from_session refreshed the token, persist the updated
            # credentials back to the server-side session store so the next Bearer
            # request doesn't hit an expired token again.
            auth_hdr = request.headers.get("authorization") or request.headers.get("Authorization")
            if auth_hdr and auth_hdr.lower().startswith("bearer "):
                bearer_token = auth_hdr.split(" ", 1)[1].strip()
                from api.session_store import update_session
                update_session(bearer_token, dict(request.session))
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
    # Store PKCE state server-side instead of in the session cookie.
    # Session cookies are blocked during cross-site redirects in incognito/mobile,
    # so we can't rely on them surviving the Google → /oauth/callback redirect.
    _clean_oauth_states()
    _OAUTH_STATES[state] = (flow.code_verifier, time.time() + _OAUTH_STATE_TTL)
    return RedirectResponse(auth_url)


@router.get("/oauth/callback", name="oauth_callback")
def oauth_callback(request: Request):
    state_param = request.query_params.get("state", "")
    entry = _OAUTH_STATES.pop(state_param, None)
    code_verifier: str | None = None
    if entry is not None:
        stored_verifier, expiry = entry
        if time.time() < expiry:
            code_verifier = stored_verifier

    flow = make_flow(redirect_uri=_redirect_uri(request))
    flow.state = state_param or None
    flow.code_verifier = code_verifier
    auth_response = str(request.url)
    if auth_response.startswith("http://"):
        auth_response = "https://" + auth_response[7:]

    try:
        flow.fetch_token(authorization_response=auth_response)
    except Exception:
        sep = "&" if "?" in FRONTEND_URL else "?"
        return RedirectResponse(f"{FRONTEND_URL}{sep}auth_error=oauth_failed")

    request.session.clear()
    save_credentials_to_session(flow.credentials, request.session)
    session_data = {"credentials": request.session.get("credentials")}
    try:
        service = build("gmail", "v1", credentials=flow.credentials)
        email = service.users().getProfile(userId="me").execute()["emailAddress"]
        request.session["user_email"] = email
        session_data["user_email"] = email
    except Exception:
        pass

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

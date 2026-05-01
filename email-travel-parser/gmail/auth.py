from __future__ import annotations

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

from config import CREDENTIALS_FILE, SCOPES


def make_flow(redirect_uri: str) -> Flow:
    return Flow.from_client_secrets_file(
        CREDENTIALS_FILE,
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )


def credentials_from_session(session: dict) -> Credentials | None:
    data = session.get("credentials")
    if not data:
        return None
    creds = Credentials(**data)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        save_credentials_to_session(creds, session)
    return creds if creds.valid else None


def save_credentials_to_session(creds: Credentials, session: dict) -> None:
    session["credentials"] = {
        "token":         creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri":     creds.token_uri,
        "client_id":     creds.client_id,
        "client_secret": creds.client_secret,
        "scopes":        list(creds.scopes or SCOPES),
    }

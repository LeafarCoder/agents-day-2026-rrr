from __future__ import annotations

from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

from config import CREDENTIALS_FILE, SCOPES

DEMO_USER_EMAIL = "email.travel.parser@gmail.com"


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
        try:
            creds.refresh(Request())
            save_credentials_to_session(creds, session)
        except RefreshError:
            session.pop("credentials", None)
            return None
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


def get_current_user_email(session: dict) -> str | None:
    """Return the user's email from demo flag or live Gmail credentials."""
    if session.get("demo"):
        return DEMO_USER_EMAIL
    creds = credentials_from_session(session)
    if not creds:
        return None
    from googleapiclient.discovery import build
    service = build("gmail", "v1", credentials=creds)
    return service.users().getProfile(userId="me").execute()["emailAddress"]

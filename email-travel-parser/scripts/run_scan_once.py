from __future__ import annotations

import argparse
import json

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from api.routes.scan import _scrape
import db.writer as writer


def _load_creds(path: str) -> Credentials:
    creds = Credentials.from_authorized_user_file(
        path,
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    if not creds.valid:
        raise RuntimeError("Gmail credentials are invalid; refresh or re-authorize token file.")
    return creds


def main() -> None:
    parser = argparse.ArgumentParser(description="Run one Gmail scrape + Supabase persist cycle.")
    parser.add_argument("--token-file", default="seed_token.json")
    parser.add_argument("--user-email", required=True)
    args = parser.parse_args()

    creds = _load_creds(args.token_file)
    service = build("gmail", "v1", credentials=creds)
    bookings, profile = _scrape(service)
    writer.persist(args.user_email, bookings, profile)

    print(json.dumps({
        "bookings": len(bookings),
        "destinations": len(profile.get("destinations_visited", [])),
        "platforms": len(profile.get("platforms_used", [])),
        "top_categories": profile.get("top_categories", []),
    }, indent=2))


if __name__ == "__main__":
    main()

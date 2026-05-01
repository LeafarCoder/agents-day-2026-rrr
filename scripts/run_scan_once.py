from __future__ import annotations

import argparse
import json
from datetime import date

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from detection import profile as profile_builder
from gmail import fetcher, parser
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
    arg_parser = argparse.ArgumentParser(description="Run one Gmail scrape + Supabase persist cycle.")
    arg_parser.add_argument("--token-file", default="seed_token.json")
    arg_parser.add_argument("--user-email", required=True)
    arg_parser.add_argument("--from-date", default="2010-01-01")
    arg_parser.add_argument("--to-date", default="2100-01-01")
    args = arg_parser.parse_args()

    creds = _load_creds(args.token_file)
    service = build("gmail", "v1", credentials=creds)
    since = date.fromisoformat(args.from_date)
    until = date.fromisoformat(args.to_date)
    messages = fetcher.fetch_messages(service, since, until, max_results=0)

    bookings = []
    for msg_ref in messages:
        meta = fetcher.get_metadata(service, msg_ref["id"])
        headers = {h["name"]: h["value"] for h in meta.get("payload", {}).get("headers", [])}

        domain = parser.extract_sender_domain(headers.get("From", ""))
        subject = headers.get("Subject", "")
        if not domain and not parser.is_confirmation(subject):
            continue

        destination = parser.extract_destination(subject)
        body_text = ""
        if not destination:
            full = fetcher.get_full(service, msg_ref["id"])
            body_text = parser.decode_body(full.get("payload", {}))
            destination = parser.extract_destination(body_text)

        bookings.append({
            "id": msg_ref["id"],
            "date": parser.parse_date(headers.get("Date", "")),
            "domain": domain,
            "subject": subject,
            "destination": destination,
            "activities": parser.detect_activities(subject + " " + body_text),
        })

    profile = profile_builder.build(bookings)
    writer.persist(args.user_email, bookings, profile)

    print(json.dumps({
        "bookings": len(bookings),
        "destinations": len(profile.get("destinations_visited", [])),
        "platforms": len(profile.get("platforms_used", [])),
        "top_categories": profile.get("top_categories", []),
    }, indent=2))


if __name__ == "__main__":
    main()

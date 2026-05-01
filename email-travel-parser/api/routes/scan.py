from __future__ import annotations

from collections import Counter

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from googleapiclient.discovery import build

from detection import profile as profile_builder
from gmail.auth import credentials_from_session
from gmail import fetcher, parser
from observability.logger import get
import db.writer as writer

log       = get("scan")
router    = APIRouter()
templates = Jinja2Templates(directory="templates")


def _scrape(service) -> tuple[list[dict], dict]:
    messages = fetcher.fetch_messages(service)

    bookings               = []
    skipped_both_gates     = 0
    dest_from_subject      = 0
    dest_from_body         = 0
    dest_missing           = 0
    body_fetches           = 0

    log.info(f"── Filtering  candidates={len(messages)}")

    for msg_ref in messages:
        meta    = fetcher.get_metadata(service, msg_ref["id"])
        headers = {h["name"]: h["value"] for h in meta.get("payload", {}).get("headers", [])}

        domain  = parser.extract_sender_domain(headers.get("From", ""))
        subject = headers.get("Subject", "")

        if not domain and not parser.is_confirmation(subject):
            skipped_both_gates += 1
            continue

        destination = parser.extract_destination(subject)
        body_text   = ""

        if not destination:
            full        = fetcher.get_full(service, msg_ref["id"])
            body_text   = parser.decode_body(full.get("payload", {}))
            destination = parser.extract_destination(body_text)
            body_fetches += 1
            if destination:
                dest_from_body += 1
            else:
                dest_missing += 1
        else:
            dest_from_subject += 1

        bookings.append({
            "id":          msg_ref["id"],
            "date":        parser.parse_date(headers.get("Date", "")),
            "domain":      domain,
            "subject":     subject,
            "destination": destination,
            "activities":  parser.detect_activities(subject + " " + body_text),
        })

    log.info(
        f"── Filter results  "
        f"passed={len(bookings)}  "
        f"skipped={skipped_both_gates}  "
        f"body_fetches={body_fetches}"
    )
    log.info(
        f"── Destination extraction  "
        f"from_subject={dest_from_subject}  "
        f"from_body={dest_from_body}  "
        f"missing={dest_missing}"
    )

    profile = profile_builder.build(bookings)

    unique_destinations = len(profile["destinations_visited"])
    unique_platforms    = len(profile["platforms_used"])
    top_activities      = profile["top_categories"]
    activity_counts     = profile["activity_preferences"]

    log.info(
        f"── Profile  "
        f"bookings={profile['total_bookings']}  "
        f"destinations={unique_destinations}  "
        f"platforms={unique_platforms}"
    )
    log.info(f"── Top categories  {top_activities}")

    if activity_counts:
        log.info("── Activity breakdown")
        for cat, count in activity_counts.items():
            intensity = profile["preference_intensity"].get(cat, "")
            log.info(f"     {cat:<30} count={count}  [{intensity}]")

    log.info("── Last 10 subjects")
    for b in bookings[-10:]:
        log.info(f"     [{b['date'] or '????-??-??'}]  {b['domain'] or 'personal':>20}  {b['subject'][:60]}")

    return bookings, profile


@router.get("/scan")
def scan(request: Request):
    creds = credentials_from_session(request.session)
    if not creds:
        return RedirectResponse("/auth")

    log.info("═" * 60)
    log.info("Scan started")
    service           = build("gmail", "v1", credentials=creds)
    bookings, profile = _scrape(service)

    gmail_profile = service.users().getProfile(userId="me").execute()
    user_email    = gmail_profile["emailAddress"]
    log.info(f"── Persisting to Supabase  user={user_email}")
    writer.persist(user_email, bookings, profile)

    log.info("Scan complete")
    log.info("═" * 60)

    return templates.TemplateResponse(
        request,
        "results.html",
        {"profile": profile, "bookings": bookings},
    )

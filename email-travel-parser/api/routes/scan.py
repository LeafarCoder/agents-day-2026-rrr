from __future__ import annotations

import asyncio
import json
from datetime import date

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from detection import profile as profile_builder
from gmail.auth import credentials_from_session
from gmail import fetcher, parser
from observability.logger import get
import db.writer as writer
import db.reader as reader

templates = Jinja2Templates(directory="templates")

log    = get("scan")
router = APIRouter()


@router.get("/scan")
def scan_results(request: Request):
    from googleapiclient.discovery import build
    creds = credentials_from_session(request.session)
    if not creds:
        return RedirectResponse("/auth")
    service    = build("gmail", "v1", credentials=creds)
    user_email = service.users().getProfile(userId="me").execute()["emailAddress"]
    data = reader.get_scan_results(user_email)
    return templates.TemplateResponse(
        request, "results.html", {"profile": data, "bookings": data["bookings"] if data else []}
    )


def _event(step: str, msg: str, **extra) -> str:
    return f"data: {json.dumps({'step': step, 'msg': msg, **extra})}\n\n"


@router.get("/scan/stream")
async def scan_stream(request: Request, from_date: str, to_date: str):
    async def generate():
        from googleapiclient.discovery import build

        yield _event("auth", "Connecting to Gmail...")

        creds = credentials_from_session(request.session)
        if not creds:
            yield _event("error", "Not authenticated — please reconnect.")
            return

        since = date.fromisoformat(from_date)
        until = date.fromisoformat(to_date)

        service = await asyncio.to_thread(build, "gmail", "v1", credentials=creds)

        yield _event("fetching", f"Searching emails from {since} to {until}...")

        messages = await asyncio.to_thread(fetcher.fetch_messages, service, since, until)

        yield _event("fetching", f"Found {len(messages)} candidate emails", count=len(messages))

        bookings           = []
        skipped            = 0
        dest_from_subject  = 0
        dest_from_body     = 0
        dest_missing       = 0

        for i, msg_ref in enumerate(messages):
            meta    = await asyncio.to_thread(fetcher.get_metadata, service, msg_ref["id"])
            headers = {h["name"]: h["value"] for h in meta.get("payload", {}).get("headers", [])}

            domain  = parser.extract_sender_domain(headers.get("From", ""))
            subject = headers.get("Subject", "")

            if not domain and not parser.is_confirmation(subject):
                skipped += 1
                continue

            yield _event(
                "parsing",
                f"Scanning {i + 1}/{len(messages)}: {subject[:55]}",
                current=i + 1,
                total=len(messages),
            )

            destination = parser.extract_destination(subject)
            body_text   = ""

            if not destination:
                full      = await asyncio.to_thread(fetcher.get_full, service, msg_ref["id"])
                body_text = parser.decode_body(full.get("payload", {}))
                destination = parser.extract_destination(body_text)
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

        yield _event(
            "profiling",
            f"Building preference profile from {len(bookings)} confirmed bookings...",
        )

        profile = profile_builder.build(bookings)

        log.info(f"Scan  passed={len(bookings)}  skipped={skipped}  dest_missing={dest_missing}")

        yield _event("saving", "Saving to database...")

        gmail_profile = await asyncio.to_thread(
            lambda: service.users().getProfile(userId="me").execute()
        )
        user_email = gmail_profile["emailAddress"]
        await asyncio.to_thread(writer.persist, user_email, bookings, profile)

        yield _event("done", f"Done — {len(bookings)} bookings saved.", bookings=len(bookings))

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

from __future__ import annotations

import asyncio
import json
from datetime import date

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse

from detection import profile as profile_builder
from gmail.auth import credentials_from_session
from gmail import fetcher, parser
from llm import extractor as llm_extractor
from observability.logger import get
import db.writer as writer
import db.reader as reader
from config import LLM_CONCURRENCY

log    = get("scan")
router = APIRouter()


@router.get("/api/scan")
def scan_results(request: Request):
    from googleapiclient.discovery import build
    creds = credentials_from_session(request.session)
    if not creds:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)
    service    = build("gmail", "v1", credentials=creds)
    user_email = service.users().getProfile(userId="me").execute()["emailAddress"]
    data = reader.get_scan_results(user_email)
    return data or {}


def _event(step: str, msg: str, **extra) -> str:
    return f"data: {json.dumps({'step': step, 'msg': msg, **extra})}\n\n"


@router.get("/scan/stream")
async def scan_stream(
    request: Request,
    from_date: str,
    to_date: str,
    exclude: list[str] = Query(default=[]),
):
    async def generate():
        from googleapiclient.discovery import build

        try:
            yield _event("auth", "Connecting to Gmail...")

            creds = credentials_from_session(request.session)
            if not creds:
                yield _event("error", "Not authenticated — please reconnect.")
                return

            since = date.fromisoformat(from_date)
            until = date.fromisoformat(to_date)

            service = await asyncio.to_thread(build, "gmail", "v1", credentials=creds)

            yield _event("fetching", f"Searching emails from {since} to {until}...")

            messages = await asyncio.to_thread(fetcher.fetch_messages, service, since, until, exclude)

            yield _event("fetching", f"Found {len(messages)} candidate emails", count=len(messages))

            semaphore = asyncio.Semaphore(LLM_CONCURRENCY)

            async def process_one(msg_ref: dict) -> tuple[dict | None, str, str]:
                """Return (booking_or_None, subject, status) where status ∈ {skip, cached, extracted}."""
                async with semaphore:
                    meta    = await asyncio.to_thread(fetcher.get_metadata, service, msg_ref["id"])
                    headers = {h["name"]: h["value"] for h in meta.get("payload", {}).get("headers", [])}

                    domain   = parser.extract_sender_domain(headers.get("From", ""))
                    subject  = headers.get("Subject", "")
                    raw_date = parser.parse_date(headers.get("Date", ""))

                    if raw_date:
                        email_date = date.fromisoformat(raw_date)
                        if not (since <= email_date <= until):
                            return None, subject, "skip"

                    if not domain and not parser.is_confirmation(subject):
                        return None, subject, "skip"

                    full      = await asyncio.to_thread(fetcher.get_full, service, msg_ref["id"])
                    body_text = parser.decode_body(full.get("payload", {}))

                    extraction: dict = {}
                    status = "extracted"
                    try:
                        cached = await asyncio.to_thread(reader.get_email_extraction, msg_ref["id"])
                        if cached is not None:
                            extraction = cached
                            status = "cached"
                        else:
                            extraction = await asyncio.to_thread(
                                llm_extractor.extract_booking, subject, body_text
                            )
                    except Exception as exc:
                        log.exception(f"LLM extraction failed  msg={msg_ref['id']}  err={exc}")

                    booking = {
                        "id":             msg_ref["id"],
                        "date":           raw_date,
                        "domain":         domain,
                        "subject":        subject,
                        "destination":    extraction.get("destination_city") or None,
                        "country":        extraction.get("destination_country") or None,
                        "country_code":   extraction.get("country_code") or None,
                        "booking_type":   extraction.get("booking_type") or None,
                        "llm_extraction": extraction or None,
                        "activities":     extraction.get("categories") or [],
                        "keyword_hits":   extraction.get("keyword_hits") or {},
                    }
                    return booking, subject, status

            tasks = [asyncio.create_task(process_one(msg_ref)) for msg_ref in messages]

            bookings      = []
            skipped       = 0
            llm_cached    = 0
            llm_extracted = 0
            dest_missing  = 0
            done          = 0

            for future in asyncio.as_completed(tasks):
                done += 1
                try:
                    booking, subject, status = await future
                except Exception as exc:
                    log.exception(f"process_one unexpected error: {exc}")
                    skipped += 1
                    yield _event("parsing", f"Scanning {done}/{len(messages)}: error", current=done, total=len(messages))
                    continue

                if booking is None:
                    skipped += 1
                    yield _event("parsing", f"Scanning {done}/{len(messages)}: skipped", current=done, total=len(messages))
                    continue

                if status == "cached":
                    llm_cached += 1
                else:
                    llm_extracted += 1

                if not booking.get("destination"):
                    dest_missing += 1

                bookings.append(booking)
                yield _event(
                    "parsing",
                    f"Scanning {done}/{len(messages)}: {subject[:55]}",
                    current=done,
                    total=len(messages),
                )

            yield _event(
                "profiling",
                f"Building preference profile from {len(bookings)} confirmed bookings...",
            )

            profile = profile_builder.build(bookings)

            log.info(
                f"Scan  passed={len(bookings)}  skipped={skipped}"
                f"  llm_cached={llm_cached}  llm_extracted={llm_extracted}"
                f"  dest_missing={dest_missing}"
            )

            yield _event("saving", "Finishing up...")

            gmail_profile = await asyncio.to_thread(
                lambda: service.users().getProfile(userId="me").execute()
            )
            user_email = gmail_profile["emailAddress"]
            await asyncio.to_thread(writer.persist, user_email, bookings, profile)

            yield _event("done", f"Done — {len(bookings)} bookings saved.", bookings=len(bookings))

        except Exception as exc:
            log.exception(f"Scan stream crashed: {exc}")
            yield _event("error", f"Scan failed: {exc}")

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

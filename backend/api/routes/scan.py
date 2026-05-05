from __future__ import annotations

import asyncio
import json
import os
import threading
from datetime import date

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from googleapiclient.errors import HttpError

from detection import profile as profile_builder
from gmail.auth import credentials_from_session, get_current_user_email
from gmail import fetcher, parser
from llm import extractor as llm_extractor
from observability.logger import get
import db.writer as writer
import db.reader as reader
from config import LLM_CONCURRENCY
from detection.config import BLOCKED_DOMAINS
from api.deps import get_user_email, is_demo_request

log    = get("scan")
router = APIRouter()

BATCH_SIZE        = int(os.environ.get("LLM_BATCH_SIZE", "8"))
BATCH_CONCURRENCY = int(os.environ.get("LLM_BATCH_CONCURRENCY", "3"))
BATCH_BODY_CAP    = int(os.environ.get("LLM_BATCH_BODY_CAP", "3000"))

_tls = threading.local()


def _thread_service(creds):
    # httplib2 is not thread-safe; build one service per thread to avoid shared SSL state
    if not hasattr(_tls, "gmail"):
        from googleapiclient.discovery import build
        _tls.gmail = build("gmail", "v1", credentials=creds)
    return _tls.gmail


def _fetch_metadata(creds, msg_id):
    return fetcher.get_metadata(_thread_service(creds), msg_id)


def _fetch_full(creds, msg_id):
    return fetcher.get_full(_thread_service(creds), msg_id)


@router.post("/api/bookings/{gmail_msg_id}/exclude")
def exclude_booking(gmail_msg_id: str, request: Request):
    user_email = get_user_email(request)
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)
    writer.exclude_booking(user_email, gmail_msg_id)
    return {"ok": True}


@router.get("/api/scan")
def scan_results(
    request: Request,
    from_date: str | None = None,
    to_date: str | None = None,
):
    user_email = get_user_email(request)
    if not user_email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)
    data = reader.get_scan_results(user_email, from_date=from_date, to_date=to_date)
    return data or {}


def _event(step: str, msg: str, **extra) -> str:
    return f"data: {json.dumps({'step': step, 'msg': msg, **extra})}\n\n"


def _make_booking_record(item: dict, extraction: dict) -> dict:
    """Build a booking dict from a gmail_phase item + LLM extraction."""
    return {
        "id":             item["msg_id"],
        "date":           item["date"],
        "domain":         item["domain"],
        "subject":        item["subject"],
        "destination":    extraction.get("destination_city") or None,
        "country":        extraction.get("destination_country") or None,
        "country_code":   extraction.get("country_code") or None,
        "booking_type":   extraction.get("booking_type") or None,
        "start_date":     extraction.get("start_date") or None,
        "end_date":       extraction.get("end_date") or None,
        "llm_extraction": extraction,
        "activities":     extraction.get("categories") or [],
        "keyword_hits":   extraction.get("keyword_hits") or {},
    }


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
            if is_demo_request(request):
                yield _event("error", "Scanning is disabled in demo mode.")
                return

            yield _event("auth", "Connecting to Gmail...")

            creds = credentials_from_session(request.session)
            if not creds:
                yield _event("error", "Not authenticated — please reconnect.")
                return

            service = await asyncio.to_thread(build, "gmail", "v1", credentials=creds)
            user_email = (await asyncio.to_thread(
                lambda: service.users().getProfile(userId="me").execute()
            ))["emailAddress"]

            openrouter_key = await asyncio.to_thread(reader.get_openrouter_key, user_email)
            if not openrouter_key:
                yield _event("error", "openrouter_key_missing")
                return

            user_keywords = await asyncio.to_thread(reader.get_user_keywords, user_email)

            since = date.fromisoformat(from_date)
            until = date.fromisoformat(to_date)

            yield _event("fetching", f"Searching emails from {since} to {until}...")

            messages = await asyncio.to_thread(fetcher.fetch_messages, service, since, until, exclude)

            yield _event("fetching", f"Found {len(messages)} candidate emails", count=len(messages))

            cache = await asyncio.to_thread(
                reader.get_email_extractions, [m["id"] for m in messages]
            )

            semaphore = asyncio.Semaphore(LLM_CONCURRENCY)

            # ── Phase 1: Gmail fetch + filter + cache check (per-email, parallel) ──

            async def gmail_phase(msg_ref: dict) -> tuple[dict | None, dict | None, str]:
                """Fetch and filter one email without calling the LLM.

                Returns (finalized_record, unresolved_item, status) where:
                  - finalized_record: ready record (cached positive or negative)
                  - unresolved_item:  {"msg_id","subject","body","domain","date"} → needs LLM
                  - (None, None, "skip"): pre-filter hard skip
                Exactly one of finalized_record / unresolved_item is non-None,
                unless both are None (hard skip).
                """
                async with semaphore:
                    cached_row = cache.get(msg_ref["id"])

                    # ── Fast path: metadata + LLM extraction both in DB ──────────
                    if cached_row and cached_row.get("subject") and cached_row.get("sender_domain"):
                        raw_domain = cached_row["sender_domain"]
                        subject    = cached_row["subject"]
                        raw_date   = cached_row.get("email_date")
                        extraction = cached_row["llm_extraction"]

                        if cached_row.get("is_excluded"):
                            log.debug(f"skip  reason=excluded  domain={raw_domain!r}  subject={subject[:60]!r}")
                            return None, None, "skip"

                        if extraction.get("is_travel_booking") is False:
                            log.debug(f"skip  reason=cached_negative  domain={raw_domain!r}  subject={subject[:60]!r}")
                            return None, None, "skip"

                        if raw_date:
                            email_date = date.fromisoformat(raw_date)
                            if not (since <= email_date <= until):
                                log.debug(f"skip  reason=date_out_of_range(cached)  date={raw_date}  subject={subject[:60]!r}")
                                return None, None, "skip"

                        booking = {
                            "id":             msg_ref["id"],
                            "date":           raw_date,
                            "domain":         raw_domain,
                            "subject":        subject,
                            "destination":    extraction.get("destination_city") or None,
                            "country":        extraction.get("destination_country") or None,
                            "country_code":   extraction.get("country_code") or None,
                            "booking_type":   extraction.get("booking_type") or None,
                            "start_date":     extraction.get("start_date") or None,
                            "end_date":       extraction.get("end_date") or None,
                            "llm_extraction": extraction,
                            "activities":     extraction.get("categories") or [],
                            "keyword_hits":   extraction.get("keyword_hits") or {},
                        }
                        log.info(
                            f"email  status=cached"
                            f"  domain={raw_domain!r}"
                            f"  dest={booking['destination']!r}"
                            f"  country_code={booking['country_code']!r}"
                            f"  subject={subject[:60]!r}"
                        )
                        return booking, None, "cached"

                    # ── Slow path: fetch metadata from Gmail ──────────────────────
                    try:
                        meta = await asyncio.to_thread(_fetch_metadata, creds, msg_ref["id"])
                    except HttpError as exc:
                        if exc.resp.status == 404:
                            return None, None, "skip"
                        raise

                    headers = {h["name"]: h["value"] for h in meta.get("payload", {}).get("headers", [])}

                    travel_domain = parser.extract_sender_domain(headers.get("From", ""))
                    raw_domain    = parser.extract_raw_domain(headers.get("From", ""))
                    subject  = headers.get("Subject", "")
                    raw_date = parser.parse_date(headers.get("Date", ""))

                    sender_email = parser.extract_sender_email(headers.get("From", ""))
                    if sender_email and sender_email.lower() == user_email.lower():
                        log.debug(f"skip  reason=self_sent  from={headers.get('From', '')!r}  subject={subject[:60]!r}")
                        return None, None, "skip"

                    if raw_date:
                        email_date = date.fromisoformat(raw_date)
                        if not (since <= email_date <= until):
                            log.debug(f"skip  reason=date_out_of_range  date={raw_date}  subject={subject[:60]!r}")
                            return None, None, "skip"

                    if not travel_domain and not parser.is_confirmation(subject):
                        log.debug(f"skip  reason=not_travel  domain={raw_domain!r}  subject={subject[:60]!r}")
                        return None, None, "skip"

                    if raw_domain and raw_domain in BLOCKED_DOMAINS:
                        log.debug(f"skip  reason=blocked_domain  domain={raw_domain!r}  subject={subject[:60]!r}")
                        return None, None, "skip"

                    if parser.is_cancellation(subject):
                        log.debug(f"skip  reason=cancellation  domain={raw_domain!r}  subject={subject[:60]!r}")
                        return None, None, "skip"

                    try:
                        full = await asyncio.to_thread(_fetch_full, creds, msg_ref["id"])
                    except HttpError as exc:
                        if exc.resp.status == 404:
                            log.debug(f"skip  reason=404_full  domain={raw_domain!r}  subject={subject[:60]!r}")
                            return None, None, "skip"
                        raise
                    body_text = parser.decode_body(full.get("payload", {}))

                    # LLM extraction already cached (metadata was missing last scan) — finalize.
                    if cached_row is not None:
                        if cached_row.get("is_excluded"):
                            log.debug(f"skip  reason=excluded(slow)  subject={subject[:60]!r}")
                            return None, None, "skip"
                        extraction = cached_row["llm_extraction"]
                        if extraction.get("is_travel_booking") is False:
                            return {
                                "is_negative":    True,
                                "id":             msg_ref["id"],
                                "subject":        subject,
                                "domain":         raw_domain,
                                "date":           raw_date,
                                "destination":    None,
                                "llm_extraction": extraction,
                            }, None, "cached"
                        booking = {
                            "id":             msg_ref["id"],
                            "date":           raw_date,
                            "domain":         raw_domain,
                            "subject":        subject,
                            "destination":    extraction.get("destination_city") or None,
                            "country":        extraction.get("destination_country") or None,
                            "country_code":   extraction.get("country_code") or None,
                            "booking_type":   extraction.get("booking_type") or None,
                            "start_date":     extraction.get("start_date") or None,
                            "end_date":       extraction.get("end_date") or None,
                            "llm_extraction": extraction,
                            "activities":     extraction.get("categories") or [],
                            "keyword_hits":   extraction.get("keyword_hits") or {},
                        }
                        return booking, None, "cached"

                    # Queue for LLM batch (Phase 2)
                    return None, {
                        "msg_id":  msg_ref["id"],
                        "subject": subject,
                        "body":    body_text,
                        "domain":  raw_domain,
                        "date":    raw_date,
                    }, "pending"

            phase1_tasks = [asyncio.create_task(gmail_phase(msg)) for msg in messages]

            bookings     = []
            non_bookings = []
            unresolved: list[dict] = []
            skipped       = 0
            llm_cached    = 0
            dest_missing  = 0
            done          = 0

            for future in asyncio.as_completed(phase1_tasks):
                done += 1
                try:
                    finalized, unresolved_item, status = await future
                except Exception as exc:
                    log.exception(f"gmail_phase unexpected error: {exc}")
                    skipped += 1
                    yield _event("parsing", f"Scanning {done}/{len(messages)}: error", current=done, total=len(messages))
                    continue

                if status == "pending":
                    unresolved.append(unresolved_item)
                    yield _event("parsing", f"Scanning {done}/{len(messages)}: fetched", current=done, total=len(messages))
                    continue

                if finalized is None:
                    skipped += 1
                    yield _event("parsing", f"Scanning {done}/{len(messages)}: skipped", current=done, total=len(messages))
                    continue

                llm_cached += 1

                if finalized.get("is_negative"):
                    non_bookings.append(finalized)
                    skipped += 1
                    yield _event("parsing", f"Scanning {done}/{len(messages)}: skipped", current=done, total=len(messages))
                    continue

                if not finalized.get("destination"):
                    dest_missing += 1
                bookings.append(finalized)
                yield _event(
                    "parsing",
                    f"Scanning {done}/{len(messages)}: {finalized['subject'][:55]}",
                    current=done,
                    total=len(messages),
                    cached=True,
                )

            # ── Phase 2: batch LLM extraction for never-seen emails ──────────────

            llm_extracted         = 0
            llm_batches           = 0
            llm_per_email_fallbacks = 0

            if unresolved:
                yield _event(
                    "parsing",
                    f"Running LLM on {len(unresolved)} new emails in batches of {BATCH_SIZE}...",
                    current=len(messages),
                    total=len(messages),
                )

                batch_list = [unresolved[i:i + BATCH_SIZE] for i in range(0, len(unresolved), BATCH_SIZE)]
                batch_sem  = asyncio.Semaphore(BATCH_CONCURRENCY)

                async def run_batch(batch: list[dict]) -> tuple[list[dict], dict[str, dict], set]:
                    async with batch_sem:
                        fallback_ids: set[str] = set()
                        try:
                            results = await asyncio.to_thread(
                                llm_extractor.extract_bookings_batch,
                                batch, openrouter_key, user_keywords, BATCH_BODY_CAP,
                            )
                            missing_items = [item for item in batch if item["msg_id"] not in results]
                            if missing_items:
                                log.warning(
                                    f"batch partial  missing={[m['msg_id'] for m in missing_items]}"
                                    f"  falling back per-email"
                                )
                                for item in missing_items:
                                    fallback_ids.add(item["msg_id"])
                                    try:
                                        ext = await asyncio.to_thread(
                                            llm_extractor.extract_booking,
                                            item["subject"], item["body"], openrouter_key, user_keywords,
                                        )
                                        results[item["msg_id"]] = ext
                                    except Exception as exc2:
                                        log.exception(f"per-email fallback failed  msg={item['msg_id']}  err={exc2}")
                                        results[item["msg_id"]] = {}
                        except Exception as exc:
                            log.exception(f"batch failed entirely — falling back per-email  err={exc}")
                            results = {}
                            for item in batch:
                                fallback_ids.add(item["msg_id"])
                                try:
                                    ext = await asyncio.to_thread(
                                        llm_extractor.extract_booking,
                                        item["subject"], item["body"], openrouter_key, user_keywords,
                                    )
                                    results[item["msg_id"]] = ext
                                except Exception as exc2:
                                    log.exception(f"per-email fallback failed  msg={item['msg_id']}  err={exc2}")
                                    results[item["msg_id"]] = {}
                        return batch, results, fallback_ids

                batch_tasks = [asyncio.create_task(run_batch(b)) for b in batch_list]

                for future in asyncio.as_completed(batch_tasks):
                    batch_items, batch_results, fallback_ids = await future
                    llm_batches += 1
                    llm_per_email_fallbacks += len(fallback_ids)
                    batch_bookings = 0

                    for item in batch_items:
                        extraction = batch_results.get(item["msg_id"]) or {}

                        if extraction.get("is_travel_booking") is False:
                            non_bookings.append({
                                "is_negative":    True,
                                "id":             item["msg_id"],
                                "subject":        item["subject"],
                                "domain":         item["domain"],
                                "date":           item["date"],
                                "destination":    None,
                                "llm_extraction": extraction,
                            })
                            skipped += 1
                            llm_extracted += 1
                        elif extraction:
                            booking = _make_booking_record(item, extraction)
                            if not booking.get("destination"):
                                dest_missing += 1
                            bookings.append(booking)
                            llm_extracted += 1
                            batch_bookings += 1
                            log.info(
                                f"email  status=extracted"
                                f"  domain={item['domain']!r}"
                                f"  dest={booking['destination']!r}"
                                f"  country_code={booking['country_code']!r}"
                                f"  type={booking['booking_type']!r}"
                                f"  start={booking['start_date']!r}"
                                f"  end={booking['end_date']!r}"
                                f"  categories={booking['activities']}"
                                f"  subject={item['subject'][:60]!r}"
                            )
                        else:
                            skipped += 1

                    yield _event(
                        "parsing",
                        f"Batch {llm_batches}/{len(batch_list)}: {batch_bookings} bookings found",
                        current=len(messages),
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
                f"  llm_batches={llm_batches}"
                f"  llm_batch_avg_size={round(len(unresolved) / max(1, llm_batches), 1)}"
                f"  llm_per_email_fallbacks={llm_per_email_fallbacks}"
                f"  dest_missing={dest_missing}"
            )

            yield _event("saving", "Finishing up...")

            gmail_profile = await asyncio.to_thread(
                lambda: service.users().getProfile(userId="me").execute()
            )
            user_email = gmail_profile["emailAddress"]
            await asyncio.to_thread(writer.persist, user_email, bookings, non_bookings, profile)

            yield _event("done", f"Done — {len(bookings)} bookings saved.", bookings=len(bookings))

        except Exception as exc:
            log.exception(f"Scan stream crashed: {exc}")
            yield _event("error", f"Scan failed: {exc}")

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

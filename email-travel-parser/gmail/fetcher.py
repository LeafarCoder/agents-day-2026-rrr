from __future__ import annotations

from datetime import date, timedelta
import os

from detection.config import TRAVEL_DOMAINS, SUBJECT_KEYWORDS
from observability.logger import get

log = get("gmail.fetcher")


_EXCLUDE_CLAUSES: dict[str, str] = {
    "promotions": "-in:promotions",
    "spam":       "-in:spam",
    "social":     "-in:category_social",
    "forums":     "-in:category_forums",
}


def build_query(since: date, until: date, exclude: list[str] | None = None) -> str:
    override = os.environ.get("GMAIL_QUERY_OVERRIDE")
    if override is not None:
        return override
    domain_clauses   = " OR ".join(f"from:{d}" for d in sorted(TRAVEL_DOMAINS))
    subject_clauses  = " OR ".join(f"subject:{kw}" for kw in SUBJECT_KEYWORDS)
    exclude_clauses  = " ".join(
        _EXCLUDE_CLAUSES[k] for k in (exclude or []) if k in _EXCLUDE_CLAUSES
    )
    query = f"(({domain_clauses}) OR ({subject_clauses}))"
    if exclude_clauses:
        query += f" {exclude_clauses}"
    return (
        query
        + f" after:{since.strftime('%Y/%m/%d')}"
        + f" before:{(until + timedelta(days=1)).strftime('%Y/%m/%d')}"
    )


def fetch_messages(service, since: date, until: date, exclude: list[str] | None = None, max_results: int = 500) -> list[dict]:
    query = build_query(since, until, exclude)
    messages = []
    page_token = None
    page = 1

    log.info(
        f"Gmail query  since={since}  until={until}  "
        f"domains={len(TRAVEL_DOMAINS)}  keywords={len(SUBJECT_KEYWORDS)}"
    )

    while max_results <= 0 or len(messages) < max_results:
        batch = 100 if max_results <= 0 else min(100, max_results - len(messages))
        kwargs = {"userId": "me", "q": query, "maxResults": batch}
        if page_token:
            kwargs["pageToken"] = page_token
        result = service.users().messages().list(**kwargs).execute()
        chunk = result.get("messages", [])
        messages.extend(chunk)
        log.info(f"Gmail page {page}  fetched={len(chunk)}  total_so_far={len(messages)}")
        page_token = result.get("nextPageToken")
        page += 1
        if not page_token or not chunk:
            break

    log.info(f"Gmail fetch complete  total={len(messages)}")
    return messages


def get_metadata(service, msg_id: str) -> dict:
    return service.users().messages().get(
        userId="me",
        id=msg_id,
        format="metadata",
        metadataHeaders=["From", "Subject", "Date"],
    ).execute()


def get_full(service, msg_id: str) -> dict:
    return service.users().messages().get(userId="me", id=msg_id, format="full").execute()

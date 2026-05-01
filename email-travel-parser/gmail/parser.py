from __future__ import annotations

import base64
import re

from dateutil import parser as dateutil_parser

from detection.config import (
    CONFIRMATION_REGEX,
    TRAVEL_DOMAINS,
    get_activity_signals,
)

_DESTINATION_PATTERNS = [
    re.compile(
        r"(?:your\s+(?:airbnb|stay|trip|booking|reservation|hotel|room|flight)\s+"
        r"(?:in|to|at))\s+([A-Z][a-zA-Z\s,]{2,40}?)(?:\s+is\s+confirmed|\s+-|\s*\||\s*$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:confirmed|confirmation).*?(?:in|to|at)\s+([A-Z][a-zA-Z\s]{2,30}?)(?:\s*[-,\|]|\s*$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:traveling|travelling)\s+to\s+([A-Z][a-zA-Z\s]{2,30}?)(?:\s*[-,\|]|\s*$)",
        re.IGNORECASE,
    ),
]


def extract_sender_domain(from_header: str) -> str | None:
    match = re.search(r"@([\w.\-]+)", from_header)
    if not match:
        return None
    domain = match.group(1).lower()
    for allowed in TRAVEL_DOMAINS:
        if domain == allowed or domain.endswith(f".{allowed}"):
            return allowed
    return None


def is_confirmation(subject: str) -> bool:
    return bool(CONFIRMATION_REGEX.search(subject))


def extract_destination(text: str) -> str | None:
    for pattern in _DESTINATION_PATTERNS:
        m = pattern.search(text)
        if m:
            dest = m.group(1).strip().rstrip(".,")
            if 2 <= len(dest) <= 40 and dest[0].isupper() and not re.search(r"\d", dest):
                return dest
    return None


def decode_body(payload: dict) -> str:
    parts = payload.get("parts", [])
    if not parts:
        data = payload.get("body", {}).get("data", "")
        return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace") if data else ""
    for part in parts:
        mime = part.get("mimeType", "")
        if mime == "text/plain":
            data = part.get("body", {}).get("data", "")
            if data:
                return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
        if mime.startswith("multipart"):
            result = decode_body(part)
            if result:
                return result
    return ""


def detect_activities(text: str) -> list[str]:
    lower   = text.lower()
    signals = get_activity_signals()
    return [cat for cat, kws in signals.items() if any(kw in lower for kw in kws)]


def parse_date(date_str: str) -> str | None:
    try:
        return dateutil_parser.parse(date_str).strftime("%Y-%m-%d")
    except Exception:
        return None

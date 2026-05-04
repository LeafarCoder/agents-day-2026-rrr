from __future__ import annotations

import base64
import re

from dateutil import parser as dateutil_parser

from detection.config import (
    CONFIRMATION_REGEX,
    KEYWORD_ALIASES,
    TRAVEL_DOMAINS,
)

_DESTINATION_PATTERNS = [
    # "your trip/stay/flight to London" or "your Airbnb in Paris"
    re.compile(
        r"(?:your\s+(?:airbnb|stay|trip|booking|reservation|hotel|room|flight)\s+"
        r"(?:in|to|at))\s+([A-Z][a-zA-Z\s,]{2,40}?)(?:\s+is\s+confirmed|\s+-|\s*\||\s*$)",
        re.IGNORECASE,
    ),
    # "confirmed/confirmation ... in/to/at City"
    re.compile(
        r"(?:confirmed|confirmation).*?(?:in|to|at)\s+([A-Z][a-zA-Z\s]{2,30}?)(?:\s*[-,\|]|\s*$)",
        re.IGNORECASE,
    ),
    # "traveling/travelling to City"
    re.compile(
        r"(?:traveling|travelling)\s+to\s+([A-Z][a-zA-Z\s]{2,30}?)(?:\s*[-,\|]|\s*$)",
        re.IGNORECASE,
    ),
    # Arrow routes: "LIS → London LHR" or "Lisbon → Seville" — take destination (after →)
    re.compile(
        r"→\s+([A-Z][a-zA-Z\s]{2,30?})(?:\s+[A-Z]{3}\b|\s*[-–,\|]|\s*$)",
    ),
    # "Confirmed: Marrakech private cooking class" — city is first word(s) after label
    re.compile(
        r"(?:Confirmed|Booking confirmed)[:\s\-–]+([A-Z][a-zA-Z\s]{2,25?})"
        r"(?=\s+(?:private|public|walking|boat|city|cooking|desert|whale|surf|kayak|"
        r"architecture|museum|cultural|night|wine|food|jazz|art|heritage|island|coastal))",
    ),
    # "booking confirmed: Algarve resort / Tuscany villa" — city before lodging noun
    re.compile(
        r"(?:confirmed|booking)[:\s\-–]+([A-Z][a-zA-Z\s]{2,25?})"
        r"(?=\s+(?:resort|hotel|hostel|villa|apartment|house|cottage|estate|inn|lodge))",
        re.IGNORECASE,
    ),
    # Trailing region/city after comma: "wine estate, Alentejo"
    re.compile(
        r",\s+([A-Z][a-zA-Z\s]{2,25})\s*$",
    ),
]


def extract_raw_domain(from_header: str) -> str | None:
    """Return the bare domain after @ with no allowlist filtering."""
    match = re.search(r"@([\w.\-]+)", from_header)
    return match.group(1).lower() if match else None


def extract_sender_email(from_header: str) -> str | None:
    match = re.search(r"[\w.+\-]+@[\w.\-]+", from_header)
    return match.group(0).lower() if match else None


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


_FWD_PREFIX = re.compile(r"^\s*(fw|fwd)\s*:\s*", re.IGNORECASE)

_CANCELLATION_PREFIXES = re.compile(
    r"^\s*(cancelad[oa]|cancelled|canceled|annulé|storniert|annullato)[:\s]",
    re.IGNORECASE,
)

def is_cancellation(subject: str) -> bool:
    stripped = _FWD_PREFIX.sub("", subject)
    return bool(_CANCELLATION_PREFIXES.match(stripped))


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


def detect_activities(text: str, signals: dict[str, list[str]]) -> list[str]:
    lower = text.lower()
    return [cat for cat, kws in signals.items() if any(kw in lower for kw in kws)]


def detect_activity_keywords(text: str, signals: dict[str, list[str]]) -> dict[str, list[str]]:
    lower  = text.lower()
    result: dict[str, list[str]] = {}
    for cat, kws in signals.items():
        seen: set[str] = set()
        for kw in kws:
            if kw in lower:
                canonical = KEYWORD_ALIASES.get(kw, kw)
                if canonical not in seen:
                    seen.add(canonical)
                    result.setdefault(cat, []).append(canonical)
    return result


def parse_date(date_str: str) -> str | None:
    try:
        return dateutil_parser.parse(date_str).strftime("%Y-%m-%d")
    except Exception:
        return None

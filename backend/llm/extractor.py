from __future__ import annotations

import json
import re
import time
import httpx

from config import OPENROUTER_API_KEY, OPENROUTER_MODEL
from observability.logger import get

log = get("llm.extractor")

_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

_SYSTEM = """\
You are an expert travel preference analyst. You receive a list of travel-related email subjects
and snippets from a person's inbox. Your job is to extract their genuine travel preferences
and return structured JSON — nothing else.\
"""

_PROMPT = """\
Analyse the following {n} travel emails and extract this person's travel taste profile.

EMAILS:
{evidence}

Return a single JSON object with exactly these fields:
{{
  "taste_summary": "<one vivid sentence describing the traveler's style and interests>",
  "top_categories": ["<category>", ...],
  "preferences": [
    {{
      "category": "<category_name>",
      "keywords": ["<keyword>", ...],
      "confidence": <0.0-1.0>,
      "evidence_count": <int>
    }}
  ]
}}

Use only these category names (include a category only when there is real evidence):
food_dining, culture_history, adventure_outdoor, nightlife, wellness,
sightseeing, accommodation, transportation, cuisine.

Respond with valid JSON only — no markdown fences, no commentary.\
"""


_BOOKING_KEYS  = {"destination_city", "destination_country", "country_code", "booking_type", "categories", "keyword_hits"}
_PROFILE_KEYS  = {"taste_summary", "preferences"}


def _load_json_object(text: str, prefer_keys: set[str] | None = None) -> dict:
    text = text.strip()
    try:
        result = json.loads(text)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    parsed: list[dict] = []
    for match in re.finditer(r"\{", text):
        try:
            result, _ = decoder.raw_decode(text[match.start():])
        except json.JSONDecodeError:
            continue
        if isinstance(result, dict):
            parsed.append(result)

    if not parsed:
        raise ValueError("No JSON object found in LLM response")

    # Prefer the last dict that contains any of the expected keys (reasoning models
    # put intermediate JSON earlier in the chain-of-thought; the final answer is last).
    keys = prefer_keys or set()
    for result in reversed(parsed):
        if result.keys() & keys:
            return result
    return parsed[-1]


def _parse_json_from_message(message: dict) -> dict:
    raw = message.get("content")
    reasoning = message.get("reasoning")
    candidates = []
    if isinstance(raw, str) and raw.strip():
        candidates.append(raw)
    if isinstance(reasoning, str) and reasoning.strip():
        candidates.append(reasoning)
    if isinstance(reasoning, str) and isinstance(raw, str):
        candidates.append(reasoning + raw)
        candidates.append(raw + reasoning)

    fallback: dict | None = None
    for text in candidates:
        try:
            result = _load_json_object(text, prefer_keys=_PROFILE_KEYS)
        except ValueError:
            continue
        if "taste_summary" in result and "preferences" in result:
            return result
        if fallback is None:
            fallback = result

    if fallback is not None:
        return fallback

    raise ValueError("LLM response did not include JSON content")


_BOOKING_SYSTEM = """\
You are a travel booking parser. Extract structured information from email subjects and bodies.
Return valid JSON only — no markdown fences, no commentary.\
"""

_BOOKING_PROMPT = """\
Extract travel booking details from this email.

Subject: {subject}

Body:
{body}

Return a JSON object with exactly these fields:
{{
  "is_travel_booking": <true only if this email confirms an actual reservation the person has already made; false otherwise>,
  "destination_city": "<primary destination city name or null>",
  "destination_country": "<full country name in English or null>",
  "country_code": "<ISO 3166-1 alpha-2 two-letter code or null>",
  "start_date": "<YYYY-MM-DD — only if explicitly stated in the email, otherwise null>",
  "end_date": "<YYYY-MM-DD — only if explicitly stated in the email, otherwise null>",
  "booking_type": "<flight|hotel|activity|transport|other or null>",
  "categories": ["<category_name>", ...],
  "keyword_hits": {{
    "<category_name>": ["<keyword>", ...]
  }}
}}

For categories and keyword_hits, only use the following allowed values:
{categories_spec}

Rules:
- is_travel_booking is TRUE only for confirmed reservations: booking confirmations, e-tickets,
  itineraries, check-in reminders, activity vouchers, rental confirmations.
  A confirmation number or booking reference strongly indicates a real booking.
- is_travel_booking is FALSE for: price alerts ("flights from $99"), deal newsletters,
  promotional offers ("save 30% on hotels"), inspiration emails, loyalty/miles updates,
  travel credit card promotions, subscription digests, cancellation notices, refund receipts,
  and any email that advertises travel without confirming a specific reservation.
- Focus on the city the traveler is going TO (not the origin).
- Never infer or guess dates — use null if not explicitly written.
- Only include a category when there is clear evidence in the email.
- Only include keywords from the allowed list above that are genuinely evidenced.
- categories must be a flat list of matched category names; keyword_hits maps each matched category to its matched keywords.
Respond with valid JSON only.\
"""


def _build_booking_prompt(subject: str, body: str, user_keywords: dict[str, list[str]] | None = None) -> str:
    from detection.config import _DEFAULT_ACTIVITY_SIGNALS
    signals = user_keywords or _DEFAULT_ACTIVITY_SIGNALS
    lines = [f'  {cat}: {", ".join(kws)}' for cat, kws in signals.items()]
    categories_spec = "\n".join(lines)
    return _BOOKING_PROMPT.format(
        subject=subject,
        body=body[:8000],
        categories_spec=categories_spec,
    )


_BATCH_BOOKING_SYSTEM = """\
You are a travel booking parser. For each email provided, extract structured booking information.
Return a single JSON object with a "results" array — one entry per email, in any order.
Return valid JSON only — no markdown fences, no commentary.\
"""

_BATCH_BOOKING_PROMPT = """\
Analyse the following {n} emails and extract travel booking details for each one.

CATEGORY VOCABULARY (only these names are allowed):
{categories_spec}

For each email produce one entry in `results` with exactly these fields:
{{
  "msg_id": "<copy the id from the === EMAIL header exactly>",
  "is_travel_booking": <true only if this email confirms an actual reservation already made; false otherwise>,
  "destination_city": "<primary destination city or null>",
  "destination_country": "<full country name in English or null>",
  "country_code": "<ISO 3166-1 alpha-2 code or null>",
  "start_date": "<YYYY-MM-DD only if explicitly written in the email, else null>",
  "end_date": "<YYYY-MM-DD only if explicitly written in the email, else null>",
  "booking_type": "<flight|hotel|activity|transport|other or null>",
  "categories": ["<category_name>", ...],
  "keyword_hits": {{"<category_name>": ["<keyword>", ...]}}
}}

Rules:
- is_travel_booking is TRUE only for confirmed reservations: booking confirmations, e-tickets,
  itineraries, check-in reminders, activity vouchers, rental confirmations.
  A confirmation number or booking reference strongly indicates a real booking.
- is_travel_booking is FALSE for: price alerts ("flights from $99"), deal newsletters,
  promotional offers ("save 30% on hotels"), inspiration emails, loyalty/miles updates,
  travel credit card promotions, subscription digests, cancellation notices, refund receipts,
  and any email that advertises travel without confirming a specific reservation.
- Focus on the city the traveler is going TO, not the origin.
- Never infer or guess dates — use null if not explicitly stated.
- Only include a category when there is clear evidence in the email.
- Only include keywords from the allowed list that are genuinely evidenced.

EMAILS:
{emails_block}

Return: {{"results": [ ... one object per email ... ]}}
Respond with valid JSON only.\
"""


def _build_categories_spec(user_keywords: dict[str, list[str]] | None = None) -> str:
    from detection.config import _DEFAULT_ACTIVITY_SIGNALS
    signals = user_keywords or _DEFAULT_ACTIVITY_SIGNALS
    return "\n".join(f'  {cat}: {", ".join(kws)}' for cat, kws in signals.items())


def extract_bookings_batch(
    emails: list[dict],
    api_key: str | None = None,
    user_keywords: dict[str, list[str]] | None = None,
    body_cap: int = 3000,
) -> dict[str, dict]:
    """Extract booking details for multiple emails in a single LLM call.

    Args:
        emails: list of {"msg_id", "subject", "body"}
    Returns:
        {msg_id: extraction_dict}. May be partial if some rows failed to parse;
        caller should fall back per-email for any missing msg_ids.
    """
    if not emails:
        return {}

    key = api_key or OPENROUTER_API_KEY
    if not key:
        raise RuntimeError("No OpenRouter API key available")

    categories_spec = _build_categories_spec(user_keywords)

    email_parts: list[str] = []
    body_chars: list[int] = []
    msg_ids  = [e["msg_id"] for e in emails]
    subjects = [e["subject"][:60] for e in emails]

    for e in emails:
        trimmed = e["body"][:body_cap]
        body_chars.append(min(len(e["body"]), body_cap))
        email_parts.append(
            f"=== EMAIL {e['msg_id']} ===\nSubject: {e['subject']}\nBody:\n{trimmed}"
        )

    emails_block = "\n\n".join(email_parts)
    prompt = _BATCH_BOOKING_PROMPT.format(
        n=len(emails),
        categories_spec=categories_spec,
        emails_block=emails_block,
    )

    log.info(
        f"LLM extract_bookings_batch send"
        f"  size={len(emails)}"
        f"  body_chars={body_chars}"
        f"  msg_ids={msg_ids}"
        f"  subjects={subjects!r}"
    )

    t0 = time.monotonic()
    for attempt in range(5):
        response = httpx.post(
            _OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://email-travel-parser",
                "X-Title": "Email Travel Parser",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": _BATCH_BOOKING_SYSTEM},
                    {"role": "user",   "content": prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
            },
            timeout=120.0,
        )

        if response.status_code == 429:
            wait = min(4 * (2 ** attempt), 60)
            retry_after = response.headers.get("Retry-After", "")
            if retry_after.isdigit():
                wait = max(wait, int(retry_after))
            log.warning(f"LLM 429 rate-limited (batch)  attempt={attempt + 1}/5  backing_off={wait}s")
            time.sleep(wait)
            continue

        response.raise_for_status()

        resp_json = response.json()
        message   = resp_json["choices"][0]["message"]
        usage     = resp_json.get("usage", {})
        latency_ms = round((time.monotonic() - t0) * 1000)
        raw = (message.get("reasoning") or "") + (message.get("content") or "")

        log.info(
            f"LLM extract_bookings_batch raw"
            f"  latency_ms={latency_ms}"
            f"  prompt_tokens={usage.get('prompt_tokens')}"
            f"  completion_tokens={usage.get('completion_tokens')}"
            f"  raw_tail={raw[-600:]!r}"
        )

        try:
            envelope = _load_json_object(raw, prefer_keys={"results"})
        except ValueError:
            log.warning(f"LLM extract_bookings_batch: no JSON envelope  raw_tail={raw[-300:]!r}")
            return {}

        rows = envelope.get("results") or []
        result: dict[str, dict] = {}
        for row in rows:
            if not isinstance(row, dict):
                continue
            mid = row.pop("msg_id", None)
            if not mid:
                log.warning(f"LLM extract_bookings_batch: row missing msg_id  keys={list(row.keys())}")
                continue
            result[mid] = row
            log.info(
                f"LLM extract_booking ok"
                f"  is_travel={row.get('is_travel_booking')}"
                f"  city={row.get('destination_city')!r}"
                f"  country={row.get('destination_country')!r}"
                f"  type={row.get('booking_type')!r}"
                f"  start={row.get('start_date')!r}"
                f"  end={row.get('end_date')!r}"
                f"  categories={row.get('categories')}"
                f"  msg_id={mid!r}"
            )

        missing = [mid for mid in msg_ids if mid not in result]
        travel_yes = sum(1 for r in result.values() if r.get("is_travel_booking"))
        travel_no  = len(result) - travel_yes
        log.info(
            f"LLM extract_bookings_batch ok"
            f"  size={len(emails)}  parsed={len(result)}  missing={missing}"
            f"  travel_yes={travel_yes}  travel_no={travel_no}"
        )
        return result

    log.error("LLM extract_bookings_batch: exhausted retries after 429s")
    return {}


def extract_booking(subject: str, body: str, api_key: str | None = None, user_keywords: dict[str, list[str]] | None = None) -> dict:
    """Extract destination, country, dates, booking type and activity categories from an email."""
    key = api_key or OPENROUTER_API_KEY
    if not key:
        raise RuntimeError("No OpenRouter API key available — set OPENROUTER_API_KEY or provide one via the app.")

    prompt = _build_booking_prompt(subject, body, user_keywords)

    body_len = len(body)
    log.info(
        f"LLM  extract_booking  model={OPENROUTER_MODEL}"
        f"  key_source={'user' if api_key else 'env'}"
        f"  body_chars={body_len}  body_truncated={body_len > 4000}"
        f"  subject={subject[:60]!r}"
    )

    t0 = time.monotonic()
    for attempt in range(5):
        response = httpx.post(
            _OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://email-travel-parser",
                "X-Title": "Email Travel Parser",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": _BOOKING_SYSTEM},
                    {"role": "user",   "content": prompt},
                ],
                "temperature": 0.1,
            },
            timeout=30.0,
        )

        if response.status_code == 429:
            wait = min(4 * (2 ** attempt), 60)
            retry_after = response.headers.get("Retry-After", "")
            if retry_after.isdigit():
                wait = max(wait, int(retry_after))
            log.warning(f"LLM 429 rate-limited  attempt={attempt + 1}/5  backing_off={wait}s  subject={subject[:40]!r}")
            time.sleep(wait)
            continue

        response.raise_for_status()

        resp_json = response.json()
        message = resp_json["choices"][0]["message"]
        usage = resp_json.get("usage", {})
        latency_ms = round((time.monotonic() - t0) * 1000)
        # Reasoning models (e.g. MiniMax M1) put chain-of-thought in reasoning and
        # the final answer at the end. Concatenate both so the scanner sees everything.
        raw = (message.get("reasoning") or "") + (message.get("content") or "")
        log.info(
            f"LLM extract_booking raw"
            f"  latency_ms={latency_ms}"
            f"  prompt_tokens={usage.get('prompt_tokens')}"
            f"  completion_tokens={usage.get('completion_tokens')}"
            f"  subject={subject[:60]!r}"
            f"  response={raw[:600]!r}"
        )
        try:
            result = _load_json_object(raw, prefer_keys=_BOOKING_KEYS)
            log.info(
                f"LLM extract_booking ok"
                f"  is_travel={result.get('is_travel_booking')}"
                f"  city={result.get('destination_city')!r}"
                f"  country={result.get('destination_country')!r}"
                f"  type={result.get('booking_type')!r}"
                f"  start={result.get('start_date')!r}"
                f"  end={result.get('end_date')!r}"
                f"  categories={result.get('categories')}"
            )
            return result
        except ValueError:
            log.warning(f"LLM extract_booking: no JSON in response  subject={subject[:60]!r}  raw_tail={raw[-300:]!r}")
            return {}

    log.error(f"LLM extract_booking: exhausted retries after 429s  subject={subject[:60]!r}")
    return {}


def extract_preferences(evidence_emails: list[dict]) -> dict:
    """Send evidence emails to MiniMax via OpenRouter and return structured preferences."""
    lines = []
    for i, e in enumerate(evidence_emails, 1):
        subject = (e.get("subject") or "").strip()
        snippet = (e.get("snippet") or "")[:300].strip()
        lines.append(f"{i}. Subject: {subject}\n   Snippet: {snippet}")
    evidence_text = "\n".join(lines)

    prompt = _PROMPT.format(n=len(evidence_emails), evidence=evidence_text)

    log.info(f"LLM  calling OpenRouter  model={OPENROUTER_MODEL}  emails={len(evidence_emails)}")

    response = httpx.post(
        _OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://email-travel-parser",
            "X-Title": "Email Travel Parser",
        },
        json={
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": _SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        },
        timeout=90.0,
    )
    response.raise_for_status()

    message = response.json()["choices"][0]["message"]
    result = _parse_json_from_message(message)
    log.info(f"LLM  extraction done  categories={[p['category'] for p in result.get('preferences', [])]}")
    return result

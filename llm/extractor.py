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
  "is_travel_booking": <true if this is a confirmed travel booking, false otherwise>,
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
- Focus on the city the traveler is going TO (not the origin).
- Never infer or guess dates — use null if not explicitly written.
- Only include a category when there is clear evidence in the email.
- Only include keywords from the allowed list above that are genuinely evidenced.
- categories must be a flat list of matched category names; keyword_hits maps each matched category to its matched keywords.
Respond with valid JSON only.\
"""


def _build_booking_prompt(subject: str, body: str) -> str:
    from detection.config import get_activity_signals
    signals = get_activity_signals()
    lines = [f'  {cat}: {", ".join(kws)}' for cat, kws in signals.items()]
    categories_spec = "\n".join(lines)
    return _BOOKING_PROMPT.format(
        subject=subject,
        body=body[:4000],
        categories_spec=categories_spec,
    )


def extract_booking(subject: str, body: str) -> dict:
    """Extract destination, country, dates, booking type and activity categories from an email."""
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set — LLM extraction unavailable")

    prompt = _build_booking_prompt(subject, body)

    log.info(f"LLM  extract_booking  model={OPENROUTER_MODEL}  subject={subject[:60]!r}")

    for attempt in range(5):
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

        message = response.json()["choices"][0]["message"]
        # Reasoning models (e.g. MiniMax M1) put chain-of-thought in reasoning and
        # the final answer at the end. Concatenate both so the scanner sees everything.
        raw = (message.get("reasoning") or "") + (message.get("content") or "")
        log.debug(f"LLM extract_booking raw (last 500): {raw[-500:]!r}")
        try:
            result = _load_json_object(raw, prefer_keys=_BOOKING_KEYS)
            log.info(f"LLM extract_booking ok  city={result.get('destination_city')!r}  country={result.get('destination_country')!r}")
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

from __future__ import annotations

import json
import re
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


def _load_json_object(text: str) -> dict:
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
    for result in parsed:
        if "taste_summary" in result and "preferences" in result:
            return result
    if parsed:
        return parsed[0]
    raise ValueError("No JSON object found in LLM response")


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
            result = _load_json_object(text)
        except ValueError:
            continue
        if "taste_summary" in result and "preferences" in result:
            return result
        if fallback is None:
            fallback = result

    if fallback is not None:
        return fallback

    raise ValueError("LLM response did not include JSON content")


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

"""
Full taste-profile pipeline
============================
  msgvault search
    → MiniMax M1 (via OpenRouter) — structured preference extraction
    → hosted/local embedding      — 768-dim embedding
    → Supabase                    — upsert profile + evidence rows

Usage (from email-travel-parser/ root):
    MSGVAULT_ACCOUNT=you@gmail.com python scripts/run_taste_profile.py

Optional env overrides:
    MSGVAULT_HOME    path to msgvault data dir  (default: ~/.msgvault)
    MSGVAULT_QUERY   override the search query
    MSGVAULT_LIMIT   how many emails to retrieve (default: 20)
    MSGVAULT_SEARCH_MODE fts|vector|hybrid (default: hybrid)
    OPENROUTER_MODEL override the LLM model
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone

# make sure imports resolve from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from db.client import get as get_db
from llm.extractor import extract_preferences
from llm.embedder import embed_text, embedding_model_name
from observability.logger import get

log = get("pipeline.taste_profile")

_DEFAULT_QUERIES = [
    "food tour cooking class wine tasting culinary experience",
    "museum walking tour cultural heritage architecture",
    "hiking surf kayak adventure outdoor",
    "boutique hotel airbnb villa accommodation",
    "nightlife bar cocktail rooftop",
]
_DEFAULT_FTS_QUERIES = [
    "booking",
    "cooking",
    "wine",
    "architecture",
    "museum",
    "surf",
    "sailing",
    "hotel",
    "train",
    "flight",
    "festival",
]

_MSGVAULT_LIMIT = int(os.environ.get("MSGVAULT_LIMIT", "20"))
_MSGVAULT_SEARCH_MODE = os.environ.get("MSGVAULT_SEARCH_MODE", "hybrid")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _loads_json_output(text: str) -> dict | list:
    decoder = json.JSONDecoder()
    for index, char in enumerate(text):
        if char not in "[{":
            continue
        try:
            value, _ = decoder.raw_decode(text[index:])
        except json.JSONDecodeError:
            continue
        return value
    return {}


def _run_json(*args: str) -> dict | list:
    result = subprocess.run(args, check=True, capture_output=True, text=True)
    return _loads_json_output(result.stdout)


def _search(query: str, msgvault_home: str) -> list[dict]:
    try:
        data = _run_json(
            "msgvault", "search", query,
            "--mode", _MSGVAULT_SEARCH_MODE,
            "--json",
            "--limit", str(_MSGVAULT_LIMIT),
        )
        if isinstance(data, list):
            return data
        return data.get("results", []) if isinstance(data, dict) else []
    except (subprocess.CalledProcessError, json.JSONDecodeError, FileNotFoundError) as e:
        log.warning(f"msgvault search failed: {e}")
        return []


def _fetch_message(msg_id: str) -> dict:
    try:
        return _run_json("msgvault", "show-message", str(msg_id), "--json")
    except Exception as e:
        log.warning(f"msgvault show-message {msg_id} failed: {e}")
        return {}


def _sender_domain(message: dict) -> str | None:
    for s in (message.get("from") or []):
        email = s.get("email", "")
        if "@" in email:
            return email.split("@", 1)[1].lower()
    return None


def _evidence_query_column(db) -> str:
    try:
        db.table("msgvault_message_evidence").select("query_that_found_email").limit(1).execute()
        return "query_that_found_email"
    except Exception:
        return "search_query"


def run(account_email: str) -> dict:
    msgvault_home = os.environ.get("MSGVAULT_HOME", os.path.expanduser("~/.msgvault"))
    if "MSGVAULT_QUERY" in os.environ:
        queries = [os.environ["MSGVAULT_QUERY"]]
    elif _MSGVAULT_SEARCH_MODE == "fts":
        queries = _DEFAULT_FTS_QUERIES
    else:
        queries = _DEFAULT_QUERIES

    db = get_db()

    # ── resolve user ──────────────────────────────────────────────────────────
    user_res = db.table("users").select("id").eq("email", account_email).single().execute()
    user_id = user_res.data["id"]

    # ── upsert msgvault source record ─────────────────────────────────────────
    source = db.table("msgvault_sources").upsert(
        {
            "user_id":        user_id,
            "account_email":  account_email,
            "msgvault_home":  msgvault_home,
            "last_sync_at":   _now(),
            "updated_at":     _now(),
        },
        on_conflict="user_id,account_email",
    ).execute().data[0]

    # ── open a pipeline run ───────────────────────────────────────────────────
    run_rec = db.table("msgvault_profile_runs").insert(
        {
            "user_id":             user_id,
            "msgvault_source_id":  source["id"],
            "status":              "running",
            "search_mode":         _MSGVAULT_SEARCH_MODE,
            "search_queries":      queries,
            "embedding_dimensions": 768,
        }
    ).execute().data[0]
    run_id = run_rec["id"]
    log.info(f"Pipeline  run_id={run_id}")

    # ── collect evidence via msgvault ─────────────────────────────────────────
    evidence_query_column = _evidence_query_column(db)
    seen_ids: set[str] = set()
    evidence_emails: list[dict] = []
    evidence_rows:   list[dict] = []

    for query in queries:
        hits = _search(query, msgvault_home)
        for rank, hit in enumerate(hits, 1):
            msg_id = str(hit["id"])
            if msg_id in seen_ids:
                continue
            seen_ids.add(msg_id)

            message = _fetch_message(msg_id)
            subject = message.get("subject") or ""
            snippet = message.get("snippet") or ""

            evidence_emails.append({"subject": subject, "snippet": snippet})

            # link to emails table if this message was already scanned
            email_match = (
                db.table("emails")
                .select("id")
                .eq("gmail_msg_id", message.get("source_message_id"))
                .limit(1)
                .execute()
                .data
            )

            evidence_rows.append({
                "run_id":                     run_id,
                "user_id":                    user_id,
                "email_id":                   email_match[0]["id"] if email_match else None,
                "msgvault_message_id":         msg_id,
                "msgvault_source_message_id":  message.get("source_message_id"),
                "sender_domain":              _sender_domain(message),
                "subject":                    subject,
                "sent_at":                    message.get("sent_at"),
                "snippet":                    snippet,
                evidence_query_column:         query,
                "search_rank":                rank,
                "relevance_score":            hit.get("vector_score"),
                "extracted_preferences":      [],
            })

    log.info(f"Pipeline  evidence collected  count={len(evidence_emails)}")

    if not evidence_emails:
        db.table("msgvault_profile_runs").update(
            {"status": "failed", "error_message": "No evidence emails found", "completed_at": _now()}
        ).eq("id", run_id).execute()
        return {"run_id": run_id, "status": "failed", "reason": "no_evidence"}

    # ── LLM: extract structured preferences ──────────────────────────────────
    extracted = extract_preferences(evidence_emails)
    taste_text = extracted.get("taste_summary", "")

    # backfill extracted_preferences into evidence rows
    top_cats = {p["category"] for p in extracted.get("preferences", [])}
    for row in evidence_rows:
        row["extracted_preferences"] = [
            {"category": cat, "method": "minimax_extraction"}
            for cat in top_cats
        ]

    # ── embed the taste summary ───────────────────────────────────────────────
    embedding = embed_text(taste_text)

    # ── write evidence ────────────────────────────────────────────────────────
    if evidence_rows:
        db.table("msgvault_message_evidence").insert(evidence_rows).execute()

    # ── upsert user_preferences (keyword-level) ───────────────────────────────
    _upsert_preferences_from_extraction(db, user_id, run_id, extracted)

    # ── upsert taste profile ──────────────────────────────────────────────────
    db.table("user_taste_profiles").upsert(
        {
            "user_id":              user_id,
            "latest_run_id":        run_id,
            "profile_text":         taste_text,
            "profile_json":         extracted,
            "embedding":            embedding,
            "embedding_model":      embedding_model_name(),
            "embedding_dimensions": 768,
            "source":               "msgvault_minimax",
            "confidence":           0.80,
            "generated_at":         _now(),
            "updated_at":           _now(),
        },
        on_conflict="user_id",
    ).execute()

    # ── close run ─────────────────────────────────────────────────────────────
    db.table("msgvault_profile_runs").update(
        {
            "status":              "completed",
            "search_result_count": len(evidence_rows),
            "embedding_model":     embedding_model_name(),
            "embedding_dimensions": 768,
            "completed_at":        _now(),
        }
    ).eq("id", run_id).execute()

    log.info(f"Pipeline  done  run_id={run_id}  evidence={len(evidence_rows)}")
    return {
        "run_id":         run_id,
        "status":         "completed",
        "evidence_count": len(evidence_rows),
        "taste_summary":  taste_text,
        "top_categories": extracted.get("top_categories", []),
    }


def _upsert_preferences_from_extraction(db, user_id: str, run_id: str, extracted: dict) -> None:
    for pref in extracted.get("preferences", []):
        category = pref["category"]
        keywords = pref.get("keywords", [])
        confidence = pref.get("confidence", 0.7)

        cat_res = db.table("activity_categories").select("id").eq("name", category).execute()
        if not cat_res.data:
            continue
        category_id = cat_res.data[0]["id"]

        for keyword in keywords:
            kw_res = (
                db.table("activity_keywords")
                .select("id")
                .eq("category_id", category_id)
                .eq("keyword", keyword)
                .execute()
            )
            if not kw_res.data:
                continue
            kw_id = kw_res.data[0]["id"]

            up_res = db.table("user_preferences").upsert(
                {
                    "user_id":             user_id,
                    "activity_keyword_id": kw_id,
                    "intensity":           "strong" if confidence >= 0.8 else "moderate" if confidence >= 0.5 else "weak",
                    "count":               pref.get("evidence_count", 1),
                    "source":              "inferred",
                    "updated_at":          _now(),
                },
                on_conflict="user_id,activity_keyword_id",
            ).execute()

            if up_res.data:
                up_id = up_res.data[0]["id"]
                evidence_payload = {
                    "user_preference_id": up_id,
                    "run_id":             run_id,
                    "confidence":         confidence,
                    "rationale":          f"Extracted from {pref.get('evidence_count', 1)} emails",
                }
                try:
                    db.table("user_preference_evidence").upsert(
                        evidence_payload,
                        on_conflict="user_preference_id,run_id",
                    ).execute()
                except Exception:
                    db.table("user_preference_evidence").insert(evidence_payload).execute()


if __name__ == "__main__":
    account = os.environ.get("MSGVAULT_ACCOUNT")
    if not account:
        print("ERROR: set MSGVAULT_ACCOUNT=you@gmail.com", file=sys.stderr)
        sys.exit(1)
    result = run(account)
    print(json.dumps(result, indent=2))

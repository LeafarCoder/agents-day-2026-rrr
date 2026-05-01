from __future__ import annotations

import json
import os
import subprocess
from collections import Counter
from datetime import datetime, timezone

from db.client import get
from gmail import parser


DEFAULT_QUERY = (
    "traveler likes cooking classes wine tasting architecture walks "
    "boutique hotels and surf coaching"
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _run_json(*args: str) -> dict:
    proc = subprocess.run(args, check=True, capture_output=True, text=True)
    return json.loads(proc.stdout)


def _sender_domain(message: dict) -> str | None:
    senders = message.get("from") or []
    if not senders:
        return None
    email = senders[0].get("email", "")
    return email.split("@", 1)[1].lower() if "@" in email else None


def main() -> None:
    account_email = os.environ["MSGVAULT_ACCOUNT"]
    query = os.environ.get("MSGVAULT_QUERY", DEFAULT_QUERY)
    msgvault_home = os.environ.get("MSGVAULT_HOME", os.path.expanduser("~/.msgvault"))

    db = get()
    user = db.table("users").select("id,email").eq("email", account_email).single().execute().data
    user_id = user["id"]

    source = db.table("msgvault_sources").upsert(
        {
            "user_id": user_id,
            "account_email": account_email,
            "msgvault_source_id": 1,
            "msgvault_home": msgvault_home,
            "last_sync_at": _now(),
            "active_vector_generation": {
                "model": "nomic-embed-text",
                "dimension": 768,
                "fingerprint": "nomic-embed-text:768",
                "state": "active",
            },
            "updated_at": _now(),
        },
        on_conflict="user_id,account_email",
    ).execute().data[0]

    run = db.table("msgvault_profile_runs").insert(
        {
            "user_id": user_id,
            "msgvault_source_id": source["id"],
            "status": "running",
            "search_mode": "hybrid",
            "search_queries": [query],
            "embedding_dimensions": 1536,
        }
    ).execute().data[0]

    search = _run_json(
        "msgvault",
        "search",
        query,
        "--mode",
        "hybrid",
        "--json",
        "--limit",
        "8",
        "--explain",
    )

    category_counts: Counter[str] = Counter()
    evidence_rows = []
    evidence_subjects = []

    for rank, hit in enumerate(search.get("results", []), start=1):
        message = _run_json("msgvault", "show-message", str(hit["id"]), "--json")
        text = " ".join(
            filter(None, [message.get("subject"), message.get("snippet"), message.get("body_text")])
        )
        categories = parser.detect_activities(text)
        category_counts.update(categories)
        evidence_subjects.append(message.get("subject"))

        email_match = (
            db.table("emails")
            .select("id")
            .eq("gmail_msg_id", message.get("source_message_id"))
            .limit(1)
            .execute()
            .data
        )

        evidence_rows.append(
            {
                "run_id": run["id"],
                "user_id": user_id,
                "email_id": email_match[0]["id"] if email_match else None,
                "msgvault_message_id": str(message.get("id")),
                "msgvault_source_message_id": message.get("source_message_id"),
                "sender_domain": _sender_domain(message),
                "subject": message.get("subject"),
                "sent_at": message.get("sent_at"),
                "snippet": message.get("snippet"),
                "query_that_found_email": query,
                "search_rank": rank,
                "relevance_score": hit.get("vector_score"),
                "extracted_preferences": [
                    {"category": category, "method": "keyword_smoke_test"}
                    for category in categories
                ],
            }
        )

    if evidence_rows:
        db.table("msgvault_message_evidence").insert(evidence_rows).execute()

    ordered = category_counts.most_common()
    if ordered:
        profile_text = "Taste profile inferred from local msgvault smoke test: " + "; ".join(
            f"{category.replace('_', ' ')} ({count} evidence emails)"
            for category, count in ordered
        )
    else:
        profile_text = (
            "Taste profile inferred from local msgvault smoke test: travel email evidence "
            "found, but no configured activity keyword categories matched."
        )

    db.table("user_taste_profiles").upsert(
        {
            "user_id": user_id,
            "latest_run_id": run["id"],
            "profile_text": profile_text,
            "profile_json": {
                "method": "msgvault_hybrid_keyword_smoke_test",
                "note": "Smoke test only. Replace with Claude extraction before production use.",
                "query": query,
                "evidence_count": len(evidence_rows),
                "top_categories": [category for category, _ in ordered],
                "category_counts": dict(category_counts),
                "evidence_subjects": evidence_subjects,
                "vector_generation": search.get("generation"),
                "embedding_status": (
                    "not_written_schema_expects_1536_local_msgvault_index_is_768"
                ),
            },
            "embedding": None,
            "embedding_model": None,
            "embedding_dimensions": 1536,
            "source": "imported",
            "confidence": 0.65,
            "generated_at": _now(),
            "updated_at": _now(),
        },
        on_conflict="user_id",
    ).execute()

    db.table("msgvault_profile_runs").update(
        {
            "status": "completed",
            "search_result_count": len(evidence_rows),
            "completed_at": _now(),
        }
    ).eq("id", run["id"]).execute()

    print(
        json.dumps(
            {
                "run_id": run["id"],
                "user_id": user_id,
                "evidence_count": len(evidence_rows),
                "category_counts": dict(category_counts),
                "profile_text": profile_text,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

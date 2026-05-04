from __future__ import annotations

from datetime import datetime, timezone

from observability.logger import get
from db.client import get as get_client

log = get("db.writer")

_UNKNOWN_COUNTRY = {"name": "Unknown", "code": "XX"}
_CITY_COUNTRY_HINTS: dict[str, tuple[str, str]] = {
    "lisbon": ("Portugal", "PT"),
    "porto": ("Portugal", "PT"),
    "faro": ("Portugal", "PT"),
    "alentejo": ("Portugal", "PT"),
    "paris": ("France", "FR"),
    "lyon": ("France", "FR"),
    "nice": ("France", "FR"),
    "chamonix": ("France", "FR"),
    "marseille": ("France", "FR"),
    "bordeaux": ("France", "FR"),
    "barcelona": ("Spain", "ES"),
    "madrid": ("Spain", "ES"),
    "seville": ("Spain", "ES"),
    "rome": ("Italy", "IT"),
    "milan": ("Italy", "IT"),
    "venice": ("Italy", "IT"),
    "berlin": ("Germany", "DE"),
    "munich": ("Germany", "DE"),
    "amsterdam": ("Netherlands", "NL"),
    "london": ("United Kingdom", "GB"),
    "manchester": ("United Kingdom", "GB"),
    "tokyo": ("Japan", "JP"),
    "kyoto": ("Japan", "JP"),
    "osaka": ("Japan", "JP"),
    "bangkok": ("Thailand", "TH"),
    "singapore": ("Singapore", "SG"),
    "marrakech": ("Morocco", "MA"),
    "sydney": ("Australia", "AU"),
    "melbourne": ("Australia", "AU"),
    "athens": ("Greece", "GR"),
    "vienna": ("Austria", "AT"),
}


def delete_user(user_email: str) -> bool:
    db = get_client()
    res = db.table("users").delete().eq("email", user_email).execute()
    return len(res.data) > 0


def set_openrouter_key(user_email: str, plaintext: str) -> None:
    from crypto.secrets import encrypt_secret
    encrypted = encrypt_secret(plaintext)
    db = get_client()
    db.table("users").upsert(
        {
            "email": user_email,
            "openrouter_api_key_encrypted": encrypted.hex(),
            "openrouter_api_key_updated_at": _now(),
        },
        on_conflict="email",
    ).execute()


def save_user_profile_info(
    user_email: str,
    *,
    display_name: str | None,
    home_city: str | None,
    home_country: str | None,
    home_country_code: str | None,
) -> None:
    db = get_client()
    db.table("users").upsert(
        {
            "email":             user_email,
            "display_name":      display_name,
            "home_city":         home_city,
            "home_country":      home_country,
            "home_country_code": home_country_code,
        },
        on_conflict="email",
    ).execute()


def save_excluded_labels(user_email: str, labels: list[str]) -> None:
    db = get_client()
    db.table("users").upsert(
        {"email": user_email, "excluded_gmail_labels": labels},
        on_conflict="email",
    ).execute()


def exclude_booking(user_email: str, gmail_msg_id: str) -> bool:
    """Mark an email as excluded from travel DNA analysis without deleting it.

    Preserves the llm_extraction so future scans skip the LLM call.
    Returns True if a row was updated.
    """
    db = get_client()
    user_res = db.table("users").select("id").eq("email", user_email).maybe_single().execute()
    if not user_res or not user_res.data:
        return False
    user_id = user_res.data["id"]
    db.table("emails").update({"is_excluded": True}).eq("user_id", user_id).eq("gmail_msg_id", gmail_msg_id).execute()
    return True


def clear_openrouter_key(user_email: str) -> None:
    db = get_client()
    db.table("users").update(
        {"openrouter_api_key_encrypted": None, "openrouter_api_key_updated_at": None}
    ).eq("email", user_email).execute()


def set_tour_seen(user_email: str, *, seen: bool) -> None:
    db = get_client()
    db.table("users").upsert(
        {
            "email":             user_email,
            "has_seen_tour":     seen,
            "tour_completed_at": _now() if seen else None,
        },
        on_conflict="email",
    ).execute()


def persist(user_email: str, bookings: list[dict], non_bookings: list[dict], profile: dict) -> None:
    db = get_client()

    user_id = _upsert_user(db, user_email, bookings)
    log.info(f"── DB  user upserted  id={user_id}")

    destination_travel = _resolve_destinations(db, user_id, bookings)

    log.info(f"── DB  travels upserted  count={len(destination_travel)}")

    inserted = _insert_emails(db, user_id, bookings + non_bookings, destination_travel)
    log.info(f"── DB  emails inserted  count={inserted}  negatives={len(non_bookings)}")

    pref_count = _upsert_user_preferences(db, user_id, profile)
    log.info(f"── DB  user_preferences upserted  count={pref_count}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def seed_user_keywords(db, user_id: str) -> None:
    """Seed the default activity vocabulary for a user. No-op if already seeded."""
    from detection.config import _DEFAULT_ACTIVITY_SIGNALS

    for cat_name, keywords in _DEFAULT_ACTIVITY_SIGNALS.items():
        cat_res = db.table("activity_categories").upsert(
            {"user_id": user_id, "name": cat_name},
            on_conflict="user_id,name",
        ).execute()
        cat_id = cat_res.data[0]["id"]

        if keywords:
            db.table("activity_keywords").upsert(
                [{"user_id": user_id, "category_id": cat_id, "keyword": kw} for kw in keywords],
                on_conflict="category_id,keyword",
                returning="minimal",
            ).execute()


def _upsert_user(db, email: str, bookings: list[dict]) -> str:
    dates = [b["date"] for b in bookings if b["date"]]
    oldest = min(dates) if dates else None

    payload: dict = {
        "email":           email,
        "last_scanned_at": _now(),
    }
    if oldest:
        payload["oldest_email_scanned"] = oldest

    res = db.table("users").upsert(payload, on_conflict="email").execute()
    user_id = res.data[0]["id"]
    seed_user_keywords(db, user_id)
    return user_id


def _infer_country_from_city(city_name: str | None) -> dict[str, str]:
    if not city_name:
        return _UNKNOWN_COUNTRY
    key = city_name.strip().lower()
    if key in _CITY_COUNTRY_HINTS:
        name, code = _CITY_COUNTRY_HINTS[key]
        return {"name": name, "code": code}
    return _UNKNOWN_COUNTRY


def _dest_dates(dest: str, bookings: list[dict]) -> tuple[str | None, str | None]:
    """Return (start_date, end_date) for a destination across all its bookings."""
    dest_bookings = [b for b in bookings if b["destination"] == dest]
    # Prefer LLM-extracted travel dates; fall back to email date for start only.
    # Never derive end_date from email timestamps — it produces false trip durations.
    llm_starts  = sorted(b["start_date"] for b in dest_bookings if b.get("start_date"))
    llm_ends    = sorted(b["end_date"]   for b in dest_bookings if b.get("end_date"))
    email_dates = sorted(b["date"]       for b in dest_bookings if b.get("date"))
    start = llm_starts[0] if llm_starts else (email_dates[0] if email_dates else None)
    end   = llm_ends[-1]  if llm_ends   else None
    return start, end


def _resolve_destinations(db, user_id: str, bookings: list[dict]) -> dict[str, str]:
    """Return {destination_name: travel_id} using batched DB calls."""
    unique_destinations = {b["destination"] for b in bookings if b["destination"]}
    if not unique_destinations:
        return {}

    # Build {dest: {name, code}} — prefer LLM-extracted country, fall back to hints.
    dest_country: dict[str, dict] = {}
    for dest in unique_destinations:
        sample = next((b for b in bookings if b["destination"] == dest), {})
        if sample.get("country") and sample.get("country_code"):
            dest_country[dest] = {"name": sample["country"], "code": sample["country_code"].upper()[:2]}
        else:
            dest_country[dest] = _infer_country_from_city(dest)

    # --- Countries: one SELECT + one bulk INSERT for any missing ---
    unique_codes = {c["code"] for c in dest_country.values()}
    existing_countries = (
        db.table("countries").select("id, code").in_("code", list(unique_codes)).execute()
    )
    code_to_id: dict[str, str] = {row["code"]: row["id"] for row in (existing_countries.data or [])}

    missing_countries = [
        {"name": next(c["name"] for c in dest_country.values() if c["code"] == code), "code": code}
        for code in unique_codes if code not in code_to_id
    ]
    if missing_countries:
        ins = db.table("countries").insert(missing_countries).execute()
        for row in (ins.data or []):
            code_to_id[row["code"]] = row["id"]

    # --- Cities: per-country batch SELECT + bulk INSERT for missing ---
    # Group destinations by their country_id.
    from collections import defaultdict
    country_to_dests: dict[str, list[str]] = defaultdict(list)
    for dest, country in dest_country.items():
        cid = code_to_id.get(country["code"])
        if cid:
            country_to_dests[cid].append(dest)

    dest_city_id: dict[str, str] = {}
    for cid, dests in country_to_dests.items():
        existing_cities = (
            db.table("cities")
            .select("id, name")
            .eq("country_id", cid)
            .in_("name", dests)
            .execute()
        )
        city_name_to_id: dict[str, str] = {row["name"]: row["id"] for row in (existing_cities.data or [])}

        missing_cities = [{"name": d, "country_id": cid} for d in dests if d not in city_name_to_id]
        if missing_cities:
            ins = db.table("cities").insert(missing_cities).execute()
            for row in (ins.data or []):
                city_name_to_id[row["name"]] = row["id"]

        for dest in dests:
            if dest in city_name_to_id:
                dest_city_id[dest] = city_name_to_id[dest]

    # --- Travels: one SELECT + bulk INSERT for new, per-row PATCH only when dates change ---
    city_ids = list(dest_city_id.values())
    existing_travels = (
        db.table("travels")
        .select("id, destination_city_id, start_date, end_date")
        .eq("user_id", user_id)
        .in_("destination_city_id", city_ids)
        .execute()
    ) if city_ids else None

    city_to_travel: dict[str, dict] = {
        row["destination_city_id"]: row for row in ((existing_travels.data or []) if existing_travels else [])
    }

    destination_travel: dict[str, str] = {}
    new_travel_payloads: list[dict] = []
    new_travel_dests: list[str] = []

    for dest, city_id in dest_city_id.items():
        start, end = _dest_dates(dest, bookings)
        if city_id in city_to_travel:
            row = city_to_travel[city_id]
            travel_id = row["id"]
            destination_travel[dest] = travel_id
            update: dict = {}
            if start:
                update["start_date"] = start
            if end:
                update["end_date"] = end
            if update:
                db.table("travels").update(update).eq("id", travel_id).execute()
        else:
            payload: dict = {"user_id": user_id, "destination_city_id": city_id, "title": dest}
            if start:
                payload["start_date"] = start
            if end:
                payload["end_date"] = end
            new_travel_payloads.append(payload)
            new_travel_dests.append(dest)

    if new_travel_payloads:
        ins = db.table("travels").insert(new_travel_payloads).execute()
        for dest, row in zip(new_travel_dests, (ins.data or [])):
            destination_travel[dest] = row["id"]

    return destination_travel


def _insert_emails(
    db, user_id: str, bookings: list[dict], destination_travel: dict[str, str]
) -> int:
    if not bookings:
        return 0
    payloads = [
        {
            "user_id":        user_id,
            "gmail_msg_id":   b["id"],
            "subject":        b["subject"] or "",
            "llm_extraction": b.get("llm_extraction"),
            "sender_domain":  b["domain"] or None,
            "email_date":     b["date"] or None,
            "travel_id":      (destination_travel.get(b["destination"]) if b["destination"] else None),
        }
        for b in bookings
    ]
    db.table("emails").upsert(
        payloads,
        on_conflict="gmail_msg_id",
        returning="minimal",
    ).execute()
    return len(payloads)


def update_trip(user_id: str, trip_id: str, *, title=None, start_date=None, end_date=None, destination_city_id=None) -> bool:
    db = get_client()
    check = db.table("travels").select("id").eq("id", trip_id).eq("user_id", user_id).execute()
    if not check.data:
        return False
    update: dict = {}
    if title is not None:
        update["title"] = title
    if start_date is not None:
        update["start_date"] = start_date
    if end_date is not None:
        update["end_date"] = end_date
    if destination_city_id is not None:
        update["destination_city_id"] = destination_city_id
    if update:
        db.table("travels").update(update).eq("id", trip_id).eq("user_id", user_id).execute()
    return True


def merge_trips(user_id: str, trip_ids: list[str], keep_id: str) -> bool:
    if keep_id not in trip_ids or len(trip_ids) < 2:
        return False
    db = get_client()
    res = db.table("travels").select("id, start_date, end_date").eq("user_id", user_id).in_("id", trip_ids).execute()
    if len(res.data) != len(trip_ids):
        return False
    starts = [r["start_date"] for r in res.data if r.get("start_date")]
    ends   = [r["end_date"]   for r in res.data if r.get("end_date")]
    min_start = min(starts) if starts else None
    max_end   = max(ends)   if ends   else None
    other_ids = [t for t in trip_ids if t != keep_id]
    db.table("emails").update({"travel_id": keep_id}).eq("user_id", user_id).in_("travel_id", other_ids).execute()
    db.table("travels").delete().eq("user_id", user_id).in_("id", other_ids).execute()
    update: dict = {}
    if min_start:
        update["start_date"] = min_start
    if max_end:
        update["end_date"] = max_end
    if update:
        db.table("travels").update(update).eq("id", keep_id).eq("user_id", user_id).execute()
    return True


def _upsert_user_preferences(db, user_id: str, profile: dict) -> int:
    intensity_map:  dict[str, str] = profile.get("preference_intensity", {})
    keyword_counts: dict[str, int] = profile.get("keyword_counts", {})
    if not intensity_map:
        return 0

    # One SELECT for all needed categories scoped to this user.
    category_names = list(intensity_map.keys())
    cat_res = (
        db.table("activity_categories")
        .select("id, name")
        .eq("user_id", user_id)
        .in_("name", category_names)
        .execute()
    )
    cat_id_map: dict[str, str] = {row["name"]: row["id"] for row in (cat_res.data or [])}

    for name in category_names:
        if name not in cat_id_map:
            log.warning(f"── DB  unknown activity category  name={name}")

    known_cat_ids = list(cat_id_map.values())
    if not known_cat_ids:
        return 0

    # One SELECT for all keywords across all known categories scoped to this user.
    kw_res = (
        db.table("activity_keywords")
        .select("id, keyword, category_id")
        .eq("user_id", user_id)
        .in_("category_id", known_cat_ids)
        .execute()
    )

    # Reverse map: category_id → category_name, so we can look up intensity per keyword.
    cat_name_map: dict[str, str] = {v: k for k, v in cat_id_map.items()}

    now = _now()
    rows = []
    for kw_row in (kw_res.data or []):
        kw_count = keyword_counts.get(kw_row["keyword"], 0)
        if kw_count == 0:
            continue
        cat_name = cat_name_map.get(kw_row["category_id"])
        intensity = intensity_map.get(cat_name, "weak") if cat_name else "weak"
        rows.append({
            "user_id":             user_id,
            "activity_keyword_id": kw_row["id"],
            "intensity":           intensity,
            "count":               kw_count,
            "source":              "inferred",
            "updated_at":          now,
        })

    if rows:
        db.table("user_preferences").upsert(
            rows,
            on_conflict="user_id,activity_keyword_id",
            returning="minimal",
        ).execute()

    return len(rows)

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


def persist(user_email: str, bookings: list[dict], profile: dict) -> None:
    db = get_client()

    user_id = _upsert_user(db, user_email, bookings)
    log.info(f"── DB  user upserted  id={user_id}")

    destination_travel: dict[str, str] = {}
    unique_destinations = {b["destination"] for b in bookings if b["destination"]}
    for dest in unique_destinations:
        # Prefer LLM-extracted country; fall back to hardcoded city hints.
        sample = next((b for b in bookings if b["destination"] == dest), {})
        if sample.get("country") and sample.get("country_code"):
            country = {"name": sample["country"], "code": sample["country_code"].upper()[:2]}
        else:
            country = _infer_country_from_city(dest)
        country_id = _get_or_create_country(db, country)
        city_id   = _get_or_create_city(db, dest, country_id)
        travel_id = _get_or_create_travel(db, user_id, city_id, dest, bookings)
        destination_travel[dest] = travel_id

    log.info(f"── DB  travels upserted  count={len(destination_travel)}")

    inserted = _insert_emails(db, user_id, bookings, destination_travel)
    log.info(f"── DB  emails inserted  count={inserted}")

    pref_count = _upsert_user_preferences(db, user_id, profile)
    log.info(f"── DB  user_preferences upserted  count={pref_count}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


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
    return res.data[0]["id"]


def _get_or_create_country(db, country: dict[str, str]) -> str:
    res = db.table("countries").select("id").eq("code", country["code"]).execute()
    if res.data:
        return res.data[0]["id"]
    ins = db.table("countries").insert(country).execute()
    return ins.data[0]["id"]


def _infer_country_from_city(city_name: str | None) -> dict[str, str]:
    if not city_name:
        return _UNKNOWN_COUNTRY
    key = city_name.strip().lower()
    if key in _CITY_COUNTRY_HINTS:
        name, code = _CITY_COUNTRY_HINTS[key]
        return {"name": name, "code": code}
    return _UNKNOWN_COUNTRY


def _get_or_create_city(db, name: str, country_id: str) -> str:
    res = (
        db.table("cities")
        .select("id")
        .eq("name", name)
        .eq("country_id", country_id)
        .execute()
    )
    if res.data:
        return res.data[0]["id"]
    ins = db.table("cities").insert({"name": name, "country_id": country_id}).execute()
    return ins.data[0]["id"]


def _get_or_create_travel(
    db, user_id: str, city_id: str, dest: str, bookings: list[dict]
) -> str:
    dest_bookings = [b for b in bookings if b["destination"] == dest]

    # Prefer LLM-extracted travel dates; fall back to email date for start only.
    # Never derive end_date from email timestamps — it produces false trip durations.
    llm_starts = sorted(b["start_date"] for b in dest_bookings if b.get("start_date"))
    llm_ends   = sorted(b["end_date"]   for b in dest_bookings if b.get("end_date"))
    email_dates = sorted(b["date"] for b in dest_bookings if b.get("date"))

    start_date = llm_starts[0] if llm_starts else (email_dates[0] if email_dates else None)
    end_date   = llm_ends[-1]  if llm_ends   else None

    res = (
        db.table("travels")
        .select("id")
        .eq("user_id", user_id)
        .eq("destination_city_id", city_id)
        .execute()
    )
    if res.data:
        travel_id = res.data[0]["id"]
        update: dict = {}
        if start_date:
            update["start_date"] = start_date
        if end_date:
            update["end_date"] = end_date
        if update:
            db.table("travels").update(update).eq("id", travel_id).execute()
        return travel_id

    payload: dict = {
        "user_id":             user_id,
        "destination_city_id": city_id,
        "title":               dest,
    }
    if start_date:
        payload["start_date"] = start_date
    if end_date:
        payload["end_date"] = end_date

    ins = db.table("travels").insert(payload).execute()
    return ins.data[0]["id"]


def _insert_emails(
    db, user_id: str, bookings: list[dict], destination_travel: dict[str, str]
) -> int:
    inserted = 0
    for b in bookings:
        travel_id = destination_travel.get(b["destination"]) if b["destination"] else None
        payload: dict = {
            "user_id":        user_id,
            "gmail_msg_id":   b["id"],
            "subject":        b["subject"],
            "llm_extraction": b.get("llm_extraction"),
        }
        if b["domain"]:
            payload["sender_domain"] = b["domain"]
        if b["date"]:
            payload["email_date"] = b["date"]
        if travel_id:
            payload["travel_id"] = travel_id

        res = db.table("emails").upsert(payload, on_conflict="gmail_msg_id").execute()
        if res.data:
            inserted += 1

    return inserted


def _upsert_user_preferences(db, user_id: str, profile: dict) -> int:
    intensity_map:  dict[str, str] = profile.get("preference_intensity", {})
    keyword_counts: dict[str, int] = profile.get("keyword_counts", {})
    if not intensity_map:
        return 0

    saved = 0
    for category, intensity in intensity_map.items():
        cat_res = (
            db.table("activity_categories").select("id").eq("name", category).execute()
        )
        if not cat_res.data:
            log.warning(f"── DB  unknown activity category  name={category}")
            continue
        category_id = cat_res.data[0]["id"]

        keyword_res = (
            db.table("activity_keywords")
            .select("id, keyword")
            .eq("category_id", category_id)
            .execute()
        )
        for kw_row in keyword_res.data:
            kw_count = keyword_counts.get(kw_row["keyword"], 0)
            if kw_count == 0:
                continue
            db.table("user_preferences").upsert(
                {
                    "user_id":             user_id,
                    "activity_keyword_id": kw_row["id"],
                    "intensity":           intensity,
                    "count":               kw_count,
                    "source":              "inferred",
                    "updated_at":          _now(),
                },
                on_conflict="user_id,activity_keyword_id",
            ).execute()
            saved += 1

    return saved

from __future__ import annotations

from datetime import datetime, timezone

from observability.logger import get
from db.client import get as get_client

log = get("db.writer")

_UNKNOWN_COUNTRY = {"name": "Unknown", "code": "XX"}


def persist(user_email: str, bookings: list[dict], profile: dict) -> None:
    db = get_client()

    user_id = _upsert_user(db, user_email, bookings)
    log.info(f"── DB  user upserted  id={user_id}")

    country_id = _get_or_create_country(db)

    destination_travel: dict[str, str] = {}
    unique_destinations = {b["destination"] for b in bookings if b["destination"]}
    for dest in unique_destinations:
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


def _get_or_create_country(db) -> str:
    res = db.table("countries").select("id").eq("code", _UNKNOWN_COUNTRY["code"]).execute()
    if res.data:
        return res.data[0]["id"]
    ins = db.table("countries").insert(_UNKNOWN_COUNTRY).execute()
    return ins.data[0]["id"]


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
    dest_dates = sorted(b["date"] for b in bookings if b["destination"] == dest and b["date"])
    start_date = dest_dates[0] if dest_dates else None
    end_date   = dest_dates[-1] if dest_dates else None

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
            "user_id":      user_id,
            "gmail_msg_id": b["id"],
            "subject":      b["subject"],
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
    intensity_map: dict[str, str] = profile.get("preference_intensity", {})
    if not intensity_map:
        return 0

    count = 0
    for category, intensity in intensity_map.items():
        cat_res = (
            db.table("activity_categories").select("id").eq("name", category).execute()
        )
        if not cat_res.data:
            log.warning(f"── DB  unknown activity category  name={category}")
            continue
        category_id = cat_res.data[0]["id"]

        pref_res = (
            db.table("preferences").select("id").eq("category_id", category_id).execute()
        )
        for pref in pref_res.data:
            db.table("user_preferences").upsert(
                {
                    "user_id":       user_id,
                    "preference_id": pref["id"],
                    "intensity":     intensity,
                    "source":        "inferred",
                    "updated_at":    _now(),
                },
                on_conflict="user_id,preference_id",
            ).execute()
            count += 1

    return count

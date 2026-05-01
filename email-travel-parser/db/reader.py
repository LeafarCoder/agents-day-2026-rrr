from __future__ import annotations

from db.client import get as get_client


def get_profile(user_email: str) -> dict | None:
    db = get_client()

    user_res = db.table("users").select("*").eq("email", user_email).execute()
    if not user_res.data:
        return None
    user = user_res.data[0]
    user_id = user["id"]

    prefs_res = (
        db.table("user_preferences")
        .select("intensity, activity_keywords(keyword, activity_categories(name))")
        .eq("user_id", user_id)
        .execute()
    )

    preferences: dict[str, dict] = {}
    for row in prefs_res.data:
        kw = row.get("activity_keywords")
        if not kw or not kw.get("activity_categories"):
            continue
        cat_name  = kw["activity_categories"]["name"]
        intensity = row["intensity"]
        preferences.setdefault(cat_name, {"intensity": intensity, "keywords": []})
        preferences[cat_name]["keywords"].append(kw["keyword"])

    travels_res = (
        db.table("travels")
        .select("title, start_date, end_date, cities(name)")
        .eq("user_id", user_id)
        .order("start_date", desc=True)
        .execute()
    )

    emails_res = (
        db.table("emails")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )

    return {
        "user":        user,
        "preferences": preferences,
        "travels":     travels_res.data,
        "email_count": emails_res.count or 0,
    }


def get_scan_results(user_email: str) -> dict | None:
    profile = get_profile(user_email)
    if not profile:
        return None

    db      = get_client()
    user_id = profile["user"]["id"]

    emails_res = (
        db.table("emails")
        .select("subject, sender_domain, email_date, travels(title)")
        .eq("user_id", user_id)
        .order("email_date", desc=True)
        .execute()
    )

    from collections import Counter, defaultdict

    bookings = [
        {
            "date":        r["email_date"],
            "domain":      r["sender_domain"] or "None",
            "destination": r["travels"]["title"] if r.get("travels") else None,
            "subject":     r["subject"],
        }
        for r in emails_res.data
    ]

    trips_by_year: dict = defaultdict(int)
    platforms: Counter  = Counter()
    for b in bookings:
        if b["date"]:
            trips_by_year[b["date"][:4]] += 1
        platforms[b["domain"]] += 1

    return {
        **profile,
        "bookings":      bookings,
        "trips_by_year": dict(sorted(trips_by_year.items())),
        "platforms_used": dict(platforms.most_common()),
    }

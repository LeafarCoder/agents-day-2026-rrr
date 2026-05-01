from __future__ import annotations

from datetime import datetime, timedelta

from db.client import get as get_client


def _trip_label(start_dt: datetime, end_dt: datetime) -> str | None:
    nights = (end_dt - start_dt).days
    if nights <= 0:
        return None
    has_weekend = any(
        (start_dt + timedelta(days=i)).weekday() >= 5
        for i in range(nights + 1)
    )
    if nights <= 2 and has_weekend:
        return "weekend"
    if nights == 3 and has_weekend:
        return "long weekend"
    if nights <= 6:
        return "short trip"
    if nights <= 9:
        return "week trip"
    if nights <= 16:
        return "2 weeks"
    if nights <= 23:
        return "3 weeks"
    months = max(1, round(nights / 30))
    return f"{months} month" if months == 1 else f"{months} months"


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
        .select("title, start_date, end_date, cities(name, countries(name, code))")
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

    countries_map: dict[str, dict] = {}
    for travel in travels_res.data:
        city_data = travel.get("cities")
        if not city_data:
            continue
        country_data = city_data.get("countries")
        if not country_data:
            continue
        country_name = country_data["name"]
        country_code = country_data["code"]
        city_name    = city_data["name"]
        month_year: str | None = None
        if travel.get("start_date"):
            try:
                start_dt = datetime.strptime(travel["start_date"], "%Y-%m-%d")
                month_year = start_dt.strftime("%b %Y")
                end_str = travel.get("end_date")
                if end_str:
                    end_dt = datetime.strptime(end_str, "%Y-%m-%d")
                    label = _trip_label(start_dt, end_dt)
                    if label:
                        month_year = f"{label} · {month_year}"
            except ValueError:
                pass
        if country_name not in countries_map:
            countries_map[country_name] = {"name": country_name, "code": country_code, "cities": {}}
        cities = countries_map[country_name]["cities"]
        if city_name not in cities:
            cities[city_name] = {"name": city_name, "visits": []}
        if month_year and month_year not in cities[city_name]["visits"]:
            cities[city_name]["visits"].append(month_year)

    countries_visited = [
        {"name": c["name"], "code": c["code"], "cities": list(c["cities"].values())}
        for c in countries_map.values()
    ]

    return {
        "user":              user,
        "preferences":       preferences,
        "travels":           travels_res.data,
        "countries_visited": countries_visited,
        "email_count":       emails_res.count or 0,
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

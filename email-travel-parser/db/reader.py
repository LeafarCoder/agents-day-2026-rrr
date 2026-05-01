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


def get_email_extraction(gmail_msg_id: str) -> dict | None:
    """Return cached LLM extraction for an email, or None if not yet extracted."""
    try:
        db = get_client()
        res = (
            db.table("emails")
            .select("llm_extraction")
            .eq("gmail_msg_id", gmail_msg_id)
            .not_.is_("llm_extraction", "null")
            .execute()
        )
        return res.data[0]["llm_extraction"] if res.data else None
    except Exception as exc:
        from observability.logger import get as _get
        _get("db.reader").exception(f"get_email_extraction failed  gmail_msg_id={gmail_msg_id}  err={exc}")
        return None


def get_profile(user_email: str) -> dict | None:
    db = get_client()

    user_res = db.table("users").select("*").eq("email", user_email).execute()
    if not user_res.data:
        return None
    user = user_res.data[0]
    user_id = user["id"]

    prefs_res = (
        db.table("user_preferences")
        .select("count, activity_keywords(keyword, activity_categories(name))")
        .eq("user_id", user_id)
        .execute()
    )

    preferences: dict[str, dict] = {}
    for row in prefs_res.data:
        kw = row.get("activity_keywords")
        if not kw or not kw.get("activity_categories"):
            continue
        kw_count = row.get("count") or 0
        if kw_count == 0:
            continue
        cat_name = kw["activity_categories"]["name"]
        keyword  = kw["keyword"]
        if cat_name not in preferences:
            preferences[cat_name] = {"total": 0, "keywords": []}
        preferences[cat_name]["total"] += kw_count
        preferences[cat_name]["keywords"].append({"keyword": keyword, "count": kw_count})

    for cat_data in preferences.values():
        cat_data["keywords"].sort(key=lambda x: -x["count"])

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


def get_country_experiences(user_email: str, country_code: str) -> dict | None:
    from gmail.parser import detect_activities

    db = get_client()

    user_res = db.table("users").select("id").eq("email", user_email).execute()
    if not user_res.data:
        return None
    user_id = user_res.data[0]["id"]

    travels_res = (
        db.table("travels")
        .select("id, title, start_date, end_date, cities(name, countries(name, code))")
        .eq("user_id", user_id)
        .order("start_date", desc=True)
        .execute()
    )

    country_name: str | None = None
    trips = []

    for travel in travels_res.data:
        city_data    = travel.get("cities")
        country_data = city_data.get("countries") if city_data else None
        if not country_data or country_data["code"].upper() != country_code.upper():
            continue
        country_name = country_data["name"]

        emails_res = (
            db.table("emails")
            .select("subject, sender_domain, email_date")
            .eq("travel_id", travel["id"])
            .order("email_date", desc=True)
            .execute()
        )

        experiences: dict[str, list[str]] = {}
        for email in emails_res.data:
            for cat in detect_activities(email.get("subject", "")):
                bucket = experiences.setdefault(cat, [])
                if len(bucket) < 3:
                    bucket.append(email["subject"])

        label: str | None = None
        if travel.get("start_date"):
            try:
                start_dt   = datetime.strptime(travel["start_date"], "%Y-%m-%d")
                month_year = start_dt.strftime("%b %Y")
                end_str    = travel.get("end_date")
                if end_str:
                    end_dt    = datetime.strptime(end_str, "%Y-%m-%d")
                    trip_lbl  = _trip_label(start_dt, end_dt)
                    label     = f"{trip_lbl} · {month_year}" if trip_lbl else month_year
                else:
                    label = month_year
            except ValueError:
                pass

        trips.append({
            "id":          travel["id"],
            "city":        city_data["name"],
            "start_date":  travel.get("start_date"),
            "end_date":    travel.get("end_date"),
            "label":       label,
            "email_count": len(emails_res.data),
            "experiences": [
                {"category": cat, "examples": exs}
                for cat, exs in experiences.items()
            ],
        })

    if not country_name:
        return None

    return {"country": {"name": country_name, "code": country_code}, "trips": trips}


def get_scan_results(user_email: str) -> dict | None:
    profile = get_profile(user_email)
    if not profile:
        return None

    db      = get_client()
    user_id = profile["user"]["id"]

    emails_res = (
        db.table("emails")
        .select("gmail_msg_id, subject, sender_domain, email_date, llm_extraction, travels(title, start_date, end_date, cities(name, countries(name, code)))")
        .eq("user_id", user_id)
        .order("email_date", desc=True)
        .execute()
    )

    from collections import Counter, defaultdict
    from gmail.parser import detect_activity_keywords

    bookings = []
    for r in emails_res.data:
        travel = r.get("travels")
        llm    = r.get("llm_extraction") or {}
        city = country = country_code = travel_start = travel_end = trip_lbl = None

        if travel:
            city_data = travel.get("cities")
            if city_data:
                city = city_data.get("name")
                c    = city_data.get("countries") or {}
                country      = c.get("name")
                country_code = c.get("code")
            travel_start = travel.get("start_date")
            travel_end   = travel.get("end_date")
            if travel_start and travel_end:
                try:
                    trip_lbl = _trip_label(
                        datetime.strptime(travel_start, "%Y-%m-%d"),
                        datetime.strptime(travel_end,   "%Y-%m-%d"),
                    )
                except ValueError:
                    pass

        subject = r.get("subject") or ""
        keyword_hits = detect_activity_keywords(subject)

        bookings.append({
            "id":               r.get("gmail_msg_id"),
            "date":             r["email_date"],
            "domain":           r["sender_domain"] or "unknown",
            "destination":      travel["title"] if travel else None,
            "subject":          subject,
            "city":             city,
            "country":          country,
            "country_code":     country_code,
            "start_date":       travel_start or llm.get("start_date"),
            "end_date":         travel_end   or llm.get("end_date"),
            "trip_label":       trip_lbl,
            "booking_type":     llm.get("booking_type"),
            "is_travel_booking": llm.get("is_travel_booking"),
            "keyword_hits":     keyword_hits,
        })

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

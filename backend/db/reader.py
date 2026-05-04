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


def get_user_keywords(user_email: str) -> dict[str, list[str]]:
    """Return the user's personal activity vocabulary as {category: [keyword, ...]}."""
    from detection.config import _DEFAULT_ACTIVITY_SIGNALS
    try:
        db = get_client()
        user_res = db.table("users").select("id").eq("email", user_email).execute()
        if not user_res.data:
            return dict(_DEFAULT_ACTIVITY_SIGNALS)
        user_id = user_res.data[0]["id"]

        cats_res = (
            db.table("activity_categories")
            .select("id, name")
            .eq("user_id", user_id)
            .execute()
        )
        if not cats_res.data:
            return dict(_DEFAULT_ACTIVITY_SIGNALS)

        cat_name: dict[str, str] = {r["id"]: r["name"] for r in cats_res.data}
        cat_ids = list(cat_name.keys())

        kw_res = (
            db.table("activity_keywords")
            .select("keyword, category_id")
            .eq("user_id", user_id)
            .in_("category_id", cat_ids)
            .execute()
        )

        result: dict[str, list[str]] = {name: [] for name in cat_name.values()}
        for r in (kw_res.data or []):
            name = cat_name.get(r["category_id"])
            if name:
                result[name].append(r["keyword"])
        return result
    except Exception as exc:
        from observability.logger import get as _get
        _get("db.reader").exception(f"get_user_keywords failed  user={user_email}  err={exc}")
        from detection.config import _DEFAULT_ACTIVITY_SIGNALS
        return dict(_DEFAULT_ACTIVITY_SIGNALS)


def get_openrouter_key(user_email: str) -> str | None:
    """Return the decrypted OpenRouter API key for a user, or None if not set."""
    try:
        db = get_client()
        res = (
            db.table("users")
            .select("openrouter_api_key_encrypted")
            .eq("email", user_email)
            .execute()
        )
        if not res.data or not res.data[0].get("openrouter_api_key_encrypted"):
            return None
        from crypto.secrets import decrypt_stored_key
        raw = res.data[0]["openrouter_api_key_encrypted"]
        return decrypt_stored_key(raw)
    except Exception as exc:
        from observability.logger import get as _get
        _get("db.reader").exception(f"get_openrouter_key failed  user={user_email}  err={exc}")
        return None


def has_openrouter_key(user_email: str) -> bool:
    try:
        db = get_client()
        res = (
            db.table("users")
            .select("openrouter_api_key_encrypted")
            .eq("email", user_email)
            .execute()
        )
        return bool(res.data and res.data[0].get("openrouter_api_key_encrypted"))
    except Exception:
        return False


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


def get_email_extractions(gmail_msg_ids: list[str]) -> dict[str, dict]:
    """Bulk lookup of cached email rows. Returns {gmail_msg_id: {llm_extraction, subject, email_date, sender_domain, is_excluded}}.

    Rows with metadata (subject + sender_domain) let the scan skip Gmail API calls entirely.
    Rows with only llm_extraction still avoid the LLM call but still hit Gmail for metadata.
    """
    if not gmail_msg_ids:
        return {}
    try:
        db = get_client()
        res = (
            db.table("emails")
            .select("gmail_msg_id, llm_extraction, subject, email_date, sender_domain, is_excluded")
            .in_("gmail_msg_id", gmail_msg_ids)
            .not_.is_("llm_extraction", "null")
            .execute()
        )
        return {
            row["gmail_msg_id"]: {
                "llm_extraction": row["llm_extraction"],
                "subject":        row.get("subject"),
                "email_date":     row.get("email_date"),
                "sender_domain":  row.get("sender_domain"),
                "is_excluded":    row.get("is_excluded", False),
            }
            for row in (res.data or [])
        }
    except Exception as exc:
        from observability.logger import get as _get
        _get("db.reader").exception(f"get_email_extractions failed  count={len(gmail_msg_ids)}  err={exc}")
        return {}


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


def get_trips(user_email: str) -> list[dict]:
    db = get_client()
    user_res = db.table("users").select("id").eq("email", user_email).execute()
    if not user_res.data:
        return []
    user_id = user_res.data[0]["id"]

    travels_res = (
        db.table("travels")
        .select("id, title, start_date, end_date, destination_city_id, cities(id, name, countries(name, code))")
        .eq("user_id", user_id)
        .order("start_date", desc=True)
        .execute()
    )
    if not travels_res.data:
        return []

    travel_ids = [t["id"] for t in travels_res.data]
    emails_res = (
        db.table("emails")
        .select("travel_id")
        .eq("user_id", user_id)
        .in_("travel_id", travel_ids)
        .execute()
    )
    count_map: dict[int, int] = {}
    for r in emails_res.data or []:
        tid = r.get("travel_id")
        if tid:
            count_map[tid] = count_map.get(tid, 0) + 1

    trips = []
    for t in travels_res.data:
        city_data    = t.get("cities") or {}
        country_data = city_data.get("countries") or {}
        trips.append({
            "id":           t["id"],
            "title":        t.get("title"),
            "start_date":   t.get("start_date"),
            "end_date":     t.get("end_date"),
            "city_id":      city_data.get("id") or t.get("destination_city_id"),
            "city_name":    city_data.get("name"),
            "country_name": country_data.get("name"),
            "country_code": country_data.get("code"),
            "email_count":  count_map.get(t["id"], 0),
        })
    return trips


def get_trip_emails(user_email: str, trip_id: int) -> list[dict] | None:
    db = get_client()
    user_res = db.table("users").select("id").eq("email", user_email).execute()
    if not user_res.data:
        return None
    user_id = user_res.data[0]["id"]
    trip_check = db.table("travels").select("id").eq("id", trip_id).eq("user_id", user_id).execute()
    if not trip_check.data:
        return None
    emails_res = (
        db.table("emails")
        .select("id, gmail_msg_id, subject, sender_domain, email_date, llm_extraction")
        .eq("travel_id", trip_id)
        .eq("user_id", user_id)
        .order("email_date", desc=False)
        .execute()
    )
    return emails_res.data or []


def get_merge_candidates(user_email: str) -> list[dict]:
    from datetime import date as date_type

    trips = get_trips(user_email)
    if len(trips) < 2:
        return []

    def parse(s: str | None) -> date_type | None:
        if not s:
            return None
        try:
            from datetime import datetime
            return datetime.strptime(s, "%Y-%m-%d").date()
        except ValueError:
            return None

    candidates = []
    for i in range(len(trips)):
        for j in range(i + 1, len(trips)):
            a, b = trips[i], trips[j]
            a_s = parse(a["start_date"]) or parse(a["end_date"])
            a_e = parse(a["end_date"])   or parse(a["start_date"])
            b_s = parse(b["start_date"]) or parse(b["end_date"])
            b_e = parse(b["end_date"])   or parse(b["start_date"])
            if not (a_s and b_s):
                continue

            same_city    = a["city_id"] == b["city_id"] and a["city_id"] is not None
            same_country = a["country_code"] == b["country_code"] and a["country_code"] is not None
            overlaps     = a_s <= b_e and b_s <= a_e
            if overlaps:
                gap_days = 0
            elif a_e < b_s:
                gap_days = (b_s - a_e).days
            else:
                gap_days = (a_s - b_e).days

            within_3 = gap_days <= 3
            if not (overlaps or within_3 or (same_city and gap_days <= 30)):
                continue

            score = 0
            reasons: list[str] = []
            if same_city:
                score += 3
                reasons.append("same city")
            elif same_country:
                score += 1
                reasons.append("same country")
            if overlaps:
                score += 2
                reasons.append("dates overlap")
            elif within_3:
                score += 1
                reasons.append(f"{gap_days} day{'s' if gap_days != 1 else ''} apart")
            else:
                score -= gap_days // 10

            if score <= 0:
                continue

            candidates.append({
                "trip_a": a,
                "trip_b": b,
                "score":  score,
                "reason": ", ".join(reasons).capitalize() if reasons else "Nearby dates",
            })

    candidates.sort(key=lambda x: -x["score"])
    return candidates[:20]


def get_country_experiences(user_email: str, country_code: str) -> dict | None:
    from gmail.parser import detect_activity_keywords

    db = get_client()

    user_res = db.table("users").select("id").eq("email", user_email).execute()
    if not user_res.data:
        return None
    user_id = user_res.data[0]["id"]
    user_keywords = get_user_keywords(user_email)

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
            .select("subject, llm_extraction")
            .eq("travel_id", travel["id"])
            .execute()
        )

        # Aggregate keywords per category, tracking which email subjects contributed each.
        # Prefer the LLM-extracted keyword_hits; fall back to regex detection on subject.
        kw_sources: dict[str, dict[str, list[str]]] = {}  # cat → kw → [subject…]
        for email in emails_res.data:
            subject = (email.get("subject") or "").strip()
            llm = email.get("llm_extraction") or {}
            hits: dict[str, list[str]] = llm.get("keyword_hits") or {}
            if not hits:
                hits = detect_activity_keywords(subject, user_keywords)
            for cat, kws in hits.items():
                cat_bucket = kw_sources.setdefault(cat, {})
                for kw in kws:
                    kw_bucket = cat_bucket.setdefault(kw, [])
                    if subject and subject not in kw_bucket and len(kw_bucket) < 3:
                        kw_bucket.append(subject)

        experiences: list[dict] = [
            {
                "category": cat,
                "keywords": [
                    {"keyword": kw, "subjects": subjects}
                    for kw, subjects in sorted(kw_map.items())
                ],
            }
            for cat, kw_map in kw_sources.items()
            if kw_map
        ]

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
            "experiences": experiences,
        })

    if not country_name:
        return None

    return {"country": {"name": country_name, "code": country_code}, "trips": trips}


def get_scan_results(
    user_email: str,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict | None:
    profile = get_profile(user_email)
    if not profile:
        return None

    db      = get_client()
    user_id = profile["user"]["id"]

    query = (
        db.table("emails")
        .select("gmail_msg_id, subject, sender_domain, email_date, llm_extraction, travels(title, start_date, end_date, cities(name, countries(name, code)))")
        .eq("user_id", user_id)
        .eq("is_excluded", False)
        .order("email_date", desc=True)
    )
    if from_date:
        query = query.gte("email_date", from_date)
    if to_date:
        query = query.lte("email_date", to_date)
    emails_res = query.execute()

    from collections import Counter, defaultdict
    from gmail.parser import detect_activity_keywords

    user_keywords = get_user_keywords(user_email)
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
        keyword_hits = detect_activity_keywords(subject, user_keywords)

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
        if b["domain"] and b["domain"] != "unknown":
            platforms[b["domain"]] += 1

    destinations = sorted({b["destination"] for b in bookings if b["destination"]})

    # When filtering by date, compute preferences from the filtered emails' keyword hits
    # rather than using the cumulative user_preferences table.
    if from_date or to_date:
        pref_counts: dict[str, int] = {}
        for b in bookings:
            for cat in (b["keyword_hits"] or {}):
                pref_counts[cat] = pref_counts.get(cat, 0) + len(b["keyword_hits"][cat])
        preferences_summary = pref_counts
        email_count = len(bookings)
    else:
        raw_prefs: dict = profile.get("preferences") or {}
        preferences_summary = {cat: data["total"] for cat, data in raw_prefs.items()}
        email_count = profile.get("email_count") or len(bookings)

    return {
        "profile": {
            "last_scanned": profile["user"].get("last_scanned_at"),
            "email_count":  email_count,
            "destinations": destinations,
            "preferences":  preferences_summary,
            "platforms":    dict(platforms.most_common()),
            "from_date":    from_date,
            "to_date":      to_date,
        },
        "bookings":      bookings,
        "trips_by_year": dict(sorted(trips_by_year.items())),
    }

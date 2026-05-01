from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime


def build(bookings: list[dict]) -> dict:
    destinations: Counter = Counter()
    activity_counts: Counter = Counter()
    keyword_counts: Counter = Counter()
    domains: Counter = Counter()
    trips_by_year: defaultdict = defaultdict(int)

    for b in bookings:
        if b["destination"]:
            destinations[b["destination"]] += 1
        for act in b["activities"]:
            activity_counts[act] += 1
        for kws in b.get("keyword_hits", {}).values():
            for kw in kws:
                keyword_counts[kw] += 1
        domains[b["domain"]] += 1
        if b["date"]:
            trips_by_year[b["date"][:4]] += 1

    ranked = sorted(activity_counts.items(), key=lambda x: -x[1])
    intensity = {
        cat: "strong" if n >= 5 else "moderate" if n >= 2 else "weak"
        for cat, n in activity_counts.items()
    }

    return {
        "total_bookings": len(bookings),
        "destinations_visited": dict(destinations.most_common(20)),
        "activity_preferences": dict(ranked),
        "preference_intensity": intensity,
        "keyword_counts": dict(keyword_counts),
        "top_categories": [cat for cat, _ in ranked[:5]],
        "platforms_used": dict(domains.most_common()),
        "trips_by_year": dict(sorted(trips_by_year.items())),
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }

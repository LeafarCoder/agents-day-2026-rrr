from __future__ import annotations

import json
import os
import re

LOOKBACK_DAYS = int(os.environ.get("LOOKBACK_DAYS", "730"))

TRAVEL_DOMAINS = {
    "airbnb.com", "booking.com", "expedia.com", "hotels.com", "vrbo.com",
    "hostelworld.com", "agoda.com", "viator.com", "getyourguide.com",
    "klook.com", "withlocals.com", "ryanair.com", "easyjet.com",
    "skyscanner.com", "kayak.com", "kiwi.com", "norwegian.com",
    "vueling.com", "transavia.com", "wizzair.com", "flixbus.com",
    "eurostar.com", "renfe.com", "sncf.fr", "trenitalia.com", "ouigo.com",
    "bahn.de", "tripadvisor.com", "lastminute.com", "opodo.com",
    "edreams.com", "tui.com", "marriott.com", "hilton.com", "accorhotels.com",
}

_DEFAULT_ACTIVITY_SIGNALS: dict[str, list[str]] = {
    "food_dining": [
        "food tour", "cooking class", "restaurant", "dinner",
        "tasting", "wine tour", "culinary", "food experience",
    ],
    "culture_history": [
        "museum", "historical", "walking tour", "heritage",
        "architecture", "art tour", "cultural", "old town",
    ],
    "adventure_outdoor": [
        "hiking", "trekking", "kayak", "surf", "scuba",
        "climbing", "safari", "zip line", "rafting", "cycling tour",
    ],
    "nightlife": ["nightlife tour", "bar crawl", "pub crawl", "rooftop bar", "cocktail"],
    "wellness":  ["spa", "yoga retreat", "meditation", "wellness", "massage"],
    "sightseeing": [
        "city tour", "sightseeing", "bus tour", "boat tour",
        "sunset cruise", "day trip", "excursion",
    ],
    "accommodation": [
        "accommodation airbnb", "airbnb", "vacation rental", "apartment rental",
        "accommodation hotel", "hotel", "hostel", "resort", "bed and breakfast",
    ],
    "transportation": [
        "flight", "e-ticket", "boarding", "itinerary",
        "budget flight", "business class", "first class", "economy class",
        "train", "rail", "eurostar", "bus", "coach",
        "ferry", "cruise", "car rental", "taxi", "transfer", "shuttle", "tuk-tuk",
    ],
    "cuisine": [
        "italian", "japanese", "mexican", "indian", "chinese", "thai",
        "french", "spanish", "portuguese", "greek", "moroccan",
        "vietnamese", "korean", "american", "mediterranean",
    ],
}

_CUSTOM_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "custom_categories.json")


def _load_custom() -> dict[str, list[str]]:
    if os.path.exists(_CUSTOM_FILE):
        with open(_CUSTOM_FILE) as f:
            return json.load(f)
    return {}


def _save_custom(data: dict[str, list[str]]) -> None:
    os.makedirs(os.path.dirname(_CUSTOM_FILE), exist_ok=True)
    with open(_CUSTOM_FILE, "w") as f:
        json.dump(data, f, indent=2)


def get_activity_signals() -> dict[str, list[str]]:
    merged = {k: list(v) for k, v in _DEFAULT_ACTIVITY_SIGNALS.items()}
    for cat, keywords in _load_custom().items():
        if cat in merged:
            merged[cat] = list(dict.fromkeys(merged[cat] + keywords))
        else:
            merged[cat] = keywords
    return merged


def add_category(name: str) -> None:
    custom = _load_custom()
    if name not in custom and name not in _DEFAULT_ACTIVITY_SIGNALS:
        custom[name] = []
        _save_custom(custom)


def add_keyword(category: str, keyword: str) -> None:
    custom = _load_custom()
    existing = get_activity_signals()
    if category not in existing:
        raise ValueError(f"Category '{category}' does not exist.")
    bucket = custom.setdefault(category, [])
    if keyword not in bucket and keyword not in _DEFAULT_ACTIVITY_SIGNALS.get(category, []):
        bucket.append(keyword)
        _save_custom(custom)


# ---------------------------------------------------------------------------
# Confirmation subject regex — rebuilt when the module loads
# ---------------------------------------------------------------------------

KEYWORD_ALIASES: dict[str, str] = {
    "rail":     "train",
    "eurostar": "train",
}

SUBJECT_KEYWORDS = [
    "flight", "hotel", "booking", "reservation", "itinerary",
    "confirmation", "eticket", "check-in", "receipt", "trip", "holiday", "airbnb",
    "confirmacao", "reserva", "recibo", "voo",
    "ricevuta", "prenotazione", "confirmacion", "vuelo",
]

CONFIRMATION_REGEX = re.compile(
    r"booking.{0,20}confirm|reservation.{0,20}confirm|your.{0,10}trip.{0,20}to"
    r"|your.{0,10}stay.{0,20}in|your.{0,10}flight.{0,20}to|your.{0,10}booking"
    r"|itinerary|order.{0,10}confirm|check.?in.{0,10}detail"
    r"|reservation.{0,10}detail|e.?ticket|travel.{0,10}confirm|flight|hotel"
    r"|receipt|trip|holiday|airbnb"
    r"|confirma[cç][aã]o|reserva|recibo|voo"
    r"|ricevuta|prenotazione|confirmaci[oó]n|vuelo",
    re.IGNORECASE,
)

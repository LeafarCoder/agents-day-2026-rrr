from __future__ import annotations

import os
import re
from pathlib import Path

LOOKBACK_DAYS = int(os.environ.get("LOOKBACK_DAYS", "730"))

_HERE = Path(__file__).parent


def _load_domain_file(filename: str) -> frozenset[str]:
    path = _HERE / filename
    domains: set[str] = set()
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            domains.add(line.lower())
    return frozenset(domains)


TRAVEL_DOMAINS  = _load_domain_file("domains_allowed.txt")
BLOCKED_DOMAINS = _load_domain_file("domains_blocked.txt")

# Seed template used when seeding a new user's vocabulary (db/writer.py:seed_user_keywords)
# and as a fallback when the DB is unreachable. Not used for live signal lookups — those
# go through db/reader.py:get_user_keywords so every user has their own copy.
_DEFAULT_ACTIVITY_SIGNALS: dict[str, list[str]] = {
    "food_dining": [
        "food tour", "cooking class", "tasting", "wine tour", "culinary", "food experience",
        "michelin", "fine dining", "street food", "food market", "chef's table",
        "tasting menu", "brunch", "farm to table", "food hall", "pop-up dinner",
    ],
    "culture_history": [
        "museum", "heritage", "architecture", "art tour", "old town",
        "historical walking tour", "gallery", "monument", "palace", "castle",
        "ruins", "cathedral", "archaeological site", "unesco",
    ],
    "adventure_outdoor": [
        "hiking", "trekking", "kayak", "surf", "scuba", "climbing", "safari",
        "zip line", "rafting", "cycling tour",
        "snorkeling", "paragliding", "skydiving", "bungee jump", "sailing",
        "windsurfing", "kitesurfing", "horseback riding", "atv tour",
        "mountain bike", "ski", "snowboard", "ice climbing", "canyoning", "via ferrata",
    ],
    "nightlife": [
        "bar crawl", "pub crawl", "rooftop bar", "cocktail",
        "nightclub", "dj set", "live music", "speakeasy", "jazz bar",
        "wine bar", "karaoke", "late-night",
    ],
    "wellness": [
        "spa", "yoga retreat", "meditation", "massage",
        "thermal bath", "hot springs", "hammam", "onsen", "sauna",
        "ayurveda", "silent retreat", "detox", "pilates", "breathwork",
    ],
    "sightseeing": [
        "city tour", "bus tour", "boat tour", "sunset cruise", "day trip", "excursion",
        "viewpoint", "observation deck", "hop on hop off", "free walking tour", "guided tour",
    ],
    "accommodation": [
        "airbnb", "vacation rental", "apartment rental",
        "hotel", "hostel", "resort", "bed and breakfast",
        "boutique hotel", "luxury hotel", "budget hotel", "5-star", "4-star",
        "guesthouse", "villa", "lodge", "glamping", "camping",
        "capsule hotel", "aparthotel", "dorm room",
    ],
    "transportation": [
        "flight", "low-cost airline", "business class", "first class", "economy class",
        "train", "high-speed train", "bus", "coach", "ferry", "cruise",
        "car rental", "taxi", "tuk-tuk",
        "ride hailing", "metro", "subway", "tram",
        "chauffeur", "motorbike rental", "scooter rental", "bike rental", "helicopter",
    ],
    "cuisine": [
        "italian", "japanese", "mexican", "indian", "chinese", "thai",
        "french", "spanish", "portuguese", "greek", "moroccan",
        "vietnamese", "korean", "american", "mediterranean",
        "peruvian", "lebanese", "turkish", "ethiopian", "brazilian", "argentinian",
        "vegetarian", "vegan", "plant-based", "seafood",
        "ramen", "sushi", "pizza", "tapas", "bbq", "fusion",
    ],
}

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

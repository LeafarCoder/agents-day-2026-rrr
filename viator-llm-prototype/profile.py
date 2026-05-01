from __future__ import annotations


ADRIEN_PROFILE = """
Adrien lived in France from 2015 to 2018 and travelled frequently within France
and Europe. He booked trains, low-cost flights, Airbnbs, Booking.com stays, wine
tastings, sailing trips, concerts, museums, surf lessons, paragliding, and
skydiving. He liked food, wine, music, trains, architecture, water activities,
and active outdoor experiences. He was budget-conscious but experience-seeking.

In 2018-2019 he lived in Singapore and travelled around Southeast Asia: Vietnam,
Cambodia, Laos, Myanmar, Thailand, Malaysia, Indonesia, Philippines, Brunei, and
Timor-Leste. He booked AirAsia/Singapore Airlines flights, 12Go buses/ferries/
trains, Klook/GetYourGuide/Viator activities, Angkor Enterprise Angkor passes,
Ha Long Bay boat cruises, diving, snorkeling, cooking classes, food tours, temple
tours, island hopping, wildlife/eco tours, concerts, and local cultural
experiences.

From late 2019 to 2021 he lived in Australia. He booked Qantas/Jetstar/Virgin
flights, Booking.com/Airbnb stays, car rentals, Great Barrier Reef diving/
snorkeling, outback/Uluru trips, Tasmania and Great Ocean Road road trips,
Sydney Opera House tours, Melbourne food/coffee/street-art experiences, Byron
Bay surf lessons, and concerts.

From 2021 to 2024 he lived in London. He booked museum and exhibition tickets,
concerts, theatre, Eurostar/train tickets, weekend trips to Edinburgh, Paris,
Amsterdam, Iceland, Morocco, Italy, Berlin, Wales, and Brighton. He increasingly
preferred small-group and high-quality curated experiences over generic mass
tours.

From 2024 to 2026 he lived in Lisbon. He booked pastel de nata workshops, surf
lessons, Sintra hikes, Tagus/Tejo sailing, Fado nights, Oceanario de Lisboa
tickets, Gulbenkian/CAM exhibitions, Porto and Douro wine trips, Madeira hikes,
Azores whale watching/canyoning/hot springs, Arrabida kayaking/snorkeling, and
Lisbon concerts.
""".strip()


DEFAULT_PREFERENCES = {
    "strong_likes": [
        "food and wine",
        "music and concerts",
        "architecture and museums",
        "water activities",
        "active outdoor experiences",
        "small-group curated tours",
        "trains and local transport",
    ],
    "avoid": [
        "generic mass coach tours",
        "overly passive sightseeing",
        "luxury-for-luxury's-sake experiences",
    ],
    "budget_style": "budget-conscious but willing to pay for distinctive experiences",
}

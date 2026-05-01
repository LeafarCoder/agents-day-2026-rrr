import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, TypedDict

import httpx
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

from app.supabase_client import get_supabase
from app.viator import viator_client, CITY_DESTINATION_IDS

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Category → Viator tag mapping
# ---------------------------------------------------------------------------

CATEGORY_TAGS: dict[str, list[int]] = {
    "food_drink": [21911, 11890],
    "outdoor_hiking": [21909],
    "history_culture": [21913, 21725],
    "walking_tours": [21725],
    "nightlife": [18953],
    "art_museums": [21913],
    "water_sports": [21909],
    "family_kids": [11919],
}

DEFAULT_CATEGORIES = ["food_drink", "history_culture", "walking_tours"]

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------


class PlannerState(TypedDict):
    latitude: float
    longitude: float
    session_id: str
    run_id: str
    city_name: str
    neighborhood: str
    destination_id: str
    travel_date: str
    preference_categories: list[str]
    viator_tag_ids: list[int]
    search_results: list[dict]
    available_products: list[dict]
    itinerary: Optional[Dict[str, Any]]
    steps: list[str]


# ---------------------------------------------------------------------------
# Supabase step helper
# ---------------------------------------------------------------------------


async def push_step(run_id: str, steps: list[str], step_string: str) -> list[str]:
    """Append step_string to steps list and persist to Supabase."""
    updated = list(steps) + [step_string]
    try:
        sb = get_supabase()
        sb.table("runs").update({"steps": updated}).eq("id", run_id).execute()
    except Exception as exc:
        logger.warning("push_step DB write failed for run %s: %s", run_id, exc)
    return updated


# ---------------------------------------------------------------------------
# Node 1 — context_resolver
# ---------------------------------------------------------------------------


async def context_resolver(state: PlannerState) -> dict:
    run_id = state["run_id"]
    lat = state["latitude"]
    lng = state["longitude"]
    steps = list(state["steps"])

    steps = await push_step(run_id, steps, "context_resolver:running")

    city_name = "Lisbon"
    neighborhood = "Alfama"

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lng, "format": "json"},
                headers={"User-Agent": "BPlanner/1.0"},
            )
            resp.raise_for_status()
            data: dict = resp.json()

        address: dict = data.get("address", {})
        city_name = (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or city_name
        )
        neighborhood = (
            address.get("suburb")
            or address.get("neighbourhood")
            or address.get("quarter")
            or city_name
        )
    except Exception as exc:
        logger.warning("Nominatim reverse geocode failed: %s", exc)

    destination_id = CITY_DESTINATION_IDS.get(city_name.lower(), "395")
    travel_date = datetime.now().strftime("%Y-%m-%d")

    steps = await push_step(
        run_id, steps, f"context_resolver:done:{neighborhood}, {city_name}"
    )

    return {
        "city_name": city_name,
        "neighborhood": neighborhood,
        "destination_id": destination_id,
        "travel_date": travel_date,
        "steps": steps,
    }


# ---------------------------------------------------------------------------
# Node 2 — profile_loader
# ---------------------------------------------------------------------------


async def profile_loader(state: PlannerState) -> dict:
    run_id = state["run_id"]
    session_id = state["session_id"]
    steps = list(state["steps"])

    steps = await push_step(run_id, steps, "profile_loader:running")

    categories: list[str] = DEFAULT_CATEGORIES

    try:
        sb = get_supabase()
        resp = (
            sb.table("user_preferences")
            .select("categories")
            .eq("session_id", session_id)
            .limit(1)
            .execute()
        )
        if resp.data:
            raw = resp.data[0].get("categories", [])
            if isinstance(raw, list) and raw:
                categories = [str(c) for c in raw]
    except Exception as exc:
        logger.warning("profile_loader DB read failed: %s", exc)

    # Build deduplicated tag list
    tag_set: list[int] = []
    seen: set[int] = set()
    for cat in categories:
        for tag in CATEGORY_TAGS.get(cat, []):
            if tag not in seen:
                seen.add(tag)
                tag_set.append(tag)

    steps = await push_step(
        run_id, steps, f"profile_loader:done:{','.join(categories)}"
    )

    return {
        "preference_categories": categories,
        "viator_tag_ids": tag_set,
        "steps": steps,
    }


# ---------------------------------------------------------------------------
# Node 3 — viator_searcher
# ---------------------------------------------------------------------------


async def viator_searcher(state: PlannerState) -> dict:
    run_id = state["run_id"]
    steps = list(state["steps"])

    steps = await push_step(run_id, steps, "viator_searcher:running")

    results = await viator_client.search_products(
        destination_id=state["destination_id"],
        tag_ids=state["viator_tag_ids"],
        travel_date=state["travel_date"],
    )

    steps = await push_step(
        run_id, steps, f"viator_searcher:done:{len(results)} results"
    )

    return {"search_results": results, "steps": steps}


# ---------------------------------------------------------------------------
# Node 4 — availability_checker
# ---------------------------------------------------------------------------


async def availability_checker(state: PlannerState) -> dict:
    run_id = state["run_id"]
    steps = list(state["steps"])
    candidates = state["search_results"][:8]
    travel_date = state["travel_date"]

    steps = await push_step(run_id, steps, "availability_checker:running")

    available: list[dict] = []
    for product in candidates:
        product_code = product.get("productCode", "")

        # If the fixture already embedded available_slots, trust them.
        if "available_slots" in product and product["available_slots"]:
            enriched = dict(product)
            available.append(enriched)
            continue

        slots = await viator_client.check_availability(product_code, travel_date)
        if slots:
            enriched = dict(product)
            enriched["available_slots"] = slots
            available.append(enriched)

    steps = await push_step(
        run_id, steps, f"availability_checker:done:{len(available)} available"
    )

    return {"available_products": available, "steps": steps}


# ---------------------------------------------------------------------------
# Node 5 — itinerary_assembler
# ---------------------------------------------------------------------------


def _score_product(product: dict, user_tag_ids: set[int]) -> float:
    rating_raw = (
        product.get("reviews", {}).get("combinedAverageRating")
        or product.get("combinedAverageRating")
        or 2.5
    )
    rating = float(rating_raw) / 5.0

    slots = product.get("available_slots", [])
    availability_count = min(len(slots), 5) / 5.0

    product_tags: set[int] = set(product.get("tags", []))
    preference_match = 1.0 if product_tags & user_tag_ids else 0.3

    return rating * 0.4 + availability_count * 0.3 + preference_match * 0.3


def _earliest_slot(product: dict) -> str:
    slots = product.get("available_slots", [])
    if not slots:
        return "10:00:00"
    times = [s.get("startTime", "10:00:00") for s in slots if s.get("available", True)]
    if not times:
        return "10:00:00"
    return sorted(times)[0]


async def _llm_why_love(
    stops: List[Dict[str, Any]],
    serendipity: Optional[Dict[str, Any]],
    preference_categories: List[str],
) -> Tuple[List[str], Optional[str]]:
    """Call claude-haiku to generate a one-sentence 'why you'll love this' for each stop."""
    llm = ChatOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ.get("OPENROUTER_API_KEY", ""),
        model="anthropic/claude-haiku-4-5",
        temperature=0.7,
    )

    all_items = list(stops)
    if serendipity:
        all_items.append(serendipity)

    numbered = "\n".join(
        f"{i + 1}. {item['title']}: {item.get('description', '')[:200]}"
        for i, item in enumerate(all_items)
    )
    prefs = ", ".join(preference_categories) if preference_categories else "general travel"

    prompt = (
        f"A traveller loves: {prefs}.\n\n"
        f"For each of the following {len(all_items)} experiences, write exactly ONE short, "
        f"enthusiastic sentence (max 20 words) explaining why they will love it. "
        f"Reply ONLY with a numbered list matching the input order, nothing else.\n\n"
        f"{numbered}"
    )

    try:
        response = await llm.ainvoke(prompt)
        lines = [
            ln.strip()
            for ln in str(response.content).strip().splitlines()
            if ln.strip()
        ]
        # Strip leading "1. ", "2. " etc.
        cleaned: list[str] = []
        for ln in lines:
            if ln and ln[0].isdigit():
                parts = ln.split(".", 1)
                cleaned.append(parts[1].strip() if len(parts) > 1 else ln)
            else:
                cleaned.append(ln)

        # Pad or trim to match
        while len(cleaned) < len(all_items):
            cleaned.append("A must-see experience you will absolutely love.")

        stop_whys = cleaned[: len(stops)]
        seren_why: Optional[str] = cleaned[len(stops)] if serendipity else None
        return stop_whys, seren_why

    except Exception as exc:
        logger.warning("LLM call failed in itinerary_assembler: %s", exc)
        fallback = ["A wonderful experience tailored just for you."] * len(stops)
        seren_fallback = "A delightful surprise pick you won't want to miss." if serendipity else None
        return fallback, seren_fallback


async def itinerary_assembler(state: PlannerState) -> dict:
    run_id = state["run_id"]
    steps = list(state["steps"])
    available = list(state["available_products"])
    user_tag_ids: set[int] = set(state["viator_tag_ids"])
    preference_categories = state["preference_categories"]

    steps = await push_step(run_id, steps, "itinerary_assembler:running")

    # Score and sort
    scored = sorted(available, key=lambda p: _score_product(p, user_tag_ids), reverse=True)

    # Main picks: top 2 or 3
    n_picks = 3 if len(scored) >= 4 else 2
    main_picks = scored[:n_picks]

    # Serendipity: first product whose tags do NOT intersect user tags
    serendipity_product: Optional[Dict[str, Any]] = None
    picked_codes = {p.get("productCode") for p in main_picks}
    for candidate in scored:
        if candidate.get("productCode") in picked_codes:
            continue
        product_tags: set[int] = set(candidate.get("tags", []))
        if not (product_tags & user_tag_ids):
            serendipity_product = candidate
            break

    # LLM descriptions
    stop_whys, seren_why = await _llm_why_love(
        main_picks, serendipity_product, preference_categories
    )

    # Assemble stops — keep nested Viator structure so frontend types match
    stops: list[dict] = []
    for i, product in enumerate(main_picks):
        stops.append(
            {
                "productCode": product.get("productCode"),
                "title": product.get("title"),
                "description": product.get("description"),
                "pricing": product.get("pricing", {"summary": {"fromPrice": None}, "currency": "EUR"}),
                "reviews": product.get("reviews", {}),
                "images": product.get("images", []),
                "productUrl": product.get("productUrl"),
                "tags": product.get("tags", []),
                "flags": product.get("flags", []),
                "available_start_time": _earliest_slot(product),
                "walk_minutes_to_next": 15 if i < len(main_picks) - 1 else None,
                "why_youll_love_it": stop_whys[i] if i < len(stop_whys) else "",
            }
        )

    # Assemble serendipity pick
    serendipity_dict: Optional[Dict[str, Any]] = None
    if serendipity_product:
        serendipity_dict = {
            "productCode": serendipity_product.get("productCode"),
            "title": serendipity_product.get("title"),
            "description": serendipity_product.get("description"),
            "pricing": serendipity_product.get("pricing", {"summary": {"fromPrice": None}, "currency": "EUR"}),
            "reviews": serendipity_product.get("reviews", {}),
            "images": serendipity_product.get("images", []),
            "productUrl": serendipity_product.get("productUrl"),
            "tags": serendipity_product.get("tags", []),
            "flags": serendipity_product.get("flags", []),
            "available_start_time": _earliest_slot(serendipity_product),
            "why_youll_love_it": seren_why or "",
            "serendipity_reason": (
                "A surprise pick outside your usual preferences — you might just love it!"
            ),
        }

    itinerary: dict[str, Any] = {
        "city_name": state["city_name"],
        "neighborhood": state["neighborhood"],
        "stops": stops,
        "serendipity_pick": serendipity_dict,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Persist final result to Supabase
    try:
        sb = get_supabase()
        sb.table("runs").update(
            {"status": "done", "result": itinerary, "steps": steps + ["itinerary_assembler:done"]}
        ).eq("id", run_id).execute()
    except Exception as exc:
        logger.warning("itinerary_assembler DB write failed: %s", exc)

    steps = await push_step(run_id, steps, "itinerary_assembler:done")

    return {"itinerary": itinerary, "steps": steps}


# ---------------------------------------------------------------------------
# Graph factory
# ---------------------------------------------------------------------------


def create_graph():
    graph = StateGraph(PlannerState)

    graph.add_node("context_resolver", context_resolver)
    graph.add_node("profile_loader", profile_loader)
    graph.add_node("viator_searcher", viator_searcher)
    graph.add_node("availability_checker", availability_checker)
    graph.add_node("itinerary_assembler", itinerary_assembler)

    graph.set_entry_point("context_resolver")
    graph.add_edge("context_resolver", "profile_loader")
    graph.add_edge("profile_loader", "viator_searcher")
    graph.add_edge("viator_searcher", "availability_checker")
    graph.add_edge("availability_checker", "itinerary_assembler")
    graph.add_edge("itinerary_assembler", END)

    return graph.compile()

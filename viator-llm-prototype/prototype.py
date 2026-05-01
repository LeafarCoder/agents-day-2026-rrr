from __future__ import annotations

import argparse
import asyncio
import json
import os
from typing import Any, TypedDict

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph

from profile import ADRIEN_PROFILE, DEFAULT_PREFERENCES
from viator_client import ViatorClient, compact_product, extract_products


DEFAULT_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free"
DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class RecommendationState(TypedDict, total=False):
    destination: str
    destination_id: str | None
    travel_date: str | None
    currency: str
    user_profile: str
    preferences: dict[str, Any]
    search_intents: list[dict[str, Any]]
    products: list[dict[str, Any]]
    recommendations: list[dict[str, Any]]
    notes: list[str]


DESTINATION_IDS = {
    "lisbon": "395",
    "porto": "2242",
    "london": "737",
    "paris": "479",
    "rome": "511",
    "barcelona": "562",
    "amsterdam": "525",
    "berlin": "2148",
    "singapore": "18",
    "sydney": "357",
}


def make_llm() -> ChatOpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is required")
    return ChatOpenAI(
        model=os.environ.get("OPENROUTER_MODEL", DEFAULT_MODEL),
        api_key=api_key,
        base_url=os.environ.get("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL),
        temperature=0.35,
    )


def parse_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:].strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"LLM did not return a JSON object: {text[:500]}")
    return json.loads(text[start : end + 1])


async def plan_searches(state: RecommendationState) -> RecommendationState:
    llm = make_llm()
    prompt = f"""
User profile:
{state["user_profile"]}

Structured preferences:
{json.dumps(state["preferences"], indent=2)}

Destination: {state["destination"]}
Travel date: {state.get("travel_date") or "not specified"}

Create 4 Viator search intents for this traveler. Balance safe matches and one
serendipitous option. Favor small-group, high-quality, active, food/wine,
music/culture, architecture, and water/outdoor experiences.

Return only JSON:
{{
  "intents": [
    {{"query": "short Viator search phrase", "why": "reason", "priority": 1}}
  ]
}}
""".strip()
    response = await llm.ainvoke(
        [
            SystemMessage(content="You are a travel recommendation planner. Return valid JSON only."),
            HumanMessage(content=prompt),
        ]
    )
    data = parse_json_object(str(response.content))
    intents = data.get("intents") or []
    if not intents:
        intents = fallback_intents(state["destination"])
    return {"search_intents": intents[:4], "notes": state.get("notes", [])}


def fallback_intents(destination: str) -> list[dict[str, Any]]:
    return [
        {"query": f"{destination} food wine small group", "why": "Strong food and wine preference", "priority": 1},
        {"query": f"{destination} sailing kayak snorkeling", "why": "Water activities and active outdoors", "priority": 2},
        {"query": f"{destination} architecture museum walking tour", "why": "Culture and architecture", "priority": 3},
        {"query": f"{destination} music local culture night", "why": "Music and local experiences", "priority": 4},
    ]


async def search_viator(state: RecommendationState) -> RecommendationState:
    client = ViatorClient()
    products_by_code: dict[str, dict[str, Any]] = {}
    notes = list(state.get("notes", []))
    destination_id = state.get("destination_id")

    for intent in state.get("search_intents", []):
        query = str(intent.get("query") or "").strip()
        if not query:
            continue
        try:
            response = await client.free_text_search(
                query,
                currency=state["currency"],
                destination_id=destination_id,
                count=8,
            )
            products = extract_products(response)
            notes.append(f"Free-text search returned {len(products)} products for: {query}")
        except Exception as exc:
            products = []
            notes.append(f"Free-text search failed for '{query}': {exc}")

        for product in products:
            compact = compact_product(product)
            code = compact.get("productCode") or compact.get("title")
            if code and code not in products_by_code:
                compact["matchedIntent"] = query
                compact["intentWhy"] = intent.get("why")
                products_by_code[str(code)] = compact

    if len(products_by_code) < 5 and destination_id:
        try:
            response = await client.product_search(
                destination_id=destination_id,
                currency=state["currency"],
                start_date=state.get("travel_date"),
                end_date=state.get("travel_date"),
                count=12,
            )
            fallback_products = extract_products(response)
            notes.append(f"Product search fallback returned {len(fallback_products)} products.")
            for product in fallback_products:
                compact = compact_product(product)
                code = compact.get("productCode") or compact.get("title")
                if code and code not in products_by_code:
                    compact["matchedIntent"] = "destination fallback"
                    compact["intentWhy"] = "Broadened search because free-text results were thin"
                    products_by_code[str(code)] = compact
        except Exception as exc:
            notes.append(f"Product search fallback failed: {exc}")

    return {"products": list(products_by_code.values())[:25], "notes": notes}


async def rank_products(state: RecommendationState) -> RecommendationState:
    products = state.get("products", [])
    if not products:
        return {
            "recommendations": [],
            "notes": state.get("notes", []) + ["No Viator products were available to rank."],
        }

    llm = make_llm()
    prompt = f"""
Traveler profile:
{state["user_profile"]}

Destination: {state["destination"]}
Preferences:
{json.dumps(state["preferences"], indent=2)}

Candidate Viator products:
{json.dumps(products[:18], indent=2)}

Pick the best 5 recommendations. Reward:
- food/wine, music, architecture, museums, water, outdoor, active experiences
- small-group or curated-feeling products
- distinctive local character
- good value, not necessarily cheapest

Penalize generic mass tours.

Return only JSON:
{{
  "recommendations": [
    {{
      "rank": 1,
      "productCode": "...",
      "title": "...",
      "fitScore": 0-100,
      "whyAdrien": "specific reason",
      "bookingAngle": "short UI copy",
      "productUrl": "..."
    }}
  ]
}}
""".strip()
    response = await llm.ainvoke(
        [
            SystemMessage(content="You rank travel experiences. Return valid JSON only."),
            HumanMessage(content=prompt),
        ]
    )
    data = parse_json_object(str(response.content))
    return {"recommendations": data.get("recommendations", [])[:5], "notes": state.get("notes", [])}


def build_graph():
    graph = StateGraph(RecommendationState)
    graph.add_node("plan_searches", plan_searches)
    graph.add_node("search_viator", search_viator)
    graph.add_node("rank_products", rank_products)
    graph.add_edge(START, "plan_searches")
    graph.add_edge("plan_searches", "search_viator")
    graph.add_edge("search_viator", "rank_products")
    graph.add_edge("rank_products", END)
    return graph.compile()


async def run(args: argparse.Namespace) -> RecommendationState:
    load_dotenv()
    destination = args.destination.strip()
    destination_id = args.destination_id or DESTINATION_IDS.get(destination.lower())
    initial_state: RecommendationState = {
        "destination": destination,
        "destination_id": destination_id,
        "travel_date": args.date,
        "currency": args.currency,
        "user_profile": ADRIEN_PROFILE,
        "preferences": DEFAULT_PREFERENCES,
        "notes": [],
    }
    app = build_graph()
    return await app.ainvoke(initial_state)


def main() -> None:
    parser = argparse.ArgumentParser(description="Prototype Viator recommendations with LangGraph and OpenRouter.")
    parser.add_argument("--destination", default="Lisbon")
    parser.add_argument("--destination-id", default=None, help="Optional Viator destination id.")
    parser.add_argument("--date", default=None, help="Optional travel date in YYYY-MM-DD.")
    parser.add_argument("--currency", default="EUR")
    parser.add_argument("--json", action="store_true", help="Print raw JSON output.")
    args = parser.parse_args()

    result = asyncio.run(run(args))
    if args.json:
        print(json.dumps(result, indent=2))
        return

    print(f"Destination: {result.get('destination')}")
    print(f"Candidate products: {len(result.get('products', []))}")
    print("\nRecommendations")
    for rec in result.get("recommendations", []):
        print(f"{rec.get('rank')}. {rec.get('title')} ({rec.get('fitScore')}/100)")
        print(f"   Why: {rec.get('whyAdrien')}")
        if rec.get("bookingAngle"):
            print(f"   Angle: {rec.get('bookingAngle')}")
        if rec.get("productUrl"):
            print(f"   URL: {rec.get('productUrl')}")
    print("\nNotes")
    for note in result.get("notes", []):
        print(f"- {note}")


if __name__ == "__main__":
    main()

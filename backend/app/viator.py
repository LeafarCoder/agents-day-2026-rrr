import os
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.supabase_client import get_supabase
from app.fixtures import FIXTURES

logger = logging.getLogger(__name__)

VIATOR_BASE_URL = "https://api.sandbox.viator.com/partner"

CITY_DESTINATION_IDS: dict[str, str] = {
    "lisbon": "395",
    "porto": "2242",
    "london": "737",
    "paris": "479",
    "rome": "511",
    "new york": "684",
    "barcelona": "562",
    "amsterdam": "525",
    "madrid": "1045",
    "berlin": "2148",
}

# Reverse mapping: destination_id → city_slug
_DEST_ID_TO_SLUG: dict[str, str] = {v: k for k, v in CITY_DESTINATION_IDS.items()}


def _viator_headers() -> dict[str, str]:
    return {
        "exp-api-key": os.environ.get("VIATOR_API_KEY", ""),
        "Accept": "application/json;version=2.0",
        "Content-Type": "application/json",
    }


def _fixture_for_destination(destination_id: str) -> list[dict]:
    """Return fixture products for a destination_id, falling back to lisbon."""
    slug = _DEST_ID_TO_SLUG.get(destination_id, "lisbon")
    data = FIXTURES.get(slug) or FIXTURES.get("lisbon", {})
    return list(data.get("products", []))


async def _load_from_supabase(city_slug: str) -> Optional[List[Dict[str, Any]]]:
    """Try to load a cached fixture from the viator_fixtures table."""
    try:
        sb = get_supabase()
        resp = (
            sb.table("viator_fixtures")
            .select("response_json")
            .eq("city_slug", city_slug)
            .limit(1)
            .execute()
        )
        if resp.data:
            return list(resp.data[0]["response_json"].get("products", []))
    except Exception as exc:
        logger.warning("viator_fixtures DB read failed for %s: %s", city_slug, exc)
    return None


async def _save_to_supabase(city_slug: str, response_json: dict) -> None:
    """Upsert a successful Viator response into viator_fixtures."""
    try:
        sb = get_supabase()
        sb.table("viator_fixtures").upsert(
            {"city_slug": city_slug, "response_json": response_json},
            on_conflict="city_slug",
        ).execute()
    except Exception as exc:
        logger.warning("viator_fixtures DB write failed for %s: %s", city_slug, exc)


class ViatorClient:
    def __init__(self) -> None:
        self._timeout = httpx.Timeout(15.0)

    async def search_products(
        self,
        destination_id: str,
        tag_ids: list[int],
        travel_date: str,
        currency: str = "EUR",
    ) -> list[dict]:
        """Search Viator /products/search; falls back to fixtures on thin/failed responses."""
        city_slug = _DEST_ID_TO_SLUG.get(destination_id, "lisbon")

        payload: dict[str, Any] = {
            "filtering": {
                "destination": destination_id,
                "tags": tag_ids or [21911, 21913],
                "startDate": travel_date,
                "endDate": travel_date,
            },
            "sorting": {"sort": "DEFAULT"},
            "pagination": {"start": 1, "count": 15},
            "currency": currency,
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(
                    f"{VIATOR_BASE_URL}/products/search",
                    json=payload,
                    headers=_viator_headers(),
                )
                resp.raise_for_status()
                data: dict = resp.json()

            products: list[dict] = data.get("products", [])

            if len(products) >= 3:
                # Cache the good response
                await _save_to_supabase(city_slug, data)
                return products

            logger.info(
                "Viator returned only %d products for %s — trying fallback",
                len(products),
                city_slug,
            )

        except Exception as exc:
            logger.warning("Viator search failed for destination %s: %s", destination_id, exc)

        # Fallback 1: Supabase cache
        cached = await _load_from_supabase(city_slug)
        if cached and len(cached) >= 3:
            logger.info("Using Supabase-cached fixture for %s", city_slug)
            return cached

        # Fallback 2: in-memory fixture
        logger.info("Using in-memory fixture for %s", city_slug)
        return _fixture_for_destination(destination_id)

    async def check_availability(
        self,
        product_code: str,
        travel_date: str,
        currency: str = "EUR",
    ) -> list[dict]:
        """Call Viator /availability/check; returns list of bookable items or []."""
        payload = {
            "productCode": product_code,
            "travelDate": travel_date,
            "currency": currency,
            "paxMix": [{"ageBand": "ADULT", "numberOfTravelers": 1}],
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(
                    f"{VIATOR_BASE_URL}/availability/check",
                    json=payload,
                    headers=_viator_headers(),
                )
                resp.raise_for_status()
                data: dict = resp.json()
            return data.get("bookableItems", [])
        except Exception as exc:
            logger.warning(
                "Viator availability check failed for %s: %s", product_code, exc
            )
            return []


# Module-level singleton
viator_client = ViatorClient()

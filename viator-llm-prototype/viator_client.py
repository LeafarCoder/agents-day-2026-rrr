from __future__ import annotations

import os
from typing import Any

import httpx


DEFAULT_BASE_URL = "https://api.sandbox.viator.com/partner"


class ViatorClient:
    """Small Viator Partner API client for recommendation prototypes."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        accept_language: str = "en-US",
        timeout_seconds: float = 20.0,
    ) -> None:
        self.api_key = api_key or os.environ.get("VIATOR_API_KEY", "")
        self.base_url = (base_url or os.environ.get("VIATOR_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.accept_language = accept_language
        self.timeout = httpx.Timeout(timeout_seconds)
        if not self.api_key:
            raise RuntimeError("VIATOR_API_KEY is required")

    def headers(self) -> dict[str, str]:
        return {
            "exp-api-key": self.api_key,
            "Accept": "application/json;version=2.0",
            "Accept-Language": self.accept_language,
            "Content-Type": "application/json",
        }

    async def free_text_search(
        self,
        search_term: str,
        currency: str = "EUR",
        count: int = 10,
        destination_id: str | None = None,
    ) -> dict[str, Any]:
        """Call /search/freetext for product-like search terms.

        Viator's free-text endpoint supports PRODUCTS, DESTINATIONS, and
        ATTRACTIONS searches. This prototype requests PRODUCTS and keeps the
        request intentionally small for easy debugging.
        """
        product_search: dict[str, Any] = {
            "searchType": "PRODUCTS",
            "pagination": {"start": 1, "count": count},
        }
        if destination_id:
            product_search["filtering"] = {"destination": destination_id}

        payload: dict[str, Any] = {
            "searchTerm": search_term,
            "currency": currency,
            "searchTypes": [product_search],
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/search/freetext",
                json=payload,
                headers=self.headers(),
            )
            response.raise_for_status()
            return response.json()

    async def product_search(
        self,
        destination_id: str,
        tag_ids: list[int] | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        currency: str = "EUR",
        count: int = 10,
    ) -> dict[str, Any]:
        """Call /products/search when a destination id is available."""
        filtering: dict[str, Any] = {"destination": destination_id}
        if tag_ids:
            filtering["tags"] = tag_ids
        if start_date:
            filtering["startDate"] = start_date
        if end_date:
            filtering["endDate"] = end_date

        payload = {
            "filtering": filtering,
            "sorting": {"sort": "DEFAULT"},
            "pagination": {"start": 1, "count": count},
            "currency": currency,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/products/search",
                json=payload,
                headers=self.headers(),
            )
            response.raise_for_status()
            return response.json()

    async def product_details(self, product_code: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/products/{product_code}",
                headers=self.headers(),
            )
            response.raise_for_status()
            return response.json()


def extract_products(search_response: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalize common Viator search response shapes into product dictionaries."""
    if isinstance(search_response.get("products"), list):
        return search_response["products"]

    product_results = search_response.get("productResults")
    if isinstance(product_results, dict) and isinstance(product_results.get("products"), list):
        return product_results["products"]

    search_types = search_response.get("searchTypes")
    if isinstance(search_types, list):
        for block in search_types:
            if not isinstance(block, dict):
                continue
            if block.get("searchType") == "PRODUCTS":
                products = block.get("products") or block.get("results")
                if isinstance(products, list):
                    return products

    results = search_response.get("results")
    if isinstance(results, list):
        return [item for item in results if isinstance(item, dict)]

    return []


def compact_product(product: dict[str, Any]) -> dict[str, Any]:
    """Keep only fields useful for LLM ranking and terminal output."""
    price = product.get("pricing", {}).get("summary", {}) if isinstance(product.get("pricing"), dict) else {}
    reviews = product.get("reviews", {}) if isinstance(product.get("reviews"), dict) else {}
    images = product.get("images") or []
    cover_image = None
    if images and isinstance(images[0], dict):
        cover_image = images[0].get("variants", [{}])[0].get("url") if images[0].get("variants") else images[0].get("url")

    return {
        "productCode": product.get("productCode") or product.get("code"),
        "title": product.get("title"),
        "description": product.get("description") or product.get("shortDescription"),
        "rating": reviews.get("combinedAverageRating") or product.get("rating"),
        "reviewCount": reviews.get("totalReviews") or product.get("reviewCount"),
        "priceFrom": price.get("fromPrice") or product.get("price", {}).get("fromPrice"),
        "currency": price.get("currency") or product.get("currency"),
        "duration": product.get("duration"),
        "productUrl": product.get("productUrl"),
        "coverImage": cover_image,
        "flags": product.get("flags"),
        "tags": product.get("tags"),
    }

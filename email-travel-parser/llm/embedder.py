from __future__ import annotations

import httpx

from config import (
    EMBEDDING_DIMENSIONS,
    EMBEDDING_PROVIDER,
    OLLAMA_HOST,
    OPENROUTER_API_KEY,
    OPENROUTER_EMBEDDING_MODEL,
)
from observability.logger import get

log = get("llm.embedder")

_OLLAMA_MODEL = "nomic-embed-text"
_OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings"


def _validate_embedding(embedding: list[float], model: str) -> list[float]:
    if len(embedding) != EMBEDDING_DIMENSIONS:
        raise ValueError(
            f"Expected {EMBEDDING_DIMENSIONS}-dim embedding from {model}, got {len(embedding)}"
        )
    return embedding


def embedding_model_name() -> str:
    if EMBEDDING_PROVIDER == "openrouter":
        return OPENROUTER_EMBEDDING_MODEL
    return _OLLAMA_MODEL


def embed_text(text: str) -> list[float]:
    """Embed text with the configured provider into the schema's vector size."""
    if EMBEDDING_PROVIDER == "openrouter":
        log.info(
            f"Embed  provider=openrouter  model={OPENROUTER_EMBEDDING_MODEL}  "
            f"dims={EMBEDDING_DIMENSIONS}  chars={len(text)}"
        )
        response = httpx.post(
            _OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://email-travel-parser",
                "X-Title": "Email Travel Parser",
            },
            json={
                "model": OPENROUTER_EMBEDDING_MODEL,
                "input": text,
                "dimensions": EMBEDDING_DIMENSIONS,
            },
            timeout=60.0,
        )
        response.raise_for_status()
        return _validate_embedding(response.json()["data"][0]["embedding"], OPENROUTER_EMBEDDING_MODEL)

    url = f"{OLLAMA_HOST}/api/embed"
    log.info(f"Embed  provider=ollama  model={_OLLAMA_MODEL}  chars={len(text)}")
    response = httpx.post(
        url,
        json={"model": _OLLAMA_MODEL, "input": text},
        timeout=60.0,
    )
    response.raise_for_status()
    embedding = response.json()["embeddings"][0]
    return _validate_embedding(embedding, _OLLAMA_MODEL)

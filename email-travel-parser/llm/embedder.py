from __future__ import annotations

import httpx

from config import OLLAMA_HOST
from observability.logger import get

log = get("llm.embedder")

_MODEL = "nomic-embed-text"
_DIMS  = 768


def embed_text(text: str) -> list[float]:
    """Embed text with Ollama nomic-embed-text → 768-dim vector."""
    url = f"{OLLAMA_HOST}/api/embed"
    log.info(f"Embed  model={_MODEL}  chars={len(text)}")
    response = httpx.post(
        url,
        json={"model": _MODEL, "input": text},
        timeout=60.0,
    )
    response.raise_for_status()
    embedding = response.json()["embeddings"][0]
    if len(embedding) != _DIMS:
        raise ValueError(f"Expected {_DIMS}-dim embedding, got {len(embedding)}")
    return embedding

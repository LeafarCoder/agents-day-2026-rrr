from __future__ import annotations

from supabase import Client, create_client

from config import SUPABASE_KEY, SUPABASE_URL

_client: Client | None = None


def get() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client

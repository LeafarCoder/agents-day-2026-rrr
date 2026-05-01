# Viator LLM Recommendation Prototype

This is an isolated prototype for recommending Viator experiences from a travel
preference profile. It is intentionally separate from the production
`backend/` so another agent can lift the pieces into the app later.

## Goal

Given a profile like Adrien's travel history, the prototype:

1. asks an OpenRouter-hosted LLM to create Viator search intents,
2. calls Viator Partner API search endpoints,
3. normalizes product summaries,
4. asks the LLM to rank the products for the user,
5. prints five recommendations with product URLs when available.

The default model is:

```text
nvidia/nemotron-3-nano-30b-a3b:free
```

## Files

- `prototype.py` - LangGraph CLI entry point.
- `viator_client.py` - small async Viator Partner API client.
- `profile.py` - embedded Adrien demo profile and preferences.
- `.env.example` - environment variable template.
- `requirements.txt` - local prototype dependencies.

## Setup

```bash
cd viator-llm-prototype
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
```

Fill `.env` locally:

```bash
VIATOR_API_KEY=
OPENROUTER_API_KEY=
VIATOR_BASE_URL=https://api.sandbox.viator.com/partner
OPENROUTER_MODEL=nvidia/nemotron-3-nano-30b-a3b:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

Do not commit `.env`.

## Run

```bash
.venv/bin/python prototype.py --destination Lisbon --date 2026-05-04
```

Raw JSON output:

```bash
.venv/bin/python prototype.py --destination Lisbon --date 2026-05-04 --json
```

If the destination id is missing or wrong, pass one explicitly:

```bash
.venv/bin/python prototype.py \
  --destination Lisbon \
  --destination-id 395 \
  --date 2026-05-04
```

## API Notes

Viator Partner API v2 uses:

- header `exp-api-key` for authentication,
- header `Accept: application/json;version=2.0`,
- header `Accept-Language`, for example `en-US`,
- sandbox base URL `https://api.sandbox.viator.com/partner`,
- production base URL `https://api.viator.com/partner`.

This prototype uses `/search/freetext` first because it is a quick way to search
for products by natural-language intent. If results are thin and a destination
id is available, it falls back to `/products/search`.

## Integration Plan

Recommended next steps for the main app:

1. Move `ViatorClient.free_text_search` and `extract_products` into
   `backend/app/viator.py`.
2. Replace the hard-coded `ADRIEN_PROFILE` with the output of the Gmail travel
   profile parser.
3. Add two LangGraph nodes to the existing backend graph:
   `preference_to_search_intents` and `llm_product_ranker`.
4. Keep product search/ranking server-side so Viator and OpenRouter keys never
   reach the browser.
5. Cache raw Viator responses and final recommendations in Supabase for demo
   repeatability.
6. Add a fixture fallback for hackathon demos when sandbox inventory is thin.

## Secret Checks

Before committing changes in this folder:

```bash
git status --short
git diff --cached --name-only
git grep -n -I -E "sk-or-|client_secret|refresh_token|access_token|BEGIN (RSA|OPENSSH|PRIVATE) KEY" -- viator-llm-prototype
```

Expected behavior: `.env` and local virtual environments are ignored, and no
real key values are present in tracked files.

## References

- Viator Partner API docs: https://docs.viator.com/partner-api/technical/
- Viator product/search overview: https://partnerresources.viator.com/travel-commerce/affiliate/search-api/
- Viator product availability/search guide: https://partnerresources.viator.com/travel-commerce/managing-product-availability-data/

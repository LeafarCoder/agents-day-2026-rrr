# LLM Handoff: msgvault -> Supabase Taste Profile

## What is implemented

1. **Local archive + semantic search**
   - msgvault is the local Gmail archive (`~/.msgvault/msgvault.db`).
   - Semantic/hybrid retrieval is done with msgvault vectors (`vectors.db`).
   - MCP is available via `msgvault mcp`.

2. **Supabase schema support**
   - Added compatibility for two `user_preferences` shapes:
     - `user_preferences(preference_id)` (normalized via `preferences`)
     - `user_preferences(activity_keyword_id)` (currently live in this project)
   - Migration added:
     - `supabase/migrations/20260501000004_schema_compat_user_preferences.sql`
   - Writer now detects live schema and upserts accordingly.

3. **Full inbox test path**
   - `gmail/fetcher.py` now supports `GMAIL_QUERY_OVERRIDE`.
   - `GMAIL_QUERY_OVERRIDE=""` means fetch all inbox messages (not only travel query).
   - Added script:
     - `scripts/run_scan_once.py` to run one end-to-end Gmail scrape + Supabase persist.

## Commands used for demo verification

1. Full msgvault sync:
   - `msgvault sync-full email.travel.parser@gmail.com`

2. Hybrid semantic verification:
   - `msgvault search "travel preferences food tour museum flight hotel" --account email.travel.parser@gmail.com --mode hybrid --json --limit 8 --explain`

3. Full inbox ingest to Supabase:
   - `SUPABASE_URL=... SUPABASE_KEY=... GMAIL_QUERY_OVERRIDE="" PYTHONPATH=. venv/bin/python scripts/run_scan_once.py --token-file seed_token.json --user-email email.travel.parser@gmail.com`

## Verified outcomes (2026-05-01)

- msgvault local archive: **133 messages**
- Supabase:
  - `cities`: **4**
  - `travels`: **4**
  - `emails`: **87**
  - `user_preferences`: **99**

## Known gaps

1. **Destination extraction is still regex-driven**
   - Many emails don’t match the current destination patterns.
   - This limits `cities` / `travels` growth.

2. **Vector rebuild issue in msgvault**
   - `msgvault build-embeddings` can fail with:
     - `UNIQUE constraint failed on vectors_vec_d768 primary key`
   - Hybrid search still works with active generation in this environment.

3. **Supabase CLI auth**
   - `supabase db push` requires CLI login in this shell.
   - Service-role writes worked directly for runtime tests.

## Recommended next iteration

1. Improve destination extraction:
   - Parse destination from body templates, airport pairs, and route fields.
   - Add fallback location extraction to increase `cities/travels` coverage.
2. Add msgvault orchestration script:
   - domain discovery -> sync -> hybrid evidence -> LLM extraction -> Supabase writes.
3. Add repeatable smoke command in Makefile for team demos.

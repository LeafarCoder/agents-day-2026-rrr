# msgvault Taste Profile Pipeline

This project treats msgvault as the local Gmail archive and semantic search
engine. Supabase stores the app-facing profile, normalized preferences, and
evidence references, but not the full mailbox.

## Data Flow

1. Sync Gmail into msgvault.
2. Enable/build msgvault vector search.
3. Run semantic or hybrid searches for travel preference evidence.
4. Send selected message snippets/bodies to Claude for structured extraction.
5. Upsert normalized preferences into Supabase.
6. Generate and store a compact embedded taste profile for planner matching.

## Local Prerequisites

- Supabase CLI.
- Docker Desktop running for local Supabase tests.
- msgvault installed and configured with the target Gmail account.
- A msgvault vector embedding endpoint, preferably local for privacy.
- Claude API access for preference extraction.
- A profile embedding provider that produces the same dimension as the schema.

The current migrations use `vector(1536)`, so use a 1536-dimensional profile
embedding model or change the migration dimension before deploying.

## Migration Boundaries

## Supabase Schema

The `supabase/migrations/` directory contains the Email Parser schema used by
the Gmail scanner and Supabase writer.

## Supabase Schema Test

From repo root:

```bash
supabase init
supabase start
supabase db reset
```

Then confirm the new tables exist:

```bash
supabase db query "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('msgvault_sources', 'msgvault_profile_runs', 'msgvault_message_evidence', 'user_taste_profiles', 'user_preference_evidence') order by table_name;"
```

Confirm pgvector is available:

```bash
supabase db query "select extname from pg_extension where extname = 'vector';"
```

## msgvault Smoke Test

Install and configure msgvault from the official docs:

```bash
msgvault setup
msgvault add-account you@example.com
msgvault sync-full you@example.com --query "newer_than:365d"
```

Start with a date-limited sync for testing. Once search works, run a full sync.

Verify ordinary search:

```bash
msgvault search "reservation OR booking OR itinerary" --json -n 10
```

Verify semantic/hybrid search after vector search is configured:

```bash
msgvault search "food tours cooking classes boutique hotels museums walking tours" --mode hybrid --json -n 10
```

## End-to-End Acceptance Test

A passing end-to-end test should prove:

1. msgvault has synced Gmail locally.
2. msgvault hybrid search returns relevant travel emails.
3. Claude returns structured preferences with rationale and evidence IDs.
4. Supabase has rows in:
   - `msgvault_profile_runs`
   - `msgvault_message_evidence`
   - `user_preferences`
   - `user_preference_evidence`
   - `user_taste_profiles`
5. `user_taste_profiles.embedding` is non-null.
6. A planner query can retrieve the profile by user/session and use the vector.

Example Supabase checks:

```sql
select status, search_mode, search_result_count
from msgvault_profile_runs
order by started_at desc
limit 5;

select subject, search_query, search_rank, extracted_preferences
from msgvault_message_evidence
order by created_at desc
limit 10;

select user_id, embedding is not null as has_embedding, profile_json
from user_taste_profiles;
```

## What Still Needs Implementation

The database schema exists, but the orchestration code still needs to be added:

- A msgvault client wrapper that calls `msgvault search --mode hybrid --json` or
  the msgvault HTTP API.
- A Claude extraction module that converts evidence messages into structured
  preferences.
- Supabase write logic that upserts catalog preferences, user preferences,
  evidence links, and the final embedded profile.
- A manual or scheduled endpoint/job to run the pipeline for a user.

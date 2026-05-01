# Email Travel Parser

Scans Gmail booking confirmation emails from known travel brands (Airbnb, Booking.com, Ryanair, Viator, etc.) and builds a structured travel preference profile.

The app currently has two local-test paths:

- Gmail API scanner: scans Gmail directly, extracts keyword-based travel
  preferences, and writes normalized rows to Supabase.
- msgvault smoke test: syncs Gmail into a local msgvault SQLite archive, builds
  a local vector index with Ollama, runs hybrid semantic search, and writes
  msgvault provenance/profile rows to Supabase.

The intended production pipeline is:

```text
msgvault hybrid search -> Claude structured extraction -> Supabase profile write
```

The msgvault/Claude bridge is not fully implemented yet. The local smoke test
proves msgvault sync, vector search, and Supabase writes using the existing
keyword detector.

## Setup

### 1. Python

Install Python 3.12 via pyenv:

```bash
brew install pyenv
pyenv install 3.12.3
pyenv local 3.12.3
```

### 2. Dependencies

```bash
make install
```

### 3. Gmail OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services → Library** → enable **Gmail API**
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Type: **Web application**
   - Authorised JavaScript origins: `http://localhost:8042`
   - Authorised redirect URIs: `http://localhost:8042/oauth/callback`
4. Download JSON → rename to `credentials.json` → place in this directory
5. **Google Auth Platform → Audience** → add your Gmail address as a test user
6. **Google Auth Platform → Data access** → add scope `gmail.readonly`

### 4. Supabase

Install the Supabase CLI if needed:

```bash
brew install supabase/tap/supabase
```

For CLI migrations, Supabase requires a personal access token, not the project
service-role key. Create one from the Supabase dashboard, then:

```bash
export SUPABASE_ACCESS_TOKEN="<personal-access-token>"
supabase link --project-ref <project-ref>
supabase db push
```

The project ref is in your Supabase dashboard URL:
`https://supabase.com/dashboard/project/<project-ref>`

For runtime writes, create `.env`:

```bash
cp .env.example .env
```

Fill in:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<service_role secret key>
SECRET_KEY=<random local session secret>
```

Use the service-role key only for local backend/server-side testing. Do not put
it in frontend env files or commit it.

### 5. msgvault and local vector search

Install msgvault:

```bash
curl -fsSL https://msgvault.io/install.sh | bash
```

Install Ollama and pull the embedding model:

```bash
brew install ollama
ollama serve
ollama pull nomic-embed-text
```

Configure msgvault at `~/.msgvault/config.toml`:

```toml
[data]
data_dir = "/Users/<you>/.msgvault"
database_url = "/Users/<you>/.msgvault/msgvault.db"

[oauth]
client_secrets = "/absolute/path/to/email-travel-parser/credentials.json"

[sync]
rate_limit_qps = 5

[vector]
enabled = true
backend = "sqlite-vec"

[vector.embeddings]
endpoint = "http://localhost:11434/v1"
model = "nomic-embed-text"
dimension = 768
batch_size = 8
max_input_chars = 4000
```

Initialize msgvault and authorize Gmail:

```bash
msgvault init-db
msgvault add-account you@example.com
```

For a fast local test, sync only recent mail:

```bash
msgvault sync-full you@example.com --query "newer_than:365d" --limit 100
```

Build the local vector index:

```bash
msgvault build-embeddings --full-rebuild --yes
```

Verify keyword and hybrid search:

```bash
msgvault search "booking" --json --limit 10
msgvault search "cooking classes wine tasting architecture walks boutique hotels" \
  --mode hybrid --json --limit 8 --explain
```

msgvault stores Gmail locally in `~/.msgvault/msgvault.db` and vectors locally in
`~/.msgvault/vectors.db`.

Write a smoke-test profile to Supabase from msgvault hybrid results:

```bash
export MSGVAULT_ACCOUNT="you@example.com"
venv/bin/python scripts/msgvault_smoke_profile.py
```

The smoke script writes:

- `msgvault_sources`
- `msgvault_profile_runs`
- `msgvault_message_evidence`
- `user_taste_profiles`

It intentionally uses the existing keyword detector, not Claude. Its purpose is
to prove local msgvault search and Supabase persistence before the production
Claude extraction bridge is added.

## Running

```bash
make start
```

Open `http://localhost:8042`, click **Connect Gmail** and sign in with the Gmail account you added as a test user.

After scanning, confirm Supabase received normalized parser data:

```sql
select count(*) from users;
select count(*) from emails;
select count(*) from travels;
select count(*) from user_preferences;
```

## msgvault Smoke-Test Acceptance

A local msgvault smoke test is passing when:

```bash
msgvault stats
msgvault search "booking" --json --limit 10
msgvault search "food tours museums cooking classes" --mode hybrid --json --limit 8
```

show synced messages and semantically relevant travel results.

The Supabase msgvault tables used by the smoke/profile pipeline are:

- `msgvault_sources`: local msgvault account/archive metadata.
- `msgvault_profile_runs`: one row per search/extraction run.
- `msgvault_message_evidence`: top msgvault search hits used as evidence.
- `user_taste_profiles`: compact profile text/json plus optional embedding.
- `user_preference_evidence`: links normalized preferences back to evidence.

Check them with:

```sql
select count(*) from msgvault_sources;
select count(*) from msgvault_profile_runs;
select count(*) from msgvault_message_evidence;
select count(*) from user_taste_profiles;
```

Current caveat: the committed `user_taste_profiles.embedding` column is
`vector(1536)`, while the local Ollama `nomic-embed-text` model produces
768-dimensional vectors. Use a 1536-dimensional profile embedding provider for
that final Supabase column, or update the migration before production use.

## Commands

```bash
make install   # Install Python dependencies
make start     # Start the server (port 8042, hot reload)
make migrate   # Link Supabase and push migrations
```

## Project structure

```
api/               FastAPI routes (auth, scan, preferences)
gmail/             Gmail API client (auth, fetcher, parser)
detection/         Keyword config, activity signals, profile builder
observability/     Logging setup
templates/         Jinja2 HTML templates
supabase/          Database migrations
data/              Custom categories (written at runtime)
```

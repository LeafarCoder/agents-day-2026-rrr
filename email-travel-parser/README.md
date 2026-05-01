# Email Travel Parser

Scans Gmail booking/confirmation emails from known travel brands and builds a structured travel preference profile in Supabase.

The local demo has two paths:

- Gmail API scanner: parses Gmail messages and writes normalized rows.
- msgvault smoke path: msgvault local archive + hybrid semantic search + Supabase taste-profile evidence tables.

## Setup

### 1) Python

```bash
brew install pyenv
pyenv install 3.12.3
pyenv local 3.12.3
```

### 2) Dependencies

```bash
make install
```

### 3) Gmail OAuth credentials

1. In Google Cloud Console, enable Gmail API.
2. Create OAuth client (Web app).
3. Set redirect URI: `http://localhost:8042/oauth/callback`
4. Download JSON to `credentials.json` in this folder.
5. Add your Gmail as a test user.
6. Add scope `gmail.readonly`.

### 4) Supabase

Runtime writes use `.env`:

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<service_role secret key>
SECRET_KEY=<local session secret>
```

For CLI migrations:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

### 5) msgvault + embeddings

```bash
curl -fsSL https://msgvault.io/install.sh | bash
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

Domain-filtered demo sync (provider domains only, excludes private mail by
domain):

```bash
venv/bin/python scripts/msgvault_domain_sync.py \
  --account email.travel.parser@gmail.com \
  --after 2025-01-01
```

Show discovered domains without syncing:

```bash
venv/bin/python scripts/msgvault_domain_sync.py --report-only
```

Verify keyword and hybrid search:

```bash
msgvault search "booking" --json --limit 10
msgvault search "cooking classes wine tasting architecture walks boutique hotels" \
  --mode hybrid --json --limit 8 --explain
```

msgvault stores Gmail locally in `~/.msgvault/msgvault.db` and vectors locally in
`~/.msgvault/vectors.db`.

Start the msgvault MCP server (for any MCP-capable LLM client):

```bash
msgvault mcp
```

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

Open `http://localhost:8042`.

## Full End-to-End Test (msgvault + Supabase)

1) Full local archive sync:

```bash
msgvault sync-full email.travel.parser@gmail.com
```

2) Verify hybrid semantic retrieval:

```bash
msgvault search "travel preferences food tour museum flight hotel" \
  --account email.travel.parser@gmail.com --mode hybrid --json --limit 8 --explain
```

3) Run one full Gmail -> Supabase ingestion pass (whole inbox):

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_KEY="<service_role_key>" \
GMAIL_QUERY_OVERRIDE="" \
PYTHONPATH=. \
venv/bin/python scripts/run_scan_once.py \
  --token-file seed_token.json \
  --user-email email.travel.parser@gmail.com
```

4) MCP for LLM teams:

```json
{
  "mcpServers": {
    "msgvault": {
      "command": "msgvault",
      "args": ["mcp"]
    }
  }
}
```

Compatibility note: writer supports both:

- `user_preferences(preference_id)`
- `user_preferences(activity_keyword_id)`

## Commands

```bash
make install   # install deps
make start     # run API
make migrate   # supabase db push
```

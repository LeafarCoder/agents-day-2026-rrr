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

Configure `~/.msgvault/config.toml` with your local `data_dir`, `database_url`, `client_secrets`, and vector embedding endpoint.

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

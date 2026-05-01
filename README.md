# B Planner

**Your Plan B, in 10 seconds.**

GPS-triggered, preference-driven micro-itinerary builder for spontaneous travelers. Tap once, watch a 5-node LangGraph pipeline search Viator's live inventory and assemble a personalized 2–3 stop afternoon plan — with affiliate deep links to book immediately.

Built for **Agents Day 2026** · Target sponsor: **Viator Travel Tech Challenge**

---

## Architecture

```
frontend/   Next.js → Cloudflare Pages
backend/    FastAPI → Railway  (LangGraph pipeline + Viator API client)
supabase/   Migrations for user_preferences, runs, viator_fixtures tables
email-travel-parser/  Gmail parser + msgvault taste-profile smoke tests
```

### 5-node LangGraph pipeline

```
GPS coords
  │
  ▼
[1] context_resolver   — Nominatim reverse geocode → city + Viator destination ID
  │
  ▼
[2] profile_loader     — Supabase user_preferences → preference categories → Viator tag IDs
  │
  ▼
[3] viator_searcher    — POST /products/search (location + tags) → top 15 results
  │
  ▼
[4] availability_checker — POST /availability/check on top 8 → filter to available slots
  │
  ▼
[5] itinerary_assembler  — score × rank → 2-3 stop plan + serendipity pick + LLM descriptions
  │
  ▼
Itinerary JSON (affiliate links included from Viator API response)
```

---

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com) and run the migration:

```sql
-- paste contents of supabase/migrations/001_initial.sql into the SQL editor
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# fill in VIATOR_API_KEY, OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Test with `curl http://localhost:8000/healthz`.

### 3. Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL

npm run dev
```

Frontend runs at `http://localhost:3000`.

### 4. Email Taste Profile Smoke Test

The `email-travel-parser/` app can scan Gmail booking emails into Supabase and
can smoke-test the planned msgvault profile pipeline locally:

```text
Gmail API -> msgvault local SQLite archive -> Ollama embeddings ->
msgvault hybrid search -> Supabase taste profile/evidence tables
```

See [email-travel-parser/README.md](email-travel-parser/README.md) for the
Supabase, Gmail OAuth, msgvault, and Ollama setup commands.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `VIATOR_API_KEY` | Viator affiliate sandbox API key |
| `OPENROUTER_API_KEY` | OpenRouter API key (used for LLM nodes) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key (server-side only) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | Backend URL (e.g. `https://bplanner.railway.app`) |

---

## Fallback mode

If the Viator sandbox API returns fewer than 3 results or times out, the backend automatically serves a pre-built Lisbon fixture with 5 realistic products. A Supabase-cached copy of the last good API response is tried first; the in-memory fixture is the final fallback. The UI is identical — no error state shown.

---

## Deployment

**Backend (Railway):** connect the `backend/` directory, set env vars, Railway auto-detects the Dockerfile.

**Frontend (Cloudflare Pages):** connect the `frontend/` directory, set env vars, build command `npm run build`, output directory `.next`.

---

## Demo

1. Open the app → set preferences (or skip to use defaults: food, history, walking)
2. Tap **Get My Plan** → allow location (or tap **Use Lisbon (demo)**)
3. Watch 5 pipeline nodes light up in real time
4. Tap **Book on Viator →** on any card → affiliate handoff fires

Full happy path: **≤ 15 seconds** from tap to itinerary.

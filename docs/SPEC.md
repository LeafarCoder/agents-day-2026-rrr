# Spec — B Planner

**Date:** 2026-04-30 | **Hard deadline:** 17:00 | **Target sponsor:** Viator

---

## Problem & user

Spontaneous travelers already in an unfamiliar city have no way to quickly discover and act on local experiences that match their taste and are actually available right now — existing tools require search, browsing, and cross-checking before anything happens. B Planner resolves that moment in a single tap: GPS fires, the agent builds a personalized afternoon plan from live Viator inventory, and the user is walking toward their first stop within 10 seconds.

---

## Demo script (90 sec)

| Time | What the screen shows |
|------|-----------------------|
| 0–15s | App opens on preference onboarding (first launch). Demonstrator checks "Food & Drink", "History & Culture", "Walking Tours". Taps "Save & Explore." |
| 15–50s | Main screen: location banner reads "Alfama, Lisbon." Large "Get My Plan" button. Tap it — 5 pipeline nodes light up one by one: "Resolving your neighborhood…" → "Loading your preferences…" → "Searching 800+ Viator experiences…" → "Checking what's available in the next 4 hours…" → "Building your afternoon plan…" |
| 50–75s | Itinerary card snaps in: 2 main stops (Fado walking tour — starts in 35 min, 200 m, €28 / Portuguese wine tasting — 2 h from now, 800 m, €45) + 1 serendipity card ("Outside your usual picks: rooftop cocktail class, 4.8★, starting soon"). Walk time between each stop shown. |
| 75–90s | Demonstrator taps "Book on Viator" on the first card — Viator checkout opens for that exact experience. Affiliate link fires. Done. |

---

## MVP features

1. **5-node LangGraph pipeline** — fires on tap: (1) GPS→neighborhood, (2) preference profile load, (3) Viator `/products/search`, (4) `/availability/check`, (5) score + assemble itinerary with affiliate links
2. **Preference onboarding screen** — 8-category checkbox tiles on first launch, stored in Supabase by session ID
3. **Real-time pipeline progress UI** — Next.js polls `GET /api/runs/{id}` and renders each node status badge as it fires
4. **Micro-itinerary card output** — 2–3 stop plan with experience name, start time, distance, price, walk time to next stop, and "Book on Viator" affiliate deep link per card
5. **Fixture fallback mode** — FastAPI auto-serves a cached Lisbon sandbox response if live Viator API returns <3 results or times out (no error state shown to user)

---

## Stack mapping

| Feature | Component |
|---------|-----------|
| 5-node LangGraph pipeline | FastAPI → Railway (orchestration host) + LangGraph `StateGraph` + OpenRouter (LLM calls in nodes 1, 2, 5) |
| Preference onboarding screen | Next.js App Router → Cloudflare Pages + Supabase (`user_preferences` table, anon key, RLS by session_id) |
| Real-time pipeline progress UI | Next.js App Router → Cloudflare Pages (polling `GET /api/runs/{id}`, renders `steps[]` array) |
| Micro-itinerary card output | Next.js App Router → Cloudflare Pages (reads `result` from run record) |
| Fixture fallback mode | FastAPI → Railway (try/except around Viator call; fallback reads `viator_fixtures` table via Supabase service-role key) |

---

## NOT doing

- **User accounts / auth / login** — preferences keyed by `session_id` in localStorage; no signup wall
- **Booking / checkout** — affiliate-only; user taps to Viator, we never handle payment or reservation
- **`/bookings/*` endpoints** (hold, book) — explicitly excluded by Viator challenge rules
- **Map view / turn-by-turn navigation** — no Mapbox or Google Maps integration; walk times shown as plain text estimates
- **Multi-day or multi-city trip planning** — one afternoon plan for the user's current location only
- **Push notifications / background location polling** — no native app shell; not demoable live
- **Reviews, ratings, or user-generated content** — no UGC layer of any kind
- **Advanced search filters** (price slider, duration picker, category exclusions) — preference tiles at onboarding are the only personalization surface
- **Saving or bookmarking past plans** — no history; plans are ephemeral per session
- **Social sharing** — no "send plan to a friend" feature

---

## Sponsor challenge target

**Viator** — criterion: *"A Destination Now Geo-App: A location-aware mobile app that uses the `/attractions/{attraction-id}` endpoint to suggest nearby attractions and provides deep links so users can buy tickets immediately on their phones while walking up."*
Our demo satisfies this by: using live GPS to trigger a 5-node agentic pipeline that calls `/products/search` (location + preference tags), `/availability/check` (real-time slot verification), and `/attractions/{id}` (serendipity card detail), then renders each result as a card with a direct Viator affiliate deep link — the user taps and books in under 2 taps, on a phone, while walking.

---

## Definition of done (verify by 16:30)

- [ ] Cloudflare Pages preview URL returns 200 and the preference onboarding screen loads in a browser resized to 375 px width
- [ ] Tapping "Get My Plan" with a mocked Lisbon GPS coordinate fires the pipeline and all 5 node status badges appear in the UI within 15 seconds
- [ ] The itinerary output shows ≥ 2 experience cards, each with a "Book on Viator" link that opens the correct Viator product page in a new tab
- [ ] Removing the Viator API key from `.env` still produces a full itinerary result (fixture fallback active, no error state visible)
- [ ] `GET /healthz` on the Railway backend returns 200 after the Next.js layout pre-warm call on page load

---

## Data model

| Table | Key columns | RLS |
|-------|-------------|-----|
| `user_preferences` | `id`, `session_id` (text), `categories` (jsonb), `created_at` | Enabled — anon can insert/select/update rows where `session_id = current_setting('app.session_id')` |
| `runs` | `id`, `session_id` (text), `status` (text), `steps` (jsonb), `result` (jsonb), `created_at` | Enabled — anon can insert/select rows where `session_id` matches |
| `viator_fixtures` | `id`, `city_slug` (text), `response_json` (jsonb), `cached_at` | Disabled — service-role only (FastAPI reads, never exposed to browser) |

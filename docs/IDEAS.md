# Ideas

## How might we…

Help spontaneous travelers who are already in an unfamiliar city turn an unplanned moment into an immediately bookable, personalized local experience — without requiring any advance research or decision fatigue?

---

## Variants

| # | Summary | Agentic? | Sponsor hit? | Buildable? | Demoable? | Keep? |
|---|---------|----------|--------------|------------|-----------|-------|
| 1 | **Proactive Push** — agent monitors location and interrupts with time-sensitive picks ("food tour starts 200m away in 8 min") | ✓ | ✓ | ✗ background location + push risky in 6h | ✗ hard to demo live | ✗ |
| 2 | **AR Overlay** — live camera labels nearby venues with floating Viator experience cards | ✗ | ✓ wow | ✗ WebAR too complex | ✓ | ✗ |
| 3 | **One-Tap Oracle** — GPS fires, agent decides ONE best experience right now, shows single card with "Let's go → Viator" | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4 | **NL Query Concierge** — user types "something cultural, under €40, next 2 hours"; agent parses intent, queries Viator, returns top 3 with reasoning | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 | **Agentic Micro-Itinerary** — 6-node LangGraph pipeline: GPS resolve → preference lookup → Viator search → availability check → fit scoring → 2-3 stop plan with walk times + affiliate links | ✓✓ most agentic | ✓✓ direct sponsor match | ✓ | ✓ | ✓ |
| 6 | **Serendipity Layer** — agent adds one pick *outside* the user's comfort zone to any plan, explains why ("you hike, but this rooftop cocktail class starts in 15 min") | ✓ | ✓ | ✓ | ✓ | ✓ (layer-on) |
| 7 | **NL + Itinerary Hybrid** — conversational intake replaces the preference profile; user describes mood/constraints in one message, agent builds the itinerary from that context | ✓✓ | ✓✓ | ✓ | ✓ | ✓ |

Dropped: #1 (background push + live notification impossible to demo convincingly), #2 (WebAR not buildable in 6h on fixed stack).

---

## Finalist directions

### Direction A — Agentic Micro-Itinerary (GPS-triggered, profile-driven)

The user taps once. A LangGraph pipeline fires with 6 nodes: (1) resolve GPS coordinates to city + neighborhood via geocoding, (2) pull user preference profile from Supabase, (3) call Viator `/products/search` filtered by location + preference tags, (4) call `/availability/check` for the top candidates in the next 4 hours, (5) score results by (preference match × proximity × price fit × availability slot count), (6) assemble a 2–3 stop micro-itinerary with estimated walk times between stops and a Viator affiliate link per experience. The serendipity pick (#6) is added as a bonus card at the end. The UI renders each node firing in real time — the user watches the agent think, then gets a full afternoon plan. On-boarding: a 60-second preference setup screen (checkbox tiles for 8 categories) shown on first launch, stored in Supabase.

**For:** Maximum agentic value — 6 autonomous decisions, none replicable by a single API call or script. Maps directly onto the fixed stack: LangGraph = orchestration, FastAPI = pipeline backend, Supabase = user profile, Next.js = streaming node-by-node UI, Cloudflare Pages = hosting. Hits the Viator challenge's "Destination Now Geo-App" example explicitly and elevates it. Demo story is instant: "I tapped once, the agent checked my preferences and what's available right now nearby, and gave me a plan for the afternoon." Under 90 seconds end-to-end.

**Risk:** Depends on Viator sandbox data density — if the test environment has sparse products for the demo location, the plan output looks thin. Mitigation: pick a major city (Lisbon/London/NYC) as the demo location and verify product coverage with the Viator mentor before committing.

### Direction B — Conversational Discovery Agent (NL-driven, no pre-set profile)

There is no preference profile. Instead, the user opens the app and types one message: "I have 3 hours, I'm near the waterfront, I want something I can do solo under €50." A LangGraph agent parses intent (extracting constraints: duration, location context, solo, budget), queries Viator `/products/search` with inferred tags, checks `/availability/check`, and returns a ranked shortlist of 3 experiences with a one-sentence rationale per result and direct affiliate links. Follow-up turns refine the results ("make it more active", "earlier start time"). The preference profile is implicitly built from the conversation and optionally saved to Supabase for next time.

**For:** Conversational UX has zero onboarding friction — no setup screen, no checkboxes. The NL intake is a stronger differentiator from a plain search widget. Follow-up refinement demonstrates multi-turn agent reasoning (strong agentic signal). Works for first-time users with no profile.

**Risk:** Chat interfaces are table stakes at hackathons — "another chatbot" is the judges' first reaction. The agentic pipeline is less visible (reasoning happens inside the conversation, not as explicit UI nodes). Without a profile, the personalization story is weaker. If the LLM misparses a constraint (e.g., misreads budget), the results can look wrong with no easy recovery.

---

## Recommendation

**Chosen direction:** Direction A — Agentic Micro-Itinerary
**Rationale:** The visible 6-node LangGraph pipeline is the strongest demo hook for a crowd judging on "agent value" — the user watches the agent work in real time, which chatbots can't show — and it maps to the fixed stack with zero infra additions, minimizing integration risk on the day. Direction B's conversational refinement can be offered as a stretch feature (add a "refine this plan" chat input below the itinerary) without restructuring the core pipeline.

---

<!-- hack-grill appends the section below -->

## Risks & Assumptions

| # | Question | Answer | Risk level |
|---|----------|--------|------------|
| Q1 | Clap moment | UI renders 6 pipeline nodes lighting up in real time — GPS resolves to "Alfama, Lisbon" → preferences load → products fetched → availability checked → scored → 3-stop itinerary with walk times snaps into view in ~10 seconds from a single tap | — |
| Q2 | Autonomy line | **Autonomous (6):** GPS→neighborhood resolution; preference category→Viator tag mapping; filtering which products to availability-check; weighted scoring (preference × proximity × slots × price); itinerary ordering; serendipity pick trigger. **Hardcoded (2):** 8 onboarding category tiles; card UI layout + affiliate link format | Low |
| Q3 | Killshot risk + mitigation | **Risk:** Viator sandbox has sparse product data for the demo city → itinerary looks broken. **Mitigation:** test `/products/search` for Lisbon/London/NYC before noon; pick the densest city; cache that response as a JSON fixture; auto-serve fixture if live call returns <3 results or times out. Secondary risk: OpenRouter latency → use Haiku for ranking node, larger model only for final text | Med |
| Q4 | Sponsor criterion + coverage | Target: Viator Travel Tech Challenge. Quoted criterion: "A Destination Now Geo-App… location-aware… suggest nearby attractions… deep links so users can buy tickets immediately on their phones while walking up." Coverage: uses `/products/search` + `/availability/check` + `/attractions/{id}` (serendipity card) + affiliate deep links per card. All three evaluation axes (Creativity, Technical Integration, Real-World Applicability) directly addressed | Low |
| Q5 | Fallback plan | 3-layer: (1) FastAPI auto-serves cached sandbox fixture if live Viator call fails/times out — UI renders identically; (2) static fixture bundled into Next.js frontend if backend unreachable; (3) pre-recorded 90-second screen recording of happy path as last resort. No manual intervention needed on stage | Low |

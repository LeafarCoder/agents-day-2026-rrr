# Demo Pitch: Travel DNA

## One-Line Pitch

We turn your real travel history into a personalized AI profile that can plan trips around what you actually do, not what you clicked in an onboarding quiz.

## What We Can Truthfully Demo Today

The repo currently contains two connected product ideas:

1. **Email Travel Parser**: a Gmail + msgvault workflow that scans travel-related emails, extracts destinations and activity signals, writes normalized travel preferences to Supabase, and can generate an LLM-backed embedded taste profile.
2. **B Planner**: a separate Viator planning prototype that runs a 5-node LangGraph pipeline, searches Viator inventory, checks availability, scores products, and assembles a short itinerary.

The important technical caveat: these two pieces are not fully wired together yet. The planner currently reads manual/session preferences from its own `user_preferences` table shape, while the email parser writes a richer user profile into the email-parser schema. For the demo, position the bridge from email-derived taste profile to Viator planner as the next integration step unless it is implemented before presenting.

## Recommended Demo Narrative

### 1. Hook

Every travel app asks the same weak question: "What do you like?"

Food, museums, adventure, nightlife. Most people click a few boxes and move on. But that data is shallow, static, and usually wrong.

The better answer is already sitting in your inbox. Years of bookings, confirmations, tours, stays, tickets, trains, flights, and receipts tell a much clearer story about how you actually travel.

### 2. Problem

Travel personalization is usually built on weak signals:

- Manual preference onboarding is generic and quickly becomes stale.
- Social or behavioral tracking is noisy, invasive, and not travel-specific.
- Search engines recommend what is popular nearby, not what fits the traveler.

There is no common layer that turns confirmed travel behavior into a durable, high-signal taste profile.

### 3. Solution

We built a travel preference inference engine.

The user connects Gmail, chooses a timeframe, and the system extracts travel evidence from their booking history. It detects where they have been, what platforms they use, and what kinds of experiences show up repeatedly: food tours, architecture walks, train travel, boutique stays, surf lessons, wine tastings, museums, nightlife, and more.

That becomes a structured "Travel DNA" profile: categories, keywords, counts, confidence, evidence, and an embedding that can be used by downstream planning agents.

### 4. Demo Story

Use a concrete traveler:

Adrien has ten years of travel confirmations in Gmail. He has booked cooking classes in Vietnam, surf lessons in Portugal, boutique stays in Spain, wine tastings in France, and architecture walks in Italy.

Without asking Adrien to fill out a survey, the system infers:

- Strong preference for food and culinary experiences
- Repeated interest in culture, history, and architecture
- Comfort with active outdoor experiences
- Preference for small, specific activities over generic sightseeing
- Evidence-backed destination history and travel frequency

Then we show the planning vision:

Adrien says: "I'm in Rome next weekend for five days."

Instead of a generic "Top 10 Rome" list, the planning agent should use his Travel DNA to propose things like a pasta workshop, a market tour, an early-entry small-group Vatican visit, and a sunset food walk, while avoiding irrelevant generic bus-tour recommendations.

## Technical Workflow

### Current Gmail API Scanner

This is the app-visible scan flow in `email-travel-parser`:

1. User authenticates with Gmail using OAuth and the `gmail.readonly` scope.
2. The frontend starts `/scan/stream` with a selected date range.
3. The backend builds a Gmail search query from known travel provider domains and confirmation keywords.
4. Gmail message metadata is fetched first: sender, subject, and date.
5. The parser keeps likely travel confirmations by sender domain or subject pattern.
6. If the destination is not visible in the subject, the backend fetches the email body and extracts text.
7. Regex and keyword detectors identify destination, activity categories, and canonical keyword hits.
8. A deterministic profile builder counts destinations, platforms, activity categories, keywords, and trips by year.
9. Supabase stores users, emails, inferred travels, countries, cities, and keyword-level `user_preferences`.
10. The frontend displays email count, countries visited, activity preferences, keyword counts, and scan results.

This path is deterministic. It does not rely on an LLM for the default scan UI.

### Current msgvault + LLM Taste Profile Pipeline

The richer agentic profile pipeline is implemented in `email-travel-parser/scripts/run_taste_profile.py` and exposed through `/api/profile/build`.

1. `msgvault` syncs Gmail locally and builds local vector search over the mailbox.
2. The pipeline runs multiple hybrid searches for high-signal travel evidence, such as food tours, culture, outdoor activities, accommodation, and nightlife.
3. For each result, it fetches message details from msgvault and stores evidence metadata.
4. The LLM extraction step sends subjects and snippets to MiniMax through OpenRouter and asks for strict JSON:
   - `taste_summary`
   - `top_categories`
   - `preferences`
   - category names
   - keywords
   - confidence
   - evidence count
5. The system embeds the taste summary locally with Ollama `nomic-embed-text`.
6. Supabase stores:
   - `msgvault_sources`
   - `msgvault_profile_runs`
   - `msgvault_message_evidence`
   - normalized `user_preferences`
   - `user_preference_evidence`
   - `user_taste_profiles` with a 768-dimensional pgvector embedding

This is the best version of the "agentic differentiation" story: retrieval, reasoning, representation, memory, and downstream planning.

### Current Viator Planner Prototype

The planner prototype lives in the root `backend` and `frontend` folders.

It runs a 5-node LangGraph pipeline:

1. **Context resolver**: reverse-geocodes latitude and longitude into city and neighborhood.
2. **Profile loader**: loads preference categories from a session-based Supabase table.
3. **Viator searcher**: searches Viator products using destination and category tag mappings.
4. **Availability checker**: checks available slots for top candidate products.
5. **Itinerary assembler**: scores available products, selects main stops, adds a serendipity pick, and uses an LLM to generate short "why you'll love this" explanations.

This planner is agentic today, but it is not yet consuming the Gmail-derived `user_taste_profiles` table.

## Corrected Agentic Story

Use this version in the pitch:

This is not just a recommender. It is a multi-step agent system with memory.

1. **Retrieval layer**
   - Current: Gmail API scanner retrieves likely travel confirmations by provider domains and subject keywords.
   - Current richer path: msgvault hybrid search retrieves high-signal evidence emails from a local archive.

2. **Reasoning layer**
   - Current scanner: deterministic keyword and regex inference.
   - Current richer path: MiniMax extracts structured preferences from email evidence as JSON.

3. **Representation layer**
   - Current richer path: the taste summary is embedded with local Ollama `nomic-embed-text`.
   - Stored vector size is 768 dimensions after the latest migration.

4. **Memory layer**
   - Supabase stores normalized preferences, evidence rows, profile runs, and embedded taste profiles.
   - The system keeps provenance: preferences can be tied back to the evidence emails that generated them.

5. **Planning layer**
   - Current separate prototype: B Planner uses LangGraph and Viator inventory to assemble available experiences.
   - Planned bridge: replace manual/session preferences with the Gmail-derived taste profile and use it to drive search, scoring, filtering, and itinerary explanations.

## Accuracy Notes For The Existing Pitch

The original pitch is directionally strong, but a few technical details need correction:

- "Claude extracts structured preferences" is no longer the exact implementation. The current code calls MiniMax M1 through OpenRouter for extraction. Some migration comments still mention Claude.
- The embedded profile currently uses Ollama `nomic-embed-text` with 768 dimensions, not a 1536-dimensional embedding model. The latest migration updates the schema to 768.
- The app does have a hybrid search story through msgvault, but the default visible scan UI uses Gmail API search plus deterministic parsing.
- The planner agent exists, but it currently loads session preferences from the planner schema, not the Gmail-derived taste profile.
- The privacy story should be precise: msgvault keeps the full mailbox and vectors local, while Supabase stores profile data, evidence metadata/snippets, preferences, and embeddings. Do not say absolutely "email bodies never leave your device" for every path unless the demo configuration enforces that.

## Demo Structure

### 5-7 Minute Version

1. **Hook, 45 seconds**
   - "Every travel app asks what you like. But you already answered that across years of real bookings."

2. **Problem, 60 seconds**
   - Manual onboarding is shallow.
   - Tracking is invasive and noisy.
   - Generic travel recommendations ignore actual travel history.

3. **Product Demo, 2 minutes**
   - Connect Gmail.
   - Choose date range.
   - Run scan.
   - Show countries, trips, preference categories, and evidence-backed keyword counts.

4. **Agentic Differentiation, 90 seconds**
   - Retrieval: Gmail/msgvault evidence selection.
   - Reasoning: deterministic parser plus LLM structured extraction.
   - Representation: embedded taste profile.
   - Memory: Supabase tables with evidence and profile runs.
   - Planning: Viator LangGraph prototype, with the Gmail profile bridge as the obvious next step.

5. **Vision, 60 seconds**
   - Your past trips should plan your next one.
   - The same memory layer can power restaurants, events, accommodation, and local experiences.

## Demo Talk Track

"Every travel app asks me to self-report my taste. But my inbox already knows how I travel.

Here I connect Gmail with read-only access and choose the timeframe I want to analyze. The system searches for travel confirmations, parses the booking evidence, extracts destinations and activity signals, and builds a profile from actual behavior.

Now we can see the output: countries visited, confirmed bookings, travel platforms, and repeated preference signals like food tours, museums, trains, boutique stays, or outdoor activities.

The more agentic path uses msgvault as a local Gmail archive and retrieval engine. It performs hybrid search over the mailbox, selects high-signal evidence, asks an LLM for structured preference extraction, embeds the resulting taste summary, and stores the profile with evidence in Supabase.

That profile is the missing memory layer for planning. Our Viator planner already shows the downstream agent pattern: resolve location, load preferences, search inventory, check availability, and assemble an itinerary. The next integration is to replace generic onboarding preferences with this Travel DNA profile.

So the product is not just a travel chatbot. It is a preference inference engine plus a planning agent. Your past trips should plan your next one."

## Suggested Architecture Slide

```text
Gmail / msgvault
    ↓
Evidence retrieval
    - Gmail query by domain + subject
    - msgvault hybrid search for semantic evidence
    ↓
Preference inference
    - deterministic parser for demo UI
    - LLM structured extraction for richer profile
    ↓
Travel DNA memory
    - Supabase users, travels, emails
    - user_preferences
    - msgvault evidence
    - user_taste_profiles + pgvector embedding
    ↓
Planning agent
    - location context
    - profile loading
    - Viator product search
    - availability checks
    - itinerary assembly
```

## Privacy Framing

Say:

"The user consents, chooses the timeframe, and can disconnect. For the msgvault path, the mailbox archive and mailbox vectors stay local. The cloud database stores the derived travel profile, normalized preferences, and evidence metadata needed for transparency."

Avoid saying:

"We scrape your entire inbox" or "we store all your email." The architecture is designed around selected evidence and derived profile memory.

## Strong Closing

We believe the missing layer in travel is not another generic recommender. It is memory: a trusted, evidence-backed understanding of how someone actually travels.

Your past trips should plan your next one.


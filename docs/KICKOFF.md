# Hackathon Kickoff Log

**Date:** 2026-04-30
**Started at:** practice run
**Hard deadline:** 17:00

---

## Team

| Name | Strongest skill |
|------|----------------|
| Rafael | Full-stack (equal collaboration) |
| Ragha | Full-stack (equal collaboration) |
| Robert | Full-stack (equal collaboration) |

## Infra keys

- [x] OpenRouter
- [x] Supabase
- [x] Railway
- [x] Cloudflare Pages
- [x] talent.app login

## Sponsor challenges

**Viator Travel Tech Challenge** — Build an innovative application, AI agent, or platform that integrates with the Viator Partner API to enhance the way travelers discover, plan, and organize tours, activities, and attractions. Affiliate model only (no /bookings/* endpoints). Focus on discovery, curation, and planning. Prizes: $500 Viator coupon for Technical Excellence and $500 for Most Impactful.

## Seed idea(s)

**B Planner** — a location-aware app for travelers who are already in a city with no plan. You open the app while walking down the street; it knows your GPS location and uses the Viator Partner API to surface nearby bookable experiences in real time. On first launch you set up a preference profile (hiking, food tasting, art, etc.) so the app already knows your taste when it curates the feed. The output is a short, actionable "Plan B" you can act on immediately — tap an experience and go straight to Viator to book.

---

## Decision log

<!-- Append one line after each phase. Format: "Phase N (Label): <decision>" -->

- Phase 1 (Ideate): Chose Direction A — Agentic Micro-Itinerary (6-node LangGraph pipeline, GPS-triggered, preference-driven, 2-3 stop afternoon plan with Viator affiliate links)
- Phase 2 (Grill): Passed all 5 questions — no fatal flaws. Main risk is Viator sandbox data density; mitigated by fixture fallback + city pre-check before noon
- Phase 3 (Spec): Approved — 5 MVP features, 10 NOT-DOING items, 5 definition-of-done conditions. docs/SPEC.md written.

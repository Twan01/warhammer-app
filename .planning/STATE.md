---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Full Circle
status: Roadmap created — v2.1 still in progress (Phases 14–16)
stopped_at: v2.2 roadmap written (Phases 17–22); v2.1 continuing with Phase 14 plan 14-04
last_updated: "2026-05-04T00:00:00.000Z"
last_activity: 2026-05-04 — v2.2 roadmap created (Phases 17–22, 23 requirements mapped)
progress:
  total_phases: 13
  completed_phases: 9
  total_plans: 35
  completed_plans: 22
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04 after v2.2 milestone start)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.1 finishing (Phases 14–16) then v2.2 Full Circle (Phases 17–22)

## Current Position

Phase: 14 of 22 (Spending Tracker — 4/5 plans complete)
Plan: 14-04 (Manual smoke-test — final gate before Phase 14 ships)
Status: In progress
Last activity: 2026-05-04 — v2.2 roadmap created; resume Phase 14-04 smoke-test

Progress: [████████░░░░░░░░░░░░░░] ~40% (22/35+ plans complete across v1.1+v2.0+v2.1)

## v2.2 Phase Map

| Phase | Goal | Requirements |
|-------|------|--------------|
| 17. Schema Foundation + Enrichment | Migration 007 + dates.ts utility + lore/undercoat UI | ENRCH-01..04 |
| 18. Battle Log | Battle log CRUD page (schema already in migration 001) | BATTLE-01..05 |
| 19. Analytics Core | Velocity + streak on Dashboard + spend chart on Spending page | ANLY-04..07 |
| 20. Wishlist | New wishlist_items table + CRUD page | WISH-01..04 |
| 21. Hobby Goals | New hobby_goals table + progress from session history | ANLY-01..03 |
| 22. Display Features | Battle Ready filter + Showcase Mode fullscreen | DISP-01..03 |

Architecture constraints:
- Phase 17 is prerequisite for ALL v2.2 analytics (dates.ts utility needed by Phases 19 + 21)
- Phase 18 is UI-only — battle_logs table already exists in 001_core_schema.sql; NO migration needed
- Phase 19 requires `npx shadcn@latest add chart` + package.json `react-is ^19.0.0` override
- Phase 22 Showcase Mode uses `getCurrentWindow().setFullscreen(true)` from @tauri-apps/api (already installed)
- All analytics queries go in new `src/db/queries/analytics.ts` with key `["hobby-analytics"]`

## Accumulated Context

### Key Decisions for v2.2

- migration 007 covers: ALTER TABLE units ADD COLUMN lore_notes TEXT, ADD COLUMN undercoat TEXT; ALTER TABLE factions ADD COLUMN lore_notes TEXT; ALTER TABLE paints ADD COLUMN purchase_date TEXT
- wishlist_items table = migration 008; hobby_goals table = migration 009 (append-only discipline)
- ANLY-02 goal progress: COUNT(DISTINCT unit_id) from painting_sessions WHERE session_date falls within goal timeframe
- ANLY-05 streak: consecutive calendar days with at least one painting session — use dates.ts to avoid UTC edge case

### Decisions Carried from v2.1

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- selectedUnitId pattern for any page that opens a detail Sheet
- Migrations are append-only and immutable — new columns always via ALTER TABLE in a new numbered file
- Integer pence discipline (formatCurrency is the only /100 site)

### Tech Debt

- PROJ-02: REQUIREMENTS.md text still says "empty columns hidden" — KanbanBoard ships all 11 columns (approved UX)
- PaintingProjectsPage empty-state CTA uses fragile DOM query — replace with useState pattern

### Pending Todos

None blocking.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-04
Stopped at: v2.2 roadmap written; Phase 14-04 smoke-test is next action in v2.1
Resume: Run `/gsd:execute-phase 14` to run Plan 14-04 (manual smoke-test for Spending Tracker)

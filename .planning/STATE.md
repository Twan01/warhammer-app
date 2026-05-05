---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Full Circle
status: Defining requirements
stopped_at: Completed 21-wishlist-00-PLAN.md
last_updated: "2026-05-05T16:34:13.932Z"
last_activity: 2026-05-05 — Milestone v2.4 started
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 16
  completed_plans: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05 after v2.4 milestone start)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.4 Premium Dashboard UX & Visual Polish — grid layout, premium visuals, richer interactions, photos central, spending intelligence

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-05 — Milestone v2.4 started

## Accumulated Context

### Decisions Carried from v2.3

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- selectedUnitId pattern for any page that opens a detail Sheet
- Migrations are append-only and immutable — new columns always via ALTER TABLE in a new numbered file
- Integer pence discipline (formatCurrency is the only /100 site)
- pnpm is the package manager — npm fails with workspace: protocol errors
- Tailwind v4 CSS-first theming — @theme inline {} block, no tailwind.config.js
- Design tokens: Forge Black, Gunmetal, Panel Elevated, Battle Gold defined in globals.css
- PageHeader shared component on all 9 pages
- StatusBadge 4-tier color system for 11 painting statuses
- Quick Add via QuickAddContext provider with 8-action dropdown

### Tech Debt

- PROJ-02: REQUIREMENTS.md text still says "empty columns hidden" — KanbanBoard ships all 11 columns (approved UX)

### Pending Todos

None blocking.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-05T16:34:13.929Z
Stopped at: Completed 21-wishlist-00-PLAN.md
Resume: Run requirements definition → roadmap creation

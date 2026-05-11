---
gsd_state_version: 1.0
milestone: v0.2.9
milestone_name: Recipes 3.1 / Workflow Semantics & Integrations
status: planning
stopped_at: null
last_updated: "2026-05-11T23:00:00.000Z"
last_activity: "2026-05-11 — Milestone v0.2.9 started"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-11 after v0.2.9 milestone started)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** Defining requirements for v0.2.9

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-11 — Milestone v0.2.9 started

## Performance Metrics

**Velocity:**
- v0.2.8: 12 plans across 5 phases (2 days)
- v0.2.7: 8 plans across 4 phases (single day)
- v0.2.6: 11 plans across 6 phases (single day)
- v0.2.5: 12 plans across 5 phases (single day)

## Accumulated Context

### Decisions Carried Forward

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- Migrations are append-only and immutable — new numbered file per change
- pnpm is the package manager — npm fails with workspace: protocol errors
- Tailwind v4 CSS-first theming — @theme inline {} block, no tailwind.config.js
- Cache invalidation symmetry: if useCreate invalidates a key, useDelete must too
- todayISO() from @/lib/dates is the single source of truth for date defaults
- User data (favorites, notes, detachment selection) MUST go in hobbyforge.db, never rules.db
- ATTACH DATABASE not supported by tauri-plugin-sql — dual-query merge pattern always
- staleTime: Infinity + sync invalidation registration required for every new rules.db hook
- useWahapediaFactionId(faction.name) required for all rules-facing queries
- Page-level Map<compositeKey, T> pattern for annotations — no N+1 hooks
- Sub-component pattern for hooks-in-loop (DetachmentAbilityRow, etc.)

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-11
Stopped at: Defining requirements for v0.2.9
Resume: Define requirements, then create roadmap

---
gsd_state_version: 1.0
milestone: v0.1
milestone_name: milestone
status: planning
stopped_at: Completed 52-01-PLAN.md
last_updated: "2026-05-10T18:06:55.316Z"
last_activity: 2026-05-10 — Roadmap created, 27/27 requirements mapped across 5 phases
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 3
  completed_plans: 1
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-10 after v0.2.8 milestone started)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** Phase 52 — Schema + Data Layer Foundation

## Current Position

Phase: 52 of 56 (Schema + Data Layer Foundation)
Plan: 01 complete (1/3)
Status: In Progress
Last activity: 2026-05-10 — Plan 52-01 complete: migration 019, rules types, detachment columns

Progress: [███░░░░░░░] 33%

## Performance Metrics

**Velocity:**
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
- User data (favorites, notes, detachment selection) MUST go in hobbyforge.db, never rules.db — rules.db is fully deleted on every sync
- ATTACH DATABASE not supported by tauri-plugin-sql — dual-query merge pattern always
- staleTime: Infinity + sync invalidation registration required for every new rules.db hook
- useWahapediaFactionId(faction.name) required for all rules-facing queries — passing integer returns empty array silently
- Game Day checklist state: Zustand persist (localStorage) — move to SQLite only if multi-session resumption is validated
- clearArmyListDetachment is separate from updateArmyList because COALESCE blocks NULL passthrough for explicit detachment clearing (52-01)
- detachment_name is denormalized onto army_lists to survive rules.db full wipe on re-sync (52-01)
- RULE_TYPES const array mirrors SQL CHECK constraint to enforce rule_type union at TypeScript level (52-01)

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-10T18:06:55.313Z
Stopped at: Completed 52-01-PLAN.md
Resume: Run /gsd:plan-phase 52

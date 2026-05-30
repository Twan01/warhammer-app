---
gsd_state_version: 1.0
milestone: v0.4.0
milestone_name: Unit Database — Canonical 40k Data Hub
status: executing
stopped_at: Phase 106 Plan 01 complete — Plan 02 next
last_updated: 2026-05-30T16:30:00.000Z
last_activity: 2026-05-30 -- Phase 106 Plan 01 executed
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 10
  completed_plans: 9
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with reliable backup/restore so local data is always recoverable
**Current focus:** Phase 106 — army list simplification

## Current Position

Phase: 106
Plan: 01 complete, 02 pending
Status: Executing
Last activity: 2026-05-30

Progress: [██████████████████████████] 50%

## Performance Metrics

**Velocity (recent milestones):**

- v0.3.7: 6 plans across 3 phases (single day)
- v0.3.0: 9 plans across 4 phases (single day)
- v0.2.18: 14 plans across 7 phases (2 days)
- v0.2.15: 11 plans across 5 phases (2 days)
- v0.2.14: 11 plans across 5 phases (2 days)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 103 | 3 | - | - |
| 104 | 3 | - | - |

## Accumulated Context

| Phase 103 P01 | 15m | 2 tasks | 4 files |
| Phase 106 P01 | 45m | 2 tasks | 38 files |

### Key Decisions (v0.4.0)

- Phase ordering is non-negotiable: schema and data before UI, UI before FK integration, FK integration before army list simplification, army list simplification before rules.db removal
- rules.db must stay alive through Phases 103–106 — 7+ call sites use getRulesDb(); eliminate only in Phase 107
- FK nullable: units.udb_unit_id uses ON DELETE SET NULL — collection units survive database re-import
- Entity IDs: reuse Wahapedia string IDs for udb_units so existing rules_favorites_notes annotations survive the pivot

### Pending Todos

None.

### Open Blockers

None.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 scope | EXT-01: Leader attachment targets | Deferred | v0.4.0 planning |
| v2 scope | EXT-02: Enhancement data per faction | Deferred | v0.4.0 planning |
| v2 scope | EXT-03: Stratagems in canonical DB | Deferred | v0.4.0 planning |
| v2 scope | ADV-01: Unit comparison view | Deferred | v0.4.0 planning |
| v2 scope | ADV-02: Faction overview page | Deferred | v0.4.0 planning |

## Session Continuity

Last session: 2026-05-30T16:30:00Z
Stopped at: Phase 106 Plan 01 complete — Plan 02 next
Resume file: .planning/phases/106-army-list-simplification/106-02-PLAN.md
Resume: Phase 106 Plan 01 done (FK-based points + syncedUnitPoints deletion). Next: Plan 02.

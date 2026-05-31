---
gsd_state_version: 1.0
milestone: v0.4.0
milestone_name: Unit Database — Canonical 40k Data Hub
status: executing
stopped_at: Phase 107 planned
last_updated: "2026-05-31T09:50:58.550Z"
last_activity: 2026-05-30
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 12
  completed_plans: 12
  percent: 83
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with reliable backup/restore so local data is always recoverable
**Current focus:** Phase 107 — cleanup & pipeline (rules.db elimination)

## Current Position

Phase: 107 (cleanup-pipeline)
Plan: 01 of 02 complete
Status: Executing
Last activity: 2026-05-31

Progress: [████████████████████████████████████████████] 83%

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
| Phase 106 P02 | 5m | 2 tasks | 3 files |
| Phase 107 P01 | ~3h | 2 tasks | 96 files |

### Key Decisions (v0.4.0)

- Phase ordering is non-negotiable: schema and data before UI, UI before FK integration, FK integration before army list simplification, army list simplification before rules.db removal
- rules.db must stay alive through Phases 103–106 — 7+ call sites use getRulesDb(); eliminate only in Phase 107
- FK nullable: units.udb_unit_id uses ON DELETE SET NULL — collection units survive database re-import
- Entity IDs: reuse Wahapedia string IDs for udb_units so existing rules_favorites_notes annotations survive the pivot
- Inline stub pattern for deferred features (stratagems, detachments, shared abilities) rather than keeping empty hook files
- getSyncFreshness/getSyncAgeLabel simplified to always return 'fresh'/'Data bundled with app' since data is now bundled

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

Last session: 2026-05-31T00:00:00Z
Stopped at: Phase 107-01 complete
Resume file: .planning/phases/107-cleanup-pipeline/107-02-PLAN.md
Resume: Phase 107 Plan 01 complete. Next: execute 107-02

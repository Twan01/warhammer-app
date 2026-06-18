---
gsd_state_version: 1.0
milestone: v0.6.0
milestone_name: Bulletproof & Honest
status: Not started
stopped_at: Phase 140 context gathered
last_updated: "2026-06-18T13:40:55.414Z"
last_activity: 2026-06-18
progress:
  total_phases: 11
  completed_phases: 10
  total_plans: 31
  completed_plans: 31
  percent: 91
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-15)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with accurate canonical data and reliable backup/restore
**Current focus:** Phase 140 — close PLAY-02/03 Rules Hub tail (v0.6.0 audit gap)

## Current Position

Phase: 140
Plan: Not started
Status: Not started
Last activity: 2026-06-18

Progress: [██████████] 100%

## Performance Metrics

**Velocity (recent milestones):**

- v0.5.2: 13 plans across 4 phases (1 day)
- v0.5.0: 9 plans across 5 phases (2 days)
- v0.4.7: 10 plans across 5 phases (6 days)
- v0.4.5: 7 plans across 4 phases (2 days)
- v0.4.2: 11 plans across 4 phases (single day)
- v0.4.0: 12 plans across 5 phases (3 days)

*Updated after each plan completion*

## Accumulated Context

### Roadmap Evolution

- Phase 140 added: Close PLAY-02/03 tail: repoint Rules Hub DatasheetPointsTab from dead synced_leader_targets to canonical udb_leader_targets (from v0.6.0 milestone audit gap)

### Key Decisions (carried forward)

- Single-database architecture — all data in hobbyforge.db
- Pre-built canonical unit database (not runtime sync); data bundled with app, no runtime sync surface
- Settings page shipped: app_settings key-value storage, locale/currency/faction wired
- Factory reset via Rust command with safety backup
- Schema version = migration count (integer); no hand-maintained EXPECTED_SCHEMA_VERSION constant
- Overrides + favorites/notes live in hobbyforge.db keyed on stable Wahapedia IDs — survive re-import
- CRLF/LF migration checksum drift was the "update breaks launch" root cause; fix on `fix/update-breaks-app-launch`
- Map-not-delete faction consolidation (migration 048): correlated subqueries re-point 4 FK surfaces (units RESTRICT, painting_recipes SET NULL, army_lists SET NULL, wishlist_items CASCADE) + app_settings TEXT value before DELETE; CAST required for INTEGER<->TEXT; parity gate at 48
- D-10 (Phase 137): replaceSyncedLeaderTargets removed (zero callers post-repoint); getLeaderTargetsByFaction+SyncedLeaderTargetRow KEPT (rules-hub still consumes); synced_leader_targets table left in place (no drop migration this phase)

### v0.6.0 Sequencing Law (CRITICAL)

Theme A (phases 130–132) must land **and merge to `master`** — CI gate green + ONE verified real in-place NSIS update — **before** any Theme-B refactor (133+) begins. The reliability fix on `fix/update-breaks-app-launch` and the large refactors (HON-08, HON-09) must not coexist in-flight. Strict order A → B → C → D.

Intra-milestone gates:

- Phase 130 (parity test green) must precede Phase 131 (CI gate) or CI red-fails on first run.
- HON-08 shared WeaponTable (Phase 136) GATES PLAY-01 comparison (Phase 138).
- PLAY-02 migration 048 (Phase 137) GATES PLAY-03 leader validation; migration 048 re-triggers the Phase-130 parity gate (expected/good).
- HON-05 faction consolidation (Phase 135) is a map-not-delete, zero-data-loss migration — its own careful step, not bundled with route removal in a data-risky way.

### Pending Todos

None.

### Open Blockers

None.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Future | PLAY-FUT-01: Faction overview page | Future milestone | v0.6.0 planning |
| Future | PLAY-FUT-02: Auto-backup on schedule | Future milestone | v0.6.0 planning |
| Future | HON-FUT-01: Theme customization / custom painting-status labels | Future milestone | v0.6.0 planning |
| Future | French translations for stratagems/enhancements | Future milestone | v0.4.7 planning |
| Phase 130-migration-parity-release-gate P01 | 15min | 2 tasks | 2 files |
| Phase 131-ci-test-gate P02 | 8min | 2 tasks | 2 files |
| Phase 132-update-trustworthiness P01 | 35m | 3 tasks | 7 files |
| Phase 134-no-dead-ends P01 | 20min | 2 tasks | 3 files |
| Phase 134-no-dead-ends P02 | 30min | 3 tasks | 8 files |
| Phase 135 P01 | 10min | 3 tasks | 3 files |
| Phase 135 P02 | 7m | 2 tasks | 4 files |
| Phase 135 P03 | 5min | 1 tasks | 1 files |
| Phase 136-code-honesty-decomposition P02 | 1584s | 3 tasks | 7 files |
| Phase 136-code-honesty-decomposition P03 | 12m | 2 tasks | 8 files |
| Phase 137 P02 | 12 | 3 tasks | 5 files |
| Phase 138 P01 | 562 | 3 tasks | 6 files |
| Phase 138-player-journey-depth P04 | 14m | 2 tasks | 5 files |
| Phase 138 P02 | 1080 | 4 tasks | 8 files |
| Phase 138-player-journey-depth P03 | 1200 | 5 tasks | 12 files |
| Phase 139 P01 | 12m | 2 tasks | 3 files |
| Phase 139 P02 | 437s | 3 tasks | 54 files |
| Phase 139 P03 | 35m | 2 tasks | 4 files |

## Quick Tasks Completed

| Date | Task | Commit |
|------|------|--------|
| 2026-06-15 | recipe-checklist-step-details — show full step detail in the applied-recipe tick-off checklist via expandable rows | 90889d1a |
| 2026-06-15 | print-army-list-pdf — enriched PDF: category-grouped sections, model counts, wargear/loadout per unit | 6036ed9f |
| 2026-06-15 | full-battle-roster-pdf — multi-page battle roster PDF (summary + per-unit datasheets + detachment section) | bc3a4469 |

## Session Continuity

Last session: 2026-06-18T13:40:55.407Z
Stopped at: Phase 140 context gathered
Resume file: .planning/phases/140-close-play-02-03-tail-repoint-rules-hub-datasheetpointstab-f/140-CONTEXT.md

## Operator Next Steps

- Plan the first phase with `/gsd:plan-phase 130`

---
gsd_state_version: 1.0
milestone: v0.7.0
milestone_name: Technique Library
status: planning
last_updated: "2026-06-19T10:29:18.923Z"
last_activity: 2026-06-19
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-19)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with accurate canonical data and reliable backup/restore
**Current focus:** Planning next milestone (v0.6.0 shipped 2026-06-19)

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-06-19 — Milestone v0.7.0 started

## Performance Metrics

**Velocity (recent milestones):**

- v0.6.0: 32 plans across 11 phases (4 days)
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

**Future requirements (next milestone candidates):**

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Future | PLAY-FUT-01: Faction overview page | Future milestone | v0.6.0 planning |
| Future | PLAY-FUT-02: Auto-backup on schedule | Future milestone | v0.6.0 planning |
| Future | HON-FUT-01: Theme customization / custom painting-status labels | Future milestone | v0.6.0 planning |
| Future | French translations for stratagems/enhancements | Future milestone | v0.4.7 planning |

**Acknowledged at v0.6.0 close (2026-06-19) — stale / non-milestone artifacts, proceeded with close:**

| Category | Item | Status |
|----------|------|--------|
| debug | app-wont-start | investigating (pre-v0.6.0) |
| debug | collection-qty-points-rules | root_cause_found (pre-v0.6.0) |
| debug | collection-unit-delete-freeze | awaiting_human_verify (2026-06-11) |
| debug | knowledge-base | unknown (stale) |
| debug | subfaction-filtering-wrong-units | root_cause_found (pre-v0.6.0) |
| debug | subfaction-filtering-wrong-units-resolved | closed (stale marker) |
| debug | unit-ability-html-not-rendered-resolved | closed (stale marker) |
| quick_task | 260503-...-get-something-to-launch | shipped, no SUMMARY recorded |
| quick_task | 260504-...-shortcut-isn-t-working | shipped, no SUMMARY recorded |
| quick_task | 260615-...-print-the-army-list | shipped (commit 6036ed9f) |
| quick_task | 260615-...-full-battle-ready-roster | shipped (commit bc3a4469) |

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

- Start the next milestone with /gsd-new-milestone

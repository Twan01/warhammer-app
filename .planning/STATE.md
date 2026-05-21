---
gsd_state_version: 1.0
milestone: v0.2.18
milestone_name: Army Lists 3.0 — Smart List Builder
status: ready_to_execute
stopped_at: Phase 93 planned — 2 plans in 2 waves
last_updated: 2026-05-21T13:00:00.000Z
last_activity: 2026-05-21 -- Phase 93 planned (datasheet browser + ghost units — 2 plans, checker passed)
progress:
  total_phases: 7
  completed_phases: 2
  total_plans: 4
  completed_plans: 4
  percent: 57
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-20)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with reliable backup/restore so local data is always recoverable
**Current focus:** Phase 93 — datasheet browser + ghost units

## Current Position

Phase: 93 of 95 (datasheet browser + ghost units — planned)
Plan: 2 plans in 2 waves (ready to execute)
Status: Phase 93 planned — ready for execution
Last activity: 2026-05-21

Progress: [█████░░░░░] 57%

## Performance Metrics

**Velocity:**

- v0.2.15: 11 plans across 5 phases (2 days)
- v0.2.14: 11 plans across 5 phases (2 days)
- v0.2.13: 13 plans across 6 phases (2 days)
- v0.2.11: 9 plans across 5 phases (single day)
- v0.2.10: 17 plans across 7 phases (single day)

## Accumulated Context

### Decisions (v0.2.18)

- Ghost units: nullable unit_id + ghost_unit_name TEXT on army_list_units — NOT new rows in units table
- Enhancement points tracked separately from COALESCE chain; added to list total at summary level, not per-unit
- All synced table references must be TEXT copies (detachment_name, weapon_name pattern) — no integer FKs across DBs
- COALESCE chain must be updated atomically across all 3 query sites in a single migration pass
- New packages needed: @tauri-apps/plugin-clipboard-manager (EXP-01), jsPDF lazy-loaded (EXP-04)
- All new Sheets use sibling portal pattern at page level (established pattern from v0.2.0+)
- setWarlord uses CASE WHEN id = $1 THEN 1 ELSE 0 END WHERE list_id = $2 — single UPDATE prevents cross-list mutation
- addGhostUnitToList hardcodes NULL as unit_id in SQL for clarity (not a parameter)
- useEnhancementsByList uses ["army-list-enhancements", listId] key (separate from ARMY_LIST_UNITS_KEY)

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-21
Stopped at: Phase 93 planned — 2 plans in 2 waves, checker passed
Resume file: .planning/phases/93-datasheet-browser-ghost-units/93-01-PLAN.md
Resume: /gsd:execute-phase 93

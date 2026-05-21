---
gsd_state_version: 1.0
milestone: v0.2.18
milestone_name: Army Lists 3.0 — Smart List Builder
status: ready_to_plan
stopped_at: Phase 93 completed — next phase 94
last_updated: 2026-05-21T14:00:00.000Z
last_activity: 2026-05-21 -- Phase 93 executed (datasheet browser + ghost units — 2 plans, 2 waves)
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 71
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-20)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with reliable backup/restore so local data is always recoverable
**Current focus:** Phase 94 — list export

## Current Position

Phase: 94 of 95 (list export — not yet planned)
Plan: none yet
Status: Phase 93 completed — ready to plan Phase 94
Last activity: 2026-05-21

Progress: [███████░░░] 71%

## Performance Metrics

**Velocity:**

- v0.2.18: 6 plans across 3 phases (1 day, in progress)
- v0.2.15: 11 plans across 5 phases (2 days)
- v0.2.14: 11 plans across 5 phases (2 days)
- v0.2.13: 13 plans across 6 phases (2 days)
- v0.2.11: 9 plans across 5 phases (single day)

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
- DatasheetBrowserDialog uses Dialog (not Sheet) with Command palette for search — cloned from UnitPickerDialog pattern
- Ghost unit detection: unit.unit_id === null — renders "Planned" badge, muted text, hidden painting/tactical role
- ghost_unit_name must exactly match rw_datasheets.name for name-based lookups

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-21
Stopped at: Phase 93 completed — ready to plan Phase 94
Resume file: .planning/phases/93-datasheet-browser-ghost-units/VERIFICATION.md
Resume: /gsd:discuss-phase 94

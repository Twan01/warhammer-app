---
gsd_state_version: 1.0
milestone: v0.2.18
milestone_name: Army Lists 3.0 — Smart List Builder
status: executing
stopped_at: Phase 94 Plan 01 complete — export foundation installed and tested
last_updated: 2026-05-21T06:48:00.000Z
last_activity: 2026-05-21 -- Phase 94 Plan 01 complete (export foundation)
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 8
  completed_plans: 11
  percent: 85
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-20)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with reliable backup/restore so local data is always recoverable
**Current focus:** Phase 94 — list export

## Current Position

Phase: 94 of 95 (list export — Plan 01 complete)
Plan: 1 of 2 complete
Status: Phase 94 executing — Plan 01 done, Plan 02 next
Last activity: 2026-05-21

Progress: [████████░░] 85%

## Performance Metrics

**Velocity:**

- v0.2.18: 8 plans across 4 phases (1 day, in progress)
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
- Leader attachment uses LeaderAttachmentSheet (sibling portal pattern) with preventive validation — only valid targets shown
- Visual grouping: leader row indented under target with left border accent; client-side reorder based on leader_attached_to_id
- Leader detection: unit name matches leader_name in synced_leader_targets (distinct from Character keyword)
- Export: single DropdownMenu button in ArmyListDetailSheet header with 4 format options
- Clipboard text: tournament-style compact format with leader grouping and [Planned] markers
- Print: PrintPreviewDialog with CSS @media print, sibling portal pattern
- JSON: versioned structured format (hobbyforge-army-list v1.0) with full metadata + units + enhancements
- PDF: jsPDF text-based generation, lazy-loaded via dynamic import
- Shared formatArmyListForExport() utility for all 4 formats

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-21
Stopped at: Phase 94 Plan 01 complete — export foundation installed and tested
Resume file: .planning/phases/94-list-export/94-01-SUMMARY.md
Resume: Continue with Phase 94 Plan 02 (export UI wiring)

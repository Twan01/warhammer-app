---
gsd_state_version: 1.0
milestone: v0.2.18
milestone_name: Army Lists 3.0 — Smart List Builder
status: milestone_complete
stopped_at: Milestone complete (Phase 95 was final phase)
last_updated: 2026-05-22T07:31:07.231Z
last_activity: 2026-05-22 -- Phase 95 Plan 02 complete (snapshot UI)
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 14
  completed_plans: 14
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-20)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with reliable backup/restore so local data is always recoverable
**Current focus:** Milestone complete

## Current Position

Phase: 95 of 95 (version snapshots)
Plan: Not started
Status: Milestone complete
Last activity: 2026-05-22

Progress: [█████████░] 93%

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
- Snapshots: JSON blob in army_list_snapshots table reusing Phase 94 export format
- Snapshot restore: destructive replace with auto-save safety snapshot before restore
- Snapshot compare: two-column diff dialog matching units by display name
- SnapshotHistorySheet + SnapshotCompareDialog as sibling portals at ArmyListsPage level

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-22
Stopped at: Completed 95-01 (data layer) — ready for 95-02 (UI)
Resume file: .planning/phases/95-version-snapshots/95-02-PLAN.md
Resume: Execute Phase 95 Plan 02 — snapshot UI components

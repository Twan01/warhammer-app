---
phase: 08-army-list-builder
plan: 02
subsystem: ui
tags: [react, tailwind, shadcn, tanstack-query, lucide, cmdk]

# Dependency graph
requires:
  - phase: 08-army-list-builder plan 00
    provides: Phase 6 hooks (useUpdateArmyListUnit, useAddUnitToList, useArmyListWithUnits) and types (ArmyListUnitRow, UpdateArmyListUnitVariables)
  - phase: 08-army-list-builder plan 01
    provides: armyListSchema.ts, ArmyListSheet.tsx, ArmyListDeleteDialog.tsx — list CRUD layer
provides:
  - ArmyListSummaryBar: pinned three-stat band consuming SQL-computed effective_points
  - ArmyListUnitRow: compact table row with inline points override + expandable notes + remove button
  - UnitPickerDialog: sibling Dialog wrapping Command palette for multi-add unit picker
affects:
  - 08-army-list-builder plan 03 (ArmyListDetailSheet composes all three components)
  - 08-army-list-builder plan 04 (component tests for all three leaf components)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pitfall 2 full-replacement UPDATE: every useUpdateArmyListUnit call passes BOTH points_override AND notes"
    - "Pitfall 3 null faction fallback: UnitPickerDialog shows all units when factionId is null"
    - "Sibling portal: UnitPickerDialog is Dialog sibling to Sheet, never nested inside Radix portal"
    - "SQL-computed field passthrough: ArmyListSummaryBar sums effective_points without reimplementing COALESCE"

key-files:
  created:
    - src/features/army-lists/ArmyListSummaryBar.tsx
    - src/features/army-lists/ArmyListUnitRow.tsx
    - src/features/army-lists/UnitPickerDialog.tsx
  modified: []

key-decisions:
  - "status_painting === 'Completed' is the canonical fully-painted comparison (not 'Complete' — RESEARCH.md had a typo; PAINTING_STATUS_ORDER in unit.ts confirms 'Completed')"
  - "ArmyListSummaryBar uses useMemo on both reduce operations to avoid recalculation on every render"
  - "UnitPickerDialog stays open after each unit add (no onClose call on select) for multi-add UX per CONTEXT.md"
  - "ArmyListUnitRow handlePointsBlur early-returns if numeric === unit.points_override to skip no-op mutations"

patterns-established:
  - "Pitfall 2 preservation: both save handlers in ArmyListUnitRow always pass BOTH fields (notes when updating points, points_override when updating notes)"
  - "Leaf component pattern: all three components consume hooks and props directly, no army-list children"

requirements-completed: [ARMY-02, ARMY-03, ARMY-04]

# Metrics
duration: 4min
completed: 2026-05-02
---

# Phase 8 Plan 02: Army List Leaf Components Summary

**Three leaf UI components for army list detail: ArmyListSummaryBar (SQL effective_points stats), ArmyListUnitRow (inline points override + expandable notes + remove), and UnitPickerDialog (Command palette sibling Dialog with null-faction fallback)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-02T08:10:07Z
- **Completed:** 2026-05-02T08:13:31Z
- **Tasks:** 3
- **Files modified:** 3 created

## Accomplishments
- ArmyListSummaryBar renders Total/Painted/Battle-ready stats by consuming SQL-computed effective_points — never reimplements COALESCE; status_painting === "Completed" canonical comparison
- ArmyListUnitRow provides inline points override input (blur/Enter save), expandable notes textarea (Save button), and Trash2 remove button — both mutation handlers pass full replacement payload per Pitfall 2
- UnitPickerDialog wraps Command palette in a sibling Dialog portal — filters by faction_id when non-null, shows all units when null (Pitfall 3), stays open after each add for multi-add UX

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ArmyListSummaryBar.tsx** - `ae9bcdb` (feat)
2. **Task 2: Create ArmyListUnitRow.tsx** - `edd696a` (feat)
3. **Task 3: Create UnitPickerDialog.tsx** - `9100cae` (feat)

## Files Created/Modified
- `src/features/army-lists/ArmyListSummaryBar.tsx` - Pinned three-stat summary band (total pts, painted pts, battle-ready %)
- `src/features/army-lists/ArmyListUnitRow.tsx` - Compact TableRow with inline points input, expandable notes, remove button
- `src/features/army-lists/UnitPickerDialog.tsx` - Command palette Dialog for adding units, stays open for multi-add

## Decisions Made
- **"Completed" not "Complete"**: RESEARCH.md had a typo; the canonical value in PAINTING_STATUS_ORDER is "Completed". Plan already documented this correction — applied exactly as specified.
- **useMemo on reduce operations**: Both totalPoints and paintedPoints memoized in ArmyListSummaryBar to avoid recalculating on every render cycle.
- **Early-return on no-op points update**: handlePointsBlur skips mutate call when numeric === unit.points_override to avoid unnecessary network calls.
- **Full-replacement always**: Both save paths in ArmyListUnitRow pass both fields to satisfy the NULL-passthrough UPDATE contract (Pitfall 2).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None — all three components compiled cleanly on first write and tests remained green (173 passing, 5 skipped from other plans).

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Plan 03 (ArmyListDetailSheet) can now import and compose all three leaf components
- Plan 04 (component tests) can now fill in the test stubs from plan 00 — all three components are available
- `src/features/army-lists/` now contains all 6 files specified in this plan's verification criteria

---
*Phase: 08-army-list-builder*
*Completed: 2026-05-02*

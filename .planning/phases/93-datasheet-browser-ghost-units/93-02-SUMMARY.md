---
phase: 93-datasheet-browser-ghost-units
plan: 02
subsystem: army-lists
tags: [ghost-units, visual-treatment, army-list-unit-row, planned-badge]
dependency_graph:
  requires: [93-01]
  provides: [ghost-unit-visual-treatment]
  affects: [ArmyListUnitRow]
tech_stack:
  added: []
  patterns: [ghost-detection-via-null-unit-id, conditional-rendering-per-ownership]
key_files:
  created: []
  modified:
    - src/features/army-lists/ArmyListUnitRow.tsx
    - tests/army-lists/ArmyListUnitRow.test.tsx
decisions:
  - Ghost detection via const isGhost = unit.unit_id === null at component top
  - Ghost isolation (BRW-03) confirmed schema-level -- no code filters needed
metrics:
  duration: 8m
  completed: 2026-05-21
---

# Phase 93 Plan 02: Ghost Unit Visual Treatment Summary

**One-liner:** Conditional rendering in ArmyListUnitRow showing "Planned" badge, muted name, hidden painting status and tactical role for ghost units while retaining Configure and Remove access.

## What Was Built

### Task 1: Ghost unit visual treatment in ArmyListUnitRow (6d865c7)
- Added `const isGhost = unit.unit_id === null` detection at component top
- Ghost unit names render with `text-muted-foreground` class for visual distinction
- Added `<Badge variant="outline">Planned</Badge>` next to ghost unit names
- Painting/assembly status cell shows "--" placeholder for ghost units instead of status badges
- Tactical role `<Select>` wrapped in `{!isGhost && (...)}` to hide for ghost units
- Configure button and points input remain accessible for ghost units (D-07)
- Fixed pre-existing SyncFreshness type error in test file (Rule 3 - blocking)

### Task 2: Ghost unit treatment tests (5f4618a)
- Added 9 new tests in "Ghost unit treatment" describe block
- Tests cover: Planned badge, muted styling, hidden painting status, hidden tactical role
- Tests verify: Configure button, Remove button still render for ghost units
- Contrast test: owned units still show painting status and tactical role selector
- BRW-03 documentation test: ghost isolation is schema-level (no code filter needed)
- All 12 tests pass (3 existing + 9 new)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing SyncFreshness type error in test file**
- **Found during:** Task 1 (build verification)
- **Issue:** `defaultFreshness` was typed as `{ status: "fresh", lastSync: "2024-01-01", ageMs: 0 }` but SyncFreshness is a string union `"fresh" | "aging" | "stale" | "never"`
- **Fix:** Changed to `const defaultFreshness: SyncFreshness = "fresh"`
- **Files modified:** tests/army-lists/ArmyListUnitRow.test.tsx
- **Commit:** 6d865c7

## Verification Results

- `npx vitest run tests/army-lists/ArmyListUnitRow.test.tsx`: 12/12 passed
- `npx vitest run tests/army-lists/DatasheetBrowserDialog.test.tsx`: 4/4 passed
- `pnpm build`: Passes (only pre-existing warnings about chunk size)

## Known Stubs

None.

## Self-Check: PASSED

- ArmyListUnitRow.tsx: FOUND
- ArmyListUnitRow.test.tsx: FOUND
- Commit 6d865c7: FOUND
- Commit 5f4618a: FOUND
- No accidental file deletions

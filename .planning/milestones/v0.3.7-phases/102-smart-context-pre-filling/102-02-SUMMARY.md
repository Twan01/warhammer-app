---
phase: 102-smart-context-pre-filling
plan: 02
subsystem: recipes
tags: [recipe-picker, faction-grouping, context-pre-fill]
dependency_graph:
  requires: []
  provides: [faction-grouped-recipe-picker]
  affects: [ApplyRecipeDialog, UnitDetailSheet]
tech_stack:
  added: []
  patterns: [CommandGroup-heading, useMemo-split]
key_files:
  created:
    - tests/recipes/ApplyRecipeDialogGrouping.test.tsx
  modified:
    - src/features/recipes/ApplyRecipeDialog.tsx
    - src/features/units/UnitDetailSheet.tsx
decisions:
  - "Used conditional CommandGroup heading — only show 'Suggested (N)' when both groups exist"
  - "Flat list preserved when factionId is null/undefined — single headingless CommandGroup"
metrics:
  duration: 336s
  completed: 2026-05-28
---

# Phase 102 Plan 02: ApplyRecipeDialog Faction Grouping Summary

Faction-based Suggested/Other recipe grouping in ApplyRecipeDialog with prop threading from UnitDetailSheet

## What Was Done

### Task 1: Add faction grouping to ApplyRecipeDialog and wire from UnitDetailSheet
- Added `factionId?: number | null` prop to `ApplyRecipeDialogProps`
- Added `useMemo` that splits recipes into `suggested` (faction match) and `other` arrays
- When `factionId` is null/undefined: all recipes go into `suggested`, `other` is empty (preserving flat list)
- Replaced single `CommandGroup` with two conditional groups: "Suggested (N)" and "Other (N)"
- Group headers only appear when both groups have items
- Wired `factionId={unit.faction_id}` from `UnitDetailSheet` to `ApplyRecipeDialog`
- **Commit:** e90ab11

### Task 2: Test ApplyRecipeDialog faction grouping
- Created `tests/recipes/ApplyRecipeDialogGrouping.test.tsx` with 4 test cases
- Tests: grouped display with factionId, flat list with null, flat list with undefined, cross-group selectability
- All hooks mocked following existing test patterns
- All 4 tests pass
- **Commit:** 8a139f6

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `pnpm build` passes with no TypeScript errors
- `pnpm test -- tests/recipes/ApplyRecipeDialogGrouping.test.tsx` - all 4 tests pass

## Known Stubs

None.

## Self-Check: PASSED

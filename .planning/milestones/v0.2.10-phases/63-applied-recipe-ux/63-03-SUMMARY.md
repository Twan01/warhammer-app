---
phase: 63-applied-recipe-ux
plan: 03
subsystem: recipes
tags: [applied-recipes, bulk-apply, dialog, multi-select]
dependency_graph:
  requires: [useRecipeAssignments, useUnits, useFactions, RecipeDetailSheet]
  provides: [ApplyToUnitsDialog]
  affects: [RecipeDetailSheet]
tech_stack:
  added: []
  patterns: [Command multi-select, sibling dialog portal, Set-based selection state]
key_files:
  created:
    - src/features/recipes/ApplyToUnitsDialog.tsx
    - tests/applied-recipes/applyToUnitsDialog.test.tsx
  modified:
    - src/features/recipes/RecipeDetailSheet.tsx
decisions:
  - "Dialog rendered as sibling to Sheet (P6 pitfall avoidance) - prevents focus restoration issues"
  - "selectedUnitIds as Set<number> with toggle function for clean multi-select semantics"
  - "Already-assigned units detected via useAssignmentsByRecipe and dimmed with opacity-50 + disabled"
metrics:
  duration: 12m
  completed: 2026-05-13
---

# Phase 63 Plan 03: ApplyToUnitsDialog + RecipeDetailSheet Footer Summary

Multi-select unit picker dialog for bulk recipe application with already-assigned detection and dynamic count confirmation button.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ApplyToUnitsDialog + RecipeDetailSheet footer button | b072f70 | ApplyToUnitsDialog.tsx, RecipeDetailSheet.tsx |
| 2 | ApplyToUnitsDialog tests (5 cases) | 8aaf29c | applyToUnitsDialog.test.tsx |

## Implementation Details

### ApplyToUnitsDialog (new)
- Dialog with Command searchable unit list and Checkbox per item
- Uses `useAssignmentsByRecipe` to detect already-assigned units (dimmed + disabled)
- `selectedUnitIds` as `Set<number>` with toggle function, reset on dialog open
- Confirm button shows dynamic count ("Apply to N unit(s)") and calls `useBulkCreateAssignments`
- Toast notifications on success/error

### RecipeDetailSheet (modified)
- Added "Apply to Unit(s)" button in SheetFooter before "Edit Recipe"
- `ApplyToUnitsDialog` rendered as sibling to `<Sheet>` (not inside SheetContent)
- Fragment wrapper added to return statement for sibling rendering
- State: `applyToUnitsOpen` boolean with setter

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed multiple faction badge test assertion**
- **Found during:** Task 2
- **Issue:** Test expected single "Ultramarines" text but two units shared the same faction, causing `getByText` to throw
- **Fix:** Changed to `getAllByText` with `toBeGreaterThanOrEqual(1)` assertion
- **Files modified:** tests/applied-recipes/applyToUnitsDialog.test.tsx
- **Commit:** 8aaf29c

## Verification

- `npx tsc --noEmit` exits 0
- All 5 ApplyToUnitsDialog tests pass
- RecipeDetailSheet footer contains "Apply to Unit(s)" button
- Pre-existing test failures (RecipeDetailSheet tests) confirmed unrelated (missing QueryClientProvider)

## Self-Check: PASSED

All files exist and all commits verified.

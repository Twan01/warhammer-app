---
phase: 126-critical-fixes-dead-ends
plan: 03
subsystem: army-lists, recipes
tags: [bug-fix, ux, error-handling, feedback]
dependency_graph:
  requires: []
  provides: [silent-noop-toast, recipes-error-state, list-not-found-guard]
  affects: [ArmyListDetailPage, RecipesPage]
tech_stack:
  added: []
  patterns: [error-state-ui, loading-vs-not-found-guard]
key_files:
  created: []
  modified:
    - src/features/army-lists/ArmyListDetailPage.tsx
    - src/features/recipes/RecipesPage.tsx
decisions:
  - "Silent no-op on unchanged notes save (D-04)"
  - "listLoading alias avoids isLoading collision with useArmyListWithUnits (D-11)"
  - "Error state inline in RecipesPage, no shared ErrorState component (D-08)"
metrics:
  duration: "2 minutes"
  completed: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 126 Plan 03: Feedback & Error State Fixes Summary

Silent no-op notes save, RecipesPage error state with AlertCircle and retry, and loading vs not-found guard on ArmyListDetailPage.

## Completed Tasks

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Fix Army List notes no-op toast and loading vs not-found | d0cabd5e | Removed toast on no-op, added listLoading guard, added not-found state |
| 2 | Add error state to RecipesPage | d756e3d0 | Added isError/refetch destructuring, error UI with AlertCircle and retry button |

## Deviations from Plan

None - plan executed exactly as written.

## Key Changes

### ArmyListDetailPage.tsx
- **No-op toast removed:** `handleSaveListNotes` early return no longer fires `toast.success("Notes saved.")` when notes are unchanged
- **Loading vs not-found:** `useArmyList` now destructures `isLoading: listLoading`; skeleton shows only during loading; "List not found" with back link renders when list is null after loading completes

### RecipesPage.tsx
- **Error state added:** Destructures `isError` and `refetch` from `useRecipes()`; renders centered error block with AlertCircle, "Failed to load recipes" heading, and "Reload Recipes" button calling `refetch()`
- **AlertCircle import:** Added to lucide-react imports

## Known Stubs

None.

## Self-Check: PASSED

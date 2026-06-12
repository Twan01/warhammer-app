---
phase: 129-navigation-cross-links-technical-cleanup
plan: "03"
subsystem: ui
tags: [react, army-lists, recipes, refactor, dead-code, memo]

# Dependency graph
requires:
  - phase: 129-navigation-cross-links-technical-cleanup
    provides: Phase context and research findings confirming ArmyListDetailSheet is orphaned
provides:
  - Deleted orphaned ArmyListDetailSheet (~483 lines removed)
  - armyListDetailReducer.ts with extracted DetailPortalState, DetailPortalAction, detailPortalReducer
  - Memoized RecipeCard component
  - NAV-11 Esc hint verified present in StepFocalView
affects: [army-lists, recipes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reducer extraction: inline reducer definitions moved to separate *Reducer.ts file (matches armyListsReducer.ts pattern)"
    - "React.memo with named function form: export const X = memo(function X(...))"

key-files:
  created:
    - src/features/army-lists/armyListDetailReducer.ts
  modified:
    - src/features/army-lists/ArmyListDetailPage.tsx
    - src/features/recipes/RecipeCard.tsx
    - src/features/army-lists/ExportDropdown.tsx
    - src/features/army-lists/DatasheetBrowserDialog.tsx
    - src/features/army-lists/ArmyListUnitRow.tsx
    - src/features/army-lists/LoadoutBuilderSheet.tsx
  deleted:
    - src/features/army-lists/ArmyListDetailSheet.tsx

key-decisions:
  - "ArmyListDetailSheet.tsx deleted — confirmed zero real imports, only stale comment references"
  - "Reducer extracted to armyListDetailReducer.ts following armyListsReducer.ts pattern with full export of types, initial state, and reducer"
  - "RecipeCard wrapped in memo using named function form to preserve DevTools name"
  - "NAV-11 verified already present (line 181 of StepFocalView.tsx) — no code change needed"

patterns-established:
  - "Reducer extraction pattern: large page-level reducers extracted to dedicated *Reducer.ts files"

requirements-completed: [NAV-07, NAV-08, NAV-09, NAV-11]

# Metrics
duration: 15min
completed: 2026-06-11
---

# Phase 129 Plan 03: Technical Cleanup Summary

**Deleted 483-line orphaned ArmyListDetailSheet, extracted detailPortalReducer to dedicated file, memoized RecipeCard, confirmed NAV-11 Esc hint already present**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-11T14:30:00Z
- **Completed:** 2026-06-11T14:45:00Z
- **Tasks:** 2
- **Files modified:** 7 (1 deleted, 1 created, 5 modified)

## Accomplishments

- Deleted `ArmyListDetailSheet.tsx` (~483 lines) — confirmed orphaned with zero live imports
- Created `armyListDetailReducer.ts` extracting `DetailPortalState`, `DetailPortalAction`, `initialDetailPortalState`, and `detailPortalReducer` from `ArmyListDetailPage.tsx`
- Updated `ArmyListDetailPage.tsx` to import from `./armyListDetailReducer` — pure refactor, no behavior change
- Wrapped `RecipeCard` in `React.memo` using named function form for React DevTools compatibility
- Verified NAV-11 "Esc to exit" hint already present at line 181 of `StepFocalView.tsx`
- Updated 4 stale comment references from `ArmyListDetailSheet` to `ArmyListDetailPage`

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete ArmyListDetailSheet and extract detailPortalReducer** - `a9e1b160` (refactor)
2. **Task 2: Wrap RecipeCard in React.memo and verify NAV-11** - `14d15dd5` (perf)

## Files Created/Modified

- `src/features/army-lists/armyListDetailReducer.ts` (created) — Extracted reducer with DetailPortalState type, DetailPortalAction union, initialDetailPortalState const, and detailPortalReducer function
- `src/features/army-lists/ArmyListDetailPage.tsx` (modified) — Removed inline reducer definitions, added import from armyListDetailReducer
- `src/features/recipes/RecipeCard.tsx` (modified) — Wrapped in React.memo, added memo import
- `src/features/army-lists/ArmyListDetailSheet.tsx` (deleted) — Orphaned dead code
- `src/features/army-lists/ExportDropdown.tsx` (modified) — Updated stale comment reference
- `src/features/army-lists/DatasheetBrowserDialog.tsx` (modified) — Updated stale comment reference
- `src/features/army-lists/ArmyListUnitRow.tsx` (modified) — Updated stale comment reference
- `src/features/army-lists/LoadoutBuilderSheet.tsx` (modified) — Updated stale comment reference

## Decisions Made

- Stale comment references in 4 files were updated to point to `ArmyListDetailPage` instead of the deleted `ArmyListDetailSheet` — confusing to leave references to a deleted file
- `DetailPortalState` and `DetailPortalAction` exported from new reducer file even though only used internally in `ArmyListDetailPage` — consistent with `armyListsReducer.ts` pattern and allows future use

## Deviations from Plan

None - plan executed exactly as written. NAV-11 was confirmed already present as research indicated; no code change needed for that requirement.

## Issues Encountered

None — build passed cleanly on both tasks. Tests passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dead code eliminated; ArmyListDetailPage is now the single canonical detail view
- Reducer file organization matches the established armyListsReducer.ts pattern
- RecipeCard renders more efficiently in recipe list grids
- All 4 requirements (NAV-07, NAV-08, NAV-09, NAV-11) completed

---
*Phase: 129-navigation-cross-links-technical-cleanup*
*Completed: 2026-06-11*

## Self-Check: PASSED

- `src/features/army-lists/armyListDetailReducer.ts` — FOUND
- `src/features/recipes/RecipeCard.tsx` — FOUND (memo-wrapped)
- `src/features/army-lists/ArmyListDetailSheet.tsx` — CONFIRMED DELETED
- Commit `a9e1b160` — FOUND
- Commit `14d15dd5` — FOUND

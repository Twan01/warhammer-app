---
phase: 99-architecture-cleanup
plan: 01
subsystem: architecture
tags: [refactoring, query-layer, state-management, useReducer]
dependency_graph:
  requires: []
  provides: [query-layer-isolation, army-lists-reducer]
  affects: [src/db/queries, src/features/army-lists, src/lib, src/types]
tech_stack:
  added: []
  patterns: [useReducer-discriminated-union, lib-layer-isolation]
key_files:
  created:
    - src/lib/computeGoalPeriod.ts
    - src/lib/recipeDiff.ts
    - src/lib/recipeSteps.ts
    - src/features/army-lists/armyListsReducer.ts
    - tests/army-lists/armyListsReducer.test.ts
  modified:
    - src/types/recipe.ts
    - src/db/queries/goals.ts
    - src/db/queries/recipes.ts
    - src/features/army-lists/ArmyListsPage.tsx
    - src/features/goals/GoalCard.tsx
    - src/features/goals/GoalSheet.tsx
    - src/features/goals/GoalsPage.tsx
    - src/features/painting-mode/PaintingModeView.tsx
    - src/features/recipes/recipeSection.ts
    - src/features/recipes/RecipeDetailSheet.tsx
    - src/features/recipes/RecipeStepList.tsx
    - src/features/recipes/RecipeStepRow.tsx
    - src/features/recipes/RecipeStepTimeline.tsx
    - src/features/recipes/SectionedTimeline.tsx
    - tests/goals/computeGoalPeriod.test.ts
    - tests/painting/recipeDiff.test.ts
    - tests/painting/recipeSteps.test.ts
    - tests/painting/recipeStepRow.test.tsx
decisions:
  - "Moved all 3 exports from computeGoalPeriod.ts (not just the one used by queries) to avoid partial relocation"
  - "Moved DraftStep, DraftSection, RecipeFormValues types to src/types/recipe.ts to co-locate with existing recipe types"
  - "Moved makeDraftStep and isPaintMissing alongside computeOrderIndex to src/lib/recipeSteps.ts since all are pure functions"
  - "Kept recipeSection.ts as a re-export barrel for DraftSection to avoid updating all feature-level consumers"
  - "Added standalone RecipeFormValues interface in types (not re-exported from Zod schema) to avoid transitive feature dependency"
  - "Used flat state shape in reducer (no nested objects) to match existing useState variable names exactly"
metrics:
  duration: 18m
  completed: 2026-05-22T12:51:52Z
---

# Phase 99 Plan 01: Query-Layer Isolation + ArmyListsPage Reducer Summary

Eliminated all feature-layer imports from the query layer by relocating 6 pure functions and 3 types to src/lib/ and src/types/, and replaced ArmyListsPage's 14 useState calls with a tested useReducer handling 24 action types with cascade resets.

## Task Results

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Relocate pure functions and types to lib/types layers | 5b0141e | Done |
| 2 | Extract armyListsReducer and replace 14 useState calls (TDD) | 582f6d0 (RED), 217eb56 (GREEN) | Done |

## Verification Results

| Check | Result |
|-------|--------|
| `grep -r "from.*@/features/" src/db/queries/ --include="*.ts"` | 0 matches (ARCH-01 complete) |
| `grep -c "useState" src/features/army-lists/ArmyListsPage.tsx` | 0 (ARCH-04 complete) |
| `pnpm build` | Passes (zero TypeScript errors) |
| `pnpm test` | 231 files pass, 2116 tests pass |
| Reducer test coverage | 27 tests covering all action types + cascade resets |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test files also imported from old feature paths**
- **Found during:** Task 1
- **Issue:** 4 test files imported from the old `@/features/` paths (computeGoalPeriod.test.ts, recipeDiff.test.ts, recipeSteps.test.ts, recipeStepRow.test.tsx)
- **Fix:** Updated all test file imports to new `@/lib/` and `@/types/` paths
- **Files modified:** tests/goals/computeGoalPeriod.test.ts, tests/painting/recipeDiff.test.ts, tests/painting/recipeSteps.test.ts, tests/painting/recipeStepRow.test.tsx
- **Commit:** 5b0141e

**2. [Rule 3 - Blocking] Feature-level recipe consumers imported from deleted files**
- **Found during:** Task 1
- **Issue:** 5 feature files (RecipeDetailSheet, RecipeStepList, RecipeStepRow, RecipeStepTimeline, SectionedTimeline) imported DraftStep/isPaintMissing from the deleted recipeSteps.ts
- **Fix:** Updated to import DraftStep from `@/types/recipe` and functions from `@/lib/recipeSteps`
- **Files modified:** 5 recipe feature files
- **Commit:** 5b0141e

**3. [Rule 1 - Bug] Unused type import in test file**
- **Found during:** Task 2
- **Issue:** `ArmyListsAction` was imported but unused in the test file, causing strict TypeScript error
- **Fix:** Removed the unused import
- **Commit:** 217eb56

## TDD Gate Compliance

1. RED gate: `test(99-01)` commit 582f6d0 -- tests written first, fail due to missing module
2. GREEN gate: `feat(99-01)` commit 217eb56 -- reducer implemented, all 27 tests pass
3. No REFACTOR needed -- code is clean as written

## Known Stubs

None -- all relocated functions are fully implemented with real logic.

## Self-Check: PASSED

All 5 created files exist. All 3 commits verified in git log.

---
phase: 37-schema-foundation-preflight-fixes
plan: "02"
subsystem: data-layer
tags: [performance, n-plus-one, batch-query, recipe-steps, react-query]
dependency_graph:
  requires:
    - migration-012-recipe-steps
    - recipe-queries-recipe-steps
  provides:
    - batch-step-count-query
    - useAllStepCounts-hook
    - recipe-step-counts-cache-key
  affects:
    - src/features/recipes
    - src/db/queries
    - src/hooks
tech_stack:
  added: []
  patterns:
    - batch-group-by-query-replaces-n-plus-one
    - cache-key-invalidation-symmetry
key_files:
  created: []
  modified:
    - src/db/queries/recipePaints.ts
    - src/hooks/useRecipePaints.ts
    - src/features/recipes/RecipesPage.tsx
    - src/features/recipes/RecipeFormSheet.tsx
decisions:
  - "Single GROUP BY query (getStepCountsByRecipe) returns all recipe step counts in one round-trip — O(1) vs O(N)"
  - "STEP_COUNTS_KEY=['recipe-step-counts'] declared as a module constant so RecipeFormSheet can import it or match by string literal"
  - "RecipesPage no longer imports from the query layer directly — all data flows through hooks (architecture rule enforced)"
metrics:
  duration_minutes: 4
  completed_date: "2026-05-07"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 4
requirements_satisfied:
  - SCHEMA-04
---

# Phase 37 Plan 02: N+1 Batch Step Count Fix Summary

**One-liner:** Replace RecipesPage N+1 step count loop with a single `SELECT recipe_id, COUNT(*) FROM recipe_steps GROUP BY recipe_id` batch query and dedicated hook.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add batch step count query and hook | 2c9f7ff | src/db/queries/recipePaints.ts, src/hooks/useRecipePaints.ts |
| 2 | Wire RecipesPage to use batch step count hook | a9c1ccc | src/features/recipes/RecipesPage.tsx, src/features/recipes/RecipeFormSheet.tsx |

## What Was Built

### Batch Step Count Query (SCHEMA-04)

`getStepCountsByRecipe()` added to `src/db/queries/recipePaints.ts`:
- Returns `RecipeStepCount[]` (`{recipe_id, step_count}`) for ALL recipes in one query
- Single `SELECT recipe_id, COUNT(*) AS step_count FROM recipe_steps GROUP BY recipe_id`
- O(1) query cost regardless of recipe count (was O(N) before)

### useAllStepCounts Hook

Added to `src/hooks/useRecipePaints.ts`:
- `STEP_COUNTS_KEY = ["recipe-step-counts"]` — dedicated cache key
- `useAllStepCounts()` — takes no arguments, returns `Map<number, number>` (recipe_id → step_count)
- `useAddRecipePaint.onSuccess` now invalidates `STEP_COUNTS_KEY` alongside existing keys
- `useRemoveRecipePaint.onSuccess` now invalidates `STEP_COUNTS_KEY` alongside existing keys

### RecipesPage Refactor

`src/features/recipes/RecipesPage.tsx`:
- Deleted local `useAllStepCounts(recipes)` function (N+1 loop — fetched ALL step columns just to count)
- Removed direct query-layer import `getRecipePaintsByRecipe` (architecture rule: components use hooks only)
- Removed unused `useQuery` import from `@tanstack/react-query`
- Imports and calls `useAllStepCounts()` (no arguments) from `@/hooks/useRecipePaints`
- Same `Map<number, number>` contract — `RecipeTable` receives `stepCountByRecipe` identically

### RecipeFormSheet Cache Key Fix

`src/features/recipes/RecipeFormSheet.tsx` line 253:
- Updated `qc.invalidateQueries` from `["recipe-paints", "all-counts"]` (stale key, no longer exists) to `["recipe-step-counts"]` (matches `STEP_COUNTS_KEY`)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `pnpm build` exits 0 (TypeScript strict + Vite build)
- `pnpm test` exits 0 (779 tests pass, 0 failures)
- `grep -c "getRecipePaintsByRecipe" src/features/recipes/RecipesPage.tsx` returns 0 (N+1 import removed)
- `grep "useAllStepCounts" src/features/recipes/RecipesPage.tsx` shows batch hook imported and called
- `grep "GROUP BY recipe_id" src/db/queries/recipePaints.ts` shows batch SQL query
- `grep "recipe-step-counts" src/features/recipes/RecipeFormSheet.tsx` shows correct cache key

## Self-Check: PASSED

All modified files verified. Task commits 2c9f7ff and a9c1ccc present in git log.

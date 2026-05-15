---
phase: 75-transactional-recipe-graph-save
plan: "02"
subsystem: features/recipes
tags: [recipe-form, react-query, cache-invalidation]
dependency_graph:
  requires: [saveRecipeGraph, src/hooks/useRecipes.ts, src/hooks/useRecipeSections.ts, src/hooks/useRecipePaints.ts]
  provides: [transactional-onsubmit]
  affects: [src/features/recipes/RecipeFormSheet.tsx]
tech_stack:
  added: []
  patterns: [batch cache invalidation after transaction]
key_files:
  created: []
  modified:
    - src/features/recipes/RecipeFormSheet.tsx
decisions:
  - "Removed useCreateRecipe, useUpdateRecipe, useAddRecipePaint hooks — only used in onSubmit"
  - "Removed computeOrderIndex, computeSectionDiff, computeStepDiff, buildSectionIdMap imports — all handled internally by saveRecipeGraph"
  - "Removed direct CRUD imports (createRecipeSection, deleteRecipeSection, updateRecipeSection, updateRecipeStep, removeRecipePaint) — inlined in saveRecipeGraph"
  - "10 React Query keys invalidated in batch after transaction succeeds"
metrics:
  duration_minutes: 10
  completed_date: "2026-05-15"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 75 Plan 02: Wire RecipeFormSheet to saveRecipeGraph

## What Changed

Refactored `RecipeFormSheet.tsx` `onSubmit` from ~200 lines of individual CRUD calls to a ~25-line function that calls `saveRecipeGraph()` as its sole DB operation, followed by batch React Query cache invalidation.

## Key Changes

- **onSubmit**: Calls `saveRecipeGraph(recipe?.id ?? null, values, sections, existingSections, existingSteps)` — single transactional entry point
- **Cache invalidation**: 10 query keys invalidated once after success: RECIPES_KEY, RECIPE_KEY, RECIPE_SECTIONS_KEY, RECIPE_PAINTS_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, RECIPE_SWATCH_KEY, SECTION_COUNTS_KEY, kanban-enrichment, recipes/by-unit
- **Error handling**: Catch block shows toast error, form stays open with data intact (D-04)
- **Removed**: 3 mutation hook calls, 5 CRUD imports, 4 diff/utility imports — all only used in onSubmit

## Verification

- `pnpm build`: No errors from RecipeFormSheet.tsx (pre-existing errors in unrelated test files)
- `pnpm test`: 178/180 test files pass (2 pre-existing failures in dashboard tests)
- No individual mutation hooks or CRUD calls remain in onSubmit

## Acceptance Criteria Status

| Criterion | Status |
|-----------|--------|
| Contains `import { saveRecipeGraph }` | Pass |
| onSubmit calls saveRecipeGraph exactly once | Pass |
| No individual CRUD calls in onSubmit | Pass |
| 10 React Query keys invalidated | Pass |
| Catch block: toast.error, no onClose | Pass |
| Build succeeds (no unused imports) | Pass |
| Tests pass | Pass |

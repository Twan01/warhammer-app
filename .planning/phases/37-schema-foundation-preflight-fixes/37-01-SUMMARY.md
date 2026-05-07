---
phase: 37-schema-foundation-preflight-fixes
plan: "01"
subsystem: data-layer
tags: [schema, migration, recipe-steps, typescript, bug-fix]
dependency_graph:
  requires: []
  provides:
    - migration-012-recipe-steps
    - recipe-step-type
    - recipe-metadata-type
    - recipe-queries-recipe-steps
    - kanban-enrichment-invalidation-fix
  affects:
    - src/features/recipes
    - src/db/queries
    - src/hooks
    - src/types
tech_stack:
  added: []
  patterns:
    - deprecated-alias-backward-compat
    - raw-assignment-for-clearable-nullable-fields
key_files:
  created:
    - src-tauri/migrations/012_recipe_steps.sql
  modified:
    - src-tauri/src/lib.rs
    - src/types/recipe.ts
    - src/types/recipePaint.ts
    - src/db/queries/recipes.ts
    - src/db/queries/recipePaints.ts
    - src/db/queries/paints.ts
    - src/hooks/useRecipes.ts
    - src/hooks/useRecipePaints.ts
    - src/features/recipes/recipeSchema.ts
    - src/features/recipes/RecipeFormSheet.tsx
    - tests/foundation/useRecipes.test.ts
    - tests/paint-inventory/recipePaintQuery.test.ts
    - tests/painting/RecipeTable.test.tsx
decisions:
  - "Deprecated alias pattern (RecipePaint = RecipeStep) avoids updating all import sites in one phase"
  - "New recipe metadata fields use raw assignment ($17-$22) in UPDATE so users can clear them; existing fields keep COALESCE"
  - "New step fields (painting_phase, tool, technique, dilution, time_estimate_minutes) default to null at insert time from RecipeFormSheet — full UI for these fields comes in Phase 38"
  - "result_photo_path column exists in DB and type, but no form field added — photo upload UI is Phase 40 (STEP-05)"
metrics:
  duration_minutes: 8
  completed_date: "2026-05-07"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 13
requirements_satisfied:
  - SCHEMA-01
  - SCHEMA-02
  - SCHEMA-03
---

# Phase 37 Plan 01: Schema Foundation + Preflight Fixes Summary

**One-liner:** Migration 012 renames recipe_paints to recipe_steps with 5 new step columns, adds 6 recipe metadata columns, and fixes the useDeleteRecipe kanban-enrichment cache invalidation bug.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create migration 012 and register in lib.rs | 759f00e | src-tauri/migrations/012_recipe_steps.sql, src-tauri/src/lib.rs |
| 2 | Update types, queries, hooks, schema, and form | f505f8c | src/types/*, src/db/queries/*, src/hooks/*, src/features/recipes/* |

## What Was Built

### Migration 012 (SCHEMA-01, SCHEMA-02)

`src-tauri/migrations/012_recipe_steps.sql` performs 12 ALTER TABLE statements:

- `ALTER TABLE recipe_paints RENAME TO recipe_steps` — preserves all existing rows + FKs
- 5 new step columns on recipe_steps: `painting_phase`, `tool`, `technique`, `dilution`, `time_estimate_minutes`
- 6 new metadata columns on painting_recipes: `style`, `surface`, `effect`, `difficulty`, `estimated_minutes`, `result_photo_path`

### TypeScript Data Layer

**Types:** `PaintingRecipe` gains 6 metadata fields. `RecipePaint` interface renamed to `RecipeStep` with 5 new step fields; deprecated `RecipePaint` alias preserves backward compat.

**Queries:** All SQL in `recipePaints.ts` updated to use `recipe_steps` table. `paints.ts` JOIN updated. `recipes.ts` INSERT/UPDATE extended to include 6 metadata columns; new metadata fields use raw assignment (not COALESCE) for clearability.

**Hooks:** `useDeleteRecipe` now invalidates `["kanban-enrichment"]` fixing SCHEMA-03.

**Schema + Form:** `recipeSchema.ts` gains 4 const arrays (RECIPE_STYLES, RECIPE_SURFACES, RECIPE_EFFECTS, RECIPE_DIFFICULTIES) and 6 new Zod fields. `RecipeFormSheet.tsx` wires 4 Select dropdowns and an estimated_minutes number input.

### SCHEMA-03 Bug Fix

`useDeleteRecipe.onSuccess` was missing the `["kanban-enrichment"]` invalidation, causing stale Kanban data after recipe deletion. Fixed to match `useCreateRecipe` and `useUpdateRecipe` symmetry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CreateRecipeStepInput requires new step fields at call sites**
- **Found during:** Task 2 (pnpm build)
- **Issue:** `CreateRecipeStepInput` now includes 5 required nullable fields (`painting_phase`, `tool`, `technique`, `dilution`, `time_estimate_minutes`) but `RecipeFormSheet.tsx` called `addRecipePaint.mutateAsync` without them
- **Fix:** Added all 5 new step fields as `null` to both `addRecipePaint` call sites in `RecipeFormSheet.tsx`
- **Files modified:** src/features/recipes/RecipeFormSheet.tsx
- **Commit:** f505f8c

**2. [Rule 1 - Bug] Test fixtures missing new PaintingRecipe metadata fields**
- **Found during:** Task 2 (pnpm build)
- **Issue:** `tests/foundation/useRecipes.test.ts` `MIN_CREATE_INPUT` and `tests/painting/RecipeTable.test.tsx` `makeRecipe` lacked the 6 new nullable metadata fields
- **Fix:** Added all 6 new fields as `null` to both test fixtures
- **Files modified:** tests/foundation/useRecipes.test.ts, tests/painting/RecipeTable.test.tsx
- **Commit:** f505f8c

**3. [Rule 1 - Bug] recipePaintQuery.test.ts asserted old SQL table name**
- **Found during:** Task 2 (pnpm test)
- **Issue:** `tests/paint-inventory/recipePaintQuery.test.ts` asserted `"SELECT DISTINCT recipe_id FROM recipe_paints WHERE paint_id = $1"` — the old table name
- **Fix:** Updated assertion to `recipe_steps`
- **Files modified:** tests/paint-inventory/recipePaintQuery.test.ts
- **Commit:** f505f8c

## Verification Results

- `pnpm build` exits 0 (TypeScript strict + Vite build)
- `pnpm test` exits 0 (779 tests pass, 0 failures)
- `grep -c "recipe_paints" src/db/queries/recipePaints.ts` returns 0
- `grep "kanban-enrichment" src/hooks/useRecipes.ts` shows 3 invalidations (create/update/delete all covered)
- `grep "recipe_steps" src/db/queries/recipePaints.ts` shows 6 references
- `grep "version: 12" src-tauri/src/lib.rs` confirms migration registration

## Self-Check: PASSED

All created/modified files verified to exist and all commits present.

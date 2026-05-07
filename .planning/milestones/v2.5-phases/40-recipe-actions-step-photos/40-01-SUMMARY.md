---
phase: 40-recipe-actions-step-photos
plan: "01"
subsystem: recipes/data-layer
tags: [migration, types, queries, hooks, tests]
dependency_graph:
  requires: []
  provides:
    - migration-013-step-photos-alt-paint
    - RecipeStep-step_photo_path-alt_paint_id
    - DraftStep-step_photo_path-alt_paint_id
    - addRecipePaint-12-columns
    - duplicateRecipe-function
    - useDuplicateRecipe-hook
  affects:
    - src/features/recipes/RecipeFormSheet.tsx
    - src/hooks/useRecipes.ts
    - src/db/queries/recipePaints.ts
    - src/db/queries/recipes.ts
tech_stack:
  added: []
  patterns:
    - "ALTER TABLE migration pattern — Phase 40 new columns via migration 013"
    - "12-column positional INSERT with $1..$12 (Tauri plugin-sql requirement)"
    - "duplicateRecipe reads original + copies all rows including new Phase 40 fields"
key_files:
  created:
    - src-tauri/migrations/013_step_photos_alt_paint.sql
    - tests/painting/duplicateRecipe.test.ts
  modified:
    - src/types/recipePaint.ts
    - src/features/recipes/recipeSteps.ts
    - src/db/queries/recipePaints.ts
    - src/db/queries/recipes.ts
    - src/hooks/useRecipes.ts
    - tests/painting/recipeSteps.test.ts
    - tests/painting/addRecipePaintQuery.test.ts
    - src/features/recipes/RecipeFormSheet.tsx
    - tests/foundation/useAllStepCounts.test.ts
    - tests/painting/formatMinutes.test.tsx
    - tests/painting/recipeStepRow.test.tsx
decisions:
  - "step_photo_path TEXT nullable — no NOT NULL constraint, photos are optional at step level"
  - "alt_paint_id INTEGER REFERENCES paints(id) — FK to paints table, nullable for optional substitute"
  - "DraftStep mirrors RecipeStep new fields — null initialization matches makeDraftStep() pattern"
  - "duplicateRecipe copies all 12 step columns including Phase 40 fields — avoids data loss on duplication"
  - "useDuplicateRecipe invalidates RECIPE_SWATCH_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY — new recipe has steps so all caches affected"
metrics:
  duration: "~6 minutes"
  completed_date: "2026-05-07"
  tasks_completed: 2
  files_modified: 11
---

# Phase 40 Plan 01: Data Layer Foundation — Step Photos + Alt Paint + duplicateRecipe

**One-liner:** SQLite migration 013 adds `step_photo_path`/`alt_paint_id` columns; TypeScript types, 12-column `addRecipePaint` INSERT, and `duplicateRecipe` function with full 12-column step copy establish the data layer for Phase 40.

## What Was Built

### Migration 013
`src-tauri/migrations/013_step_photos_alt_paint.sql` adds two columns to `recipe_steps` via `ALTER TABLE`:
- `step_photo_path TEXT` — path to a per-step photo (nullable)
- `alt_paint_id INTEGER REFERENCES paints(id)` — FK to a substitute paint (nullable)

### Type Updates
`RecipeStep` interface now includes both new fields before `created_at`. `CreateRecipeStepInput` inherits them automatically via `Omit`. `DraftStep` interface and `makeDraftStep()` factory also updated with both fields initialized to `null`.

### 12-Column addRecipePaint
`addRecipePaint` expanded from 10 to 12 columns with `$11` (`step_photo_path`) and `$12` (`alt_paint_id`) positional params.

### duplicateRecipe Function
New export in `src/db/queries/recipes.ts` that:
1. Reads the original recipe (throws `"Recipe not found"` if missing)
2. Inserts a recipe copy with all 21 metadata fields and the provided `newName`
3. Reads original steps ordered by `order_index`
4. Copies each step with all 12 columns including Phase 40 fields

### useDuplicateRecipe Hook
New mutation hook in `useRecipes.ts` that calls `duplicateRecipe` and invalidates six query keys: `RECIPES_KEY`, `kanban-enrichment`, `recipes/by-unit`, `RECIPE_SWATCH_KEY`, `STEP_COUNTS_KEY`, `RECIPE_AVAILABILITY_KEY`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RecipeFormSheet existing-step mapper missing new fields**
- **Found during:** Task 2 (pnpm build type check)
- **Issue:** The `useEffect` that re-initializes draft steps from `existingSteps` did not include `step_photo_path` or `alt_paint_id`, causing TypeScript errors (missing from `DraftStep`)
- **Fix:** Added both fields with `?? null` guards to the mapper object
- **Files modified:** `src/features/recipes/RecipeFormSheet.tsx`
- **Commit:** 0b3aae0

**2. [Rule 1 - Bug] RecipeFormSheet addRecipePaint.mutateAsync calls missing new fields**
- **Found during:** Task 2 (pnpm build type check)
- **Issue:** Both `mutateAsync` calls (edit path and create path) passed only 10-field objects to `addRecipePaint`, which now expects 12 columns
- **Fix:** Added `step_photo_path: s.step_photo_path ?? null` and `alt_paint_id: s.alt_paint_id ?? null` to both call sites
- **Files modified:** `src/features/recipes/RecipeFormSheet.tsx`
- **Commit:** 0b3aae0

**3. [Rule 1 - Bug] Test fixtures missing new RecipeStep/DraftStep fields**
- **Found during:** Task 2 (pnpm build type check)
- **Issue:** Three test files had fixture helpers that created `RecipeStep` or `DraftStep` objects without the new fields: `useAllStepCounts.test.ts` (`MIN_ADD_INPUT`), `formatMinutes.test.tsx` (`makeStep`), `recipeStepRow.test.tsx` (`makeDraftStep`)
- **Fix:** Added `step_photo_path: null` and `alt_paint_id: null` to each fixture
- **Files modified:** `tests/foundation/useAllStepCounts.test.ts`, `tests/painting/formatMinutes.test.tsx`, `tests/painting/recipeStepRow.test.tsx`
- **Commit:** 0b3aae0

## Test Results

| Test File | Tests | Result |
|---|---|---|
| tests/painting/recipeSteps.test.ts | 16 | PASS |
| tests/painting/addRecipePaintQuery.test.ts | 5 | PASS |
| tests/painting/duplicateRecipe.test.ts | 7 (new) | PASS |
| Full suite | 889 passed, 2 skipped, 12 todo | PASS |

`pnpm build`: succeeded (no type errors; chunk-size warning is pre-existing).

## Commits

| Hash | Message |
|---|---|
| 6a3dd62 | feat(40-01): migration 013 + step_photo_path/alt_paint_id type updates |
| 0b3aae0 | feat(40-01): 12-column addRecipePaint, duplicateRecipe function, useDuplicateRecipe hook |

## Self-Check: PASSED

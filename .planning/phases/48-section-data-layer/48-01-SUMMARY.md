---
phase: 48-section-data-layer
plan: "01"
subsystem: data-layer
tags: [migration, types, recipe-sections, sqlite]
dependency_graph:
  requires: []
  provides: [018_recipe_sections.sql, RecipeSection, RecipeStep.section_id]
  affects: [RecipeFormSheet, addRecipePaint consumers, test fixtures]
tech_stack:
  added: []
  patterns: [entity/createInput/updateInput triple, nullable FK column migration, data migration INSERT+UPDATE]
key_files:
  created:
    - src-tauri/migrations/018_recipe_sections.sql
    - src/types/recipeSection.ts
  modified:
    - src/types/recipePaint.ts
    - src/features/recipes/RecipeFormSheet.tsx
    - tests/foundation/useAllStepCounts.test.ts
    - tests/painting/addRecipePaintQuery.test.ts
    - tests/painting/duplicateRecipe.test.ts
    - tests/painting/formatMinutes.test.tsx
decisions:
  - "section_id: null passed at all existing addRecipePaint call sites — Phase 50 form will supply real section_id values"
  - "No UNIQUE constraint on (recipe_id, order_index) — reorder loop would hit conflicts before all rows update"
  - "ON DELETE CASCADE on recipe_steps.section_id chains correctly to painting_sessions.recipe_step_id ON DELETE SET NULL from migration 014"
metrics:
  duration_seconds: 185
  completed_date: "2026-05-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 6
---

# Phase 48 Plan 01: Section Data Layer Foundation Summary

**One-liner:** SQLite migration 018 creates recipe_sections table with FK cascade chain; RecipeSection type triple added; RecipeStep gains nullable section_id field with zero-data-loss backfill for all existing steps.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create migration 018_recipe_sections.sql | 563ce5c | src-tauri/migrations/018_recipe_sections.sql |
| 2 | Create RecipeSection types and update RecipeStep | 6216ca5 | src/types/recipeSection.ts, recipePaint.ts, RecipeFormSheet.tsx, 4 test files |

## Decisions Made

1. **section_id: null at existing call sites** — RecipeFormSheet and all test fixtures now pass `section_id: null` explicitly. Phase 50 will wire up the actual section picker and supply real section_id values. This satisfies TypeScript's strict inference from `CreateRecipeStepInput`.

2. **No UNIQUE constraint on order_index** — A reorder loop that sequentially updates order_index values would conflict before all rows are updated. No unique constraint is the correct choice per plan.

3. **Cascade chain verified** — migration 018 uses `ON DELETE CASCADE` on `recipe_steps.section_id`. Section deletion cascades to step deletion. Step deletion triggers `ON DELETE SET NULL` on `painting_sessions.recipe_step_id` (migration 014), so sessions are preserved with their recipe_step_id cleared.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript errors from new required section_id field**
- **Found during:** Task 2 — pnpm build after adding section_id to RecipeStep
- **Issue:** Adding `section_id: number | null` to `RecipeStep` propagates through `CreateRecipeStepInput = Omit<RecipeStep, "id" | "created_at">`, making section_id required. Existing call sites in RecipeFormSheet (2 addRecipePaint calls) and 4 test fixture helpers were missing the field.
- **Fix:** Added `section_id: null` to both addRecipePaint.mutateAsync calls in RecipeFormSheet.tsx; added `section_id: null` to makeInput() base in addRecipePaintQuery.test.ts, to MIN_ADD_INPUT in useAllStepCounts.test.ts, to both RecipeStep fixtures in duplicateRecipe.test.ts, and to makeStep() in formatMinutes.test.tsx.
- **Files modified:** src/features/recipes/RecipeFormSheet.tsx, tests/foundation/useAllStepCounts.test.ts, tests/painting/addRecipePaintQuery.test.ts, tests/painting/duplicateRecipe.test.ts, tests/painting/formatMinutes.test.tsx
- **Commit:** 6216ca5

## Verification

- pnpm build: PASSED (TypeScript + Vite build succeed)
- Migration 018 contains all 4 SQL statements: CREATE TABLE, ALTER TABLE, INSERT...SELECT, UPDATE...SET
- RecipeSection interface: 9 fields matching migration columns exactly
- CreateRecipeSectionInput: omits id, created_at, updated_at
- UpdateRecipeSectionInput: omits recipe_id, partial remaining fields, requires id
- RecipeStep.section_id: number | null present
- No UNIQUE constraint on (recipe_id, order_index) in migration

## Self-Check: PASSED

Files verified:
- src-tauri/migrations/018_recipe_sections.sql: EXISTS
- src/types/recipeSection.ts: EXISTS
- src/types/recipePaint.ts: modified with section_id field
- Commits 563ce5c and 6216ca5: both present in git log

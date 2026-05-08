---
phase: 48-section-data-layer
plan: "02"
subsystem: data-layer
tags: [recipe-sections, react-query, sqlite, cache-invalidation, tdd]
dependency_graph:
  requires: [48-01]
  provides: [49-section-ui, 50-section-form, 51-duplication]
  affects: [src/db/queries/recipePaints.ts, src/hooks/useRecipePaints.ts]
tech_stack:
  added: []
  patterns:
    - "CASCADE INVALIDATION CONTRACT: 5-key delete invalidation with documentation comment"
    - "SectionStepCount batch query mirrors RecipeStepCount pattern (GROUP BY, IS NOT NULL guard)"
    - "COALESCE for non-nullable UPDATE fields, direct assign for nullable fields (surface, notes)"
    - "Sequential UPDATE loop for reorderRecipeSections — no UNIQUE constraint on order_index"
key_files:
  created:
    - src/db/queries/recipeSections.ts
    - src/hooks/useRecipeSections.ts
    - tests/painting/recipeSections.test.ts
  modified:
    - src/db/queries/recipePaints.ts
decisions:
  - "updateRecipeSection uses COALESCE for name/optional/order_index but direct assign for surface/notes because null is a valid clear-value for the latter two fields"
  - "useUpdateRecipeSection mutation input type is UpdateRecipeSectionInput & { recipe_id: number } so the hook can invalidate the per-recipe cache key without adding recipe_id to the DB update path"
  - "reorderRecipeSections uses sequential db.execute loop rather than a single CTE because tauri-plugin-sql does not support multi-statement transactions from the JS side and there is no UNIQUE constraint to violate during sequential updates"
metrics:
  duration: "324s"
  completed_date: "2026-05-08"
  tasks_completed: 3
  files_created: 3
  files_modified: 1
---

# Phase 48 Plan 02: Section Data Layer — Query Module and Hooks Summary

**One-liner:** Full CRUD + reorder + batch step-count query layer for recipe sections with documented 5-key cascade invalidation contract on delete.

## What Was Built

**recipeSections.ts** — 6 query functions backed by `getDb()` singleton:
- `getRecipeSections(recipeId)` — SELECT ordered by `order_index ASC, id ASC`
- `createRecipeSection(input)` — 6-column INSERT returning `lastInsertId`
- `updateRecipeSection(input)` — COALESCE for name/optional/order_index, direct assign for surface/notes (nullable clear semantics)
- `deleteRecipeSection(id)` — DELETE; ON DELETE CASCADE in migration 018 handles step cleanup
- `reorderRecipeSections(sections[])` — sequential UPDATE loop, one call per section
- `getStepCountsBySection()` — GROUP BY section_id with IS NOT NULL guard

**useRecipeSections.ts** — 2 key exports + 6 hooks:
- `RECIPE_SECTIONS_KEY(recipeId)` — per-recipe factory key
- `SECTION_STEP_COUNTS_KEY` — global batch key
- `useDeleteRecipeSection` implements the full **5-key CASCADE INVALIDATION CONTRACT** (documented in comment block): RECIPE_SECTIONS_KEY, RECIPE_PAINTS_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, RECIPE_SWATCH_KEY
- Create/update/reorder invalidate only RECIPE_SECTIONS_KEY
- `useSectionStepCounts` returns `Map<section_id, step_count>` via same transform pattern as `useAllStepCounts`

**recipePaints.ts (updated)** — `addRecipePaint` INSERT extended from 12 to 13 columns: `section_id` added as `$13` with `input.section_id ?? null` null guard.

**recipeSections.test.ts** — 17 tests across 9 describe groups covering all 6 query functions, the updated addRecipePaint INSERT, and compile-time type shape assertions for both RecipeSection (9 keys) and RecipeStep (section_id field). All 1049 tests pass.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

| Check | Result |
|---|---|
| src/db/queries/recipeSections.ts | FOUND |
| src/hooks/useRecipeSections.ts | FOUND |
| tests/painting/recipeSections.test.ts | FOUND |
| src/db/queries/recipePaints.ts (modified) | FOUND |
| Commit c21df29 (Task 1) | FOUND |
| Commit ab15602 (Task 2) | FOUND |
| Commit 9bd1a4f (Task 3) | FOUND |
| pnpm build | PASSED |
| pnpm test (1049 tests) | PASSED — no regressions |

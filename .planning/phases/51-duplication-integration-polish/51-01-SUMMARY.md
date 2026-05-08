---
phase: 51-duplication-integration-polish
plan: "01"
subsystem: painting/recipes
tags: [duplication, sections, cache-invalidation, tdd]
dependency_graph:
  requires: [48-01, 49-01, 50-01]
  provides: [INTG-01, INTG-02, INTG-03]
  affects: [useRecipes, useRecipeSections, duplicateRecipe]
tech_stack:
  added: []
  patterns: [Map-remap, GROUP-BY-batch-query, TDD-red-green]
key_files:
  created:
    - tests/painting/recipeSectionCount.test.ts
  modified:
    - src/db/queries/recipes.ts
    - src/db/queries/recipeSections.ts
    - src/hooks/useRecipeSections.ts
    - src/hooks/useRecipes.ts
    - tests/painting/duplicateRecipe.test.ts
decisions:
  - "sectionIdMap uses Map<number, number> built during section copy loop — ensures O(1) remapping per step with no extra SQL queries"
  - "step section_id null path: sectionIdMap.get() returns undefined for null keys — explicit null check before Map.get() preserves null as null"
  - "useDuplicateRecipe invalidates ['recipe-sections'] prefix (not RECIPE_SECTIONS_KEY factory) — covers all per-recipe section cache entries in one call"
metrics:
  duration_seconds: 404
  completed_date: "2026-05-08"
  tasks_completed: 3
  files_modified: 5
---

# Phase 51 Plan 01: Duplication Integration + Section Count Query Summary

Section-aware duplicateRecipe with Map<oldSectionId, newSectionId> remapping, getSectionCountsByRecipe batch query, SECTION_COUNTS_KEY/useAllSectionCounts hook, and 8-key useDuplicateRecipe cache invalidation.

## Tasks Completed

| # | Name | Commit | Result |
|---|------|--------|--------|
| 0 | RED-phase test scaffold for recipeSectionCount | fbe8ffc | 3 failing assertions (expected RED) |
| 1 | duplicateRecipe section copy pass + ID remapping | 97a47f0 | All duplicateRecipe tests GREEN |
| 2 | getSectionCountsByRecipe + useAllSectionCounts + invalidation | 9e68e9b | All tests GREEN, build passes |

## What Was Built

### duplicateRecipe section copy pass (INTG-01)

`src/db/queries/recipes.ts` — `duplicateRecipe` now executes a 3-phase copy:
1. Recipe INSERT (unchanged)
2. Section copy loop: SELECT original sections, INSERT copies, build `sectionIdMap: Map<number, number>` mapping old section IDs to new ones
3. Step copy loop: remap each step's `section_id` via `sectionIdMap.get()`, null preserved as null; step INSERT now includes `section_id` as 13th column (`$13`)

### getSectionCountsByRecipe batch query (INTG-02)

`src/db/queries/recipeSections.ts` — new `getSectionCountsByRecipe()` function with `RecipeSectionCount` interface. Single `SELECT recipe_id, COUNT(*) AS section_count FROM recipe_sections GROUP BY recipe_id` query — used by Plan 02 for RecipeCard section badge display.

### useAllSectionCounts hook + SECTION_COUNTS_KEY (INTG-02)

`src/hooks/useRecipeSections.ts` — exports `SECTION_COUNTS_KEY = ["recipe-section-counts"]` and `useAllSectionCounts()` hook that returns `Map<recipeId, sectionCount>`, mirroring the `useAllStepCounts` pattern from `useRecipePaints.ts`.

### 8-key useDuplicateRecipe invalidation (INTG-03)

`src/hooks/useRecipes.ts` — `useDuplicateRecipe.onSuccess` now invalidates 8 cache keys:
1. `RECIPES_KEY`
2. `["kanban-enrichment"]`
3. `["recipes", "by-unit"]`
4. `RECIPE_SWATCH_KEY`
5. `STEP_COUNTS_KEY`
6. `RECIPE_AVAILABILITY_KEY`
7. `["recipe-sections"]` (RECIPE_SECTIONS_KEY prefix — covers all per-recipe section queries)
8. `SECTION_COUNTS_KEY`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `pnpm test -- tests/painting/recipeSectionCount.test.ts` — PASS (3 tests, GREEN)
- `pnpm test -- tests/painting/duplicateRecipe.test.ts` — PASS (8 tests, GREEN)
- `pnpm test` — PASS (134 files, 1109 tests)
- `pnpm build` — PASS (TypeScript compilation clean)

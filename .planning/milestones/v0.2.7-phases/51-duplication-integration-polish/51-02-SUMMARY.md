---
phase: 51-duplication-integration-polish
plan: "02"
subsystem: recipes
tags: [section-count, recipe-card, progressive-disclosure, intg-02, intg-03]
dependency_graph:
  requires: ["51-01"]
  provides: ["sectionCount display on RecipeCard", "sectionCountByRecipe prop chain"]
  affects: ["src/features/recipes/RecipeCard.tsx", "src/features/recipes/RecipeCardGrid.tsx", "src/features/recipes/RecipesPage.tsx"]
tech_stack:
  added: []
  patterns: ["progressive disclosure (hide section count when <= 1)", "prop threading through Grid -> Card", "batch query hook wired in Page"]
key_files:
  created: []
  modified:
    - src/features/recipes/RecipeCard.tsx
    - src/features/recipes/RecipeCardGrid.tsx
    - src/features/recipes/RecipesPage.tsx
    - tests/painting/RecipeCard.test.tsx
    - tests/painting/RecipeCardGrid.test.tsx
decisions:
  - "sectionCount <= 1 hides the section row entirely — single-section recipes show step count only (progressive disclosure threshold confirmed)"
  - "useAllSectionCounts called at RecipesPage level alongside useAllStepCounts — same pattern, single batch query, Map<number,number> threaded down"
metrics:
  duration: ~8min
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_modified: 5
requirements_satisfied: [INTG-02, INTG-03]
---

# Phase 51 Plan 02: Section Count Display on RecipeCard Summary

Section count badge displayed on RecipeCard using LayoutList icon with progressive disclosure (hidden when sectionCount <= 1), wired end-to-end from useAllSectionCounts in RecipesPage through RecipeCardGrid down to RecipeCard.

## What Was Built

### Task 1 — Add sectionCount prop to RecipeCard + RecipeCardGrid

`RecipeCardProps` gained a required `sectionCount: number` field. When `sectionCount > 1`, the stats row renders a `<LayoutList className="h-3 w-3" />` icon followed by `{N} sections`. When `sectionCount <= 1` the section span is omitted entirely — only steps and estimated time are shown.

`RecipeCardGridProps` gained `sectionCountByRecipe: Map<number, number>` and threads it to each `RecipeCard` as `sectionCount={sectionCountByRecipe.get(recipe.id) ?? 0}`.

Tests updated:
- `RecipeCard.test.tsx`: added `sectionCount: 0` to default props; added Tests 10–12 covering show at 3, hide at 1, hide at 0.
- `RecipeCardGrid.test.tsx`: added `sectionCountByRecipe: new Map()` to default props.

Commit: `beb85e7`

### Task 2 — Wire useAllSectionCounts in RecipesPage

`RecipesPage` now imports `useAllSectionCounts` from `@/hooks/useRecipeSections` and calls it with a `new Map<number, number>()` default. The resulting `sectionCountByRecipe` Map is passed as a prop to `RecipeCardGrid`. Full test suite (1112 tests) confirmed zero regressions across all existing recipe flows: availability badges, swatch strips, step counts, LogSession, RecipeDetailSheet, CRUD.

Commit: `246b2fc`

## Verification

- `pnpm build` exits 0 — TypeScript clean, no unused locals/params
- `pnpm test` exits 0 — 1112 passed, 6 skipped, 12 todo (INTG-03 regression suite green)
- RecipeCard conditionally shows "{N} sections" only when sectionCount > 1 (Tests 10–12 verify this)

## Deviations from Plan

None — plan executed exactly as written. All four files listed in the plan's `files_modified` frontmatter were already partially modified (from prior work in the git working tree) and were completed in full.

## Key Links Verified

- `RecipesPage.tsx` imports `useAllSectionCounts` from `@/hooks/useRecipeSections` ✓
- `RecipesPage.tsx` passes `sectionCountByRecipe={sectionCountByRecipe}` to `RecipeCardGrid` ✓
- `RecipeCardGrid.tsx` passes `sectionCount={sectionCountByRecipe.get(recipe.id) ?? 0}` to `RecipeCard` ✓
- `RecipeCard.tsx` contains `LayoutList` import and `{sectionCount > 1 && (` conditional ✓

## Self-Check: PASSED

Files exist:
- src/features/recipes/RecipeCard.tsx ✓
- src/features/recipes/RecipeCardGrid.tsx ✓
- src/features/recipes/RecipesPage.tsx ✓
- tests/painting/RecipeCard.test.tsx ✓
- tests/painting/RecipeCardGrid.test.tsx ✓

Commits exist:
- beb85e7 ✓
- 246b2fc ✓

---
phase: 39
plan: "02"
subsystem: recipes
tags: [card-grid, paint-availability, studio-ux, filters, tdd]
dependency_graph:
  requires: ["39-01"]
  provides: ["RecipeCard", "RecipeCardGrid", "applyRecipeFilters", "RecipesPage card grid"]
  affects: ["RecipesPage", "recipe-paint-availability hook"]
tech_stack:
  added: []
  patterns: ["Card grid with auto-fill", "pure filter function extracted to applyRecipeFilters.ts", "StringFilter local component", "TDD red-green cycle"]
key_files:
  created:
    - src/features/recipes/RecipeCard.tsx
    - src/features/recipes/RecipeCardGrid.tsx
    - src/features/recipes/applyRecipeFilters.ts
    - tests/painting/RecipeCard.test.tsx
    - tests/painting/RecipeCardGrid.test.tsx
    - tests/painting/recipeStudioFilters.test.ts
  modified:
    - src/features/recipes/RecipesPage.tsx
  deleted:
    - src/features/recipes/RecipeTable.tsx
    - src/features/recipes/RecipeTableColumns.tsx
    - tests/painting/RecipeTable.test.tsx
decisions:
  - "applyRecipeFilters extracted to its own file (applyRecipeFilters.ts) following the applyEntityFilters pattern in other features"
  - "StringFilter local component reused for Surface/Style/Difficulty — single-select popover with __any__ sentinel, variant changes to default when active"
  - "difficultyColors uses literal class strings (not dynamic) to avoid Tailwind purge removing unused utility classes"
  - "Availability badge uses inline style backgroundColor (#ef4444/#f59e0b/#22c55e) rather than Tailwind utilities for color accuracy and purge safety"
  - "RecipeCardGrid uses _units parameter naming to suppress noUnusedParameters TS error while preserving the prop in the interface for future use"
metrics:
  duration: "12 minutes"
  completed: "2026-05-07"
  tasks_completed: 2
  files_created: 6
  files_modified: 1
  files_deleted: 3
---

# Phase 39 Plan 02: Recipe Card Grid and Studio Filters Summary

**One-liner:** Replaced RecipeTable with a responsive RecipeCard grid showing swatch strips, difficulty/surface badges, and green/amber/red paint availability indicators, plus four new filter controls (surface, style, difficulty, missing-paints).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create RecipeCard and RecipeCardGrid | `684ee2e` | RecipeCard.tsx, RecipeCardGrid.tsx, 2 test files |
| 2 | Wire RecipesPage, add filters, delete old files | `b00099c` | RecipesPage.tsx, applyRecipeFilters.ts, recipeStudioFilters.test.ts |

## What Was Built

**RecipeCard.tsx** — Pure presentational card component receiving all data as props:
- Recipe name as card title
- Faction badge with `style={{ backgroundColor: faction.color_theme }}`
- Swatch strip: overlapping 12px circles (8-max + "+N" overflow), extracted from RecipeTableColumns
- Surface badge (outline variant) + difficulty badge with `difficultyColors` literal lookup
- Stats row: step count (Layers icon) + estimated time (Clock icon)
- Availability badge: green dot (all owned), amber dot (running low), red dot (missing), combined with `·` separator for mixed states
- Edit/Delete action row with `e.stopPropagation()` to prevent card click

**RecipeCardGrid.tsx** — Grid wrapper:
- `repeat(auto-fill, minmax(280px, 1fr))` CSS grid via inline style
- Loading: 6 skeleton cards with `data-testid="recipe-card-skeleton"`
- Empty: RecipeEmptyState
- Data: RecipeCard instances with factionMap from useMemo

**applyRecipeFilters.ts** — Pure filter function following the `applyEntityFilters` pattern:
- All 4 existing filters (faction, unit, area, paint) preserved
- 4 new filters: surfaceFilter, styleFilter, difficultyFilter, hasMissingFilter
- hasMissingFilter excludes recipes not in the availability map (no paint links)

**RecipesPage.tsx** — Updated page:
- Imports RecipeCardGrid instead of RecipeTable
- Calls `useRecipePaintAvailability()` for availability data
- 4 new filter state variables
- StringFilter local component (single-select Popover + Command)
- "Missing paints" toggle button (variant changes to default when active)
- Clear filters button resets all 8 filters

## Tests Written

| File | Tests | Coverage |
|------|-------|----------|
| tests/painting/RecipeCard.test.tsx | 9 | Name, faction badge, difficulty color, time, steps, swatch dots, availability states, onClick |
| tests/painting/RecipeCardGrid.test.tsx | 3 | Data rendering, empty state, loading skeletons |
| tests/painting/recipeStudioFilters.test.ts | 7 | Surface/style/difficulty filters, hasMissing, combinations |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes

- `pnpm build` shows 2 pre-existing TypeScript errors in `tests/painting/formatMinutes.test.tsx` that existed before this plan. They are out of scope and deferred.
- Pre-existing build errors in `LoadoutSection.tsx`, `PlaybookTab.tsx`, `useRulesSync.ts` (unrelated to recipes) were also present before and remain unchanged.

## Self-Check

- [x] src/features/recipes/RecipeCard.tsx exists — FOUND
- [x] src/features/recipes/RecipeCardGrid.tsx exists — FOUND
- [x] src/features/recipes/applyRecipeFilters.ts exists — FOUND
- [x] src/features/recipes/RecipeTable.tsx does NOT exist — CONFIRMED
- [x] src/features/recipes/RecipeTableColumns.tsx does NOT exist — CONFIRMED
- [x] Commit 684ee2e exists — FOUND
- [x] Commit b00099c exists — FOUND
- [x] All 19 targeted tests pass — CONFIRMED (117 test files, 869 tests)

## Self-Check: PASSED

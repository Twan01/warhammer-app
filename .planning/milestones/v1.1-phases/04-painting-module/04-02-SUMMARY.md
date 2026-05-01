---
phase: 04-painting-module
plan: 02
subsystem: ui
tags: [react, tanstack-table, zod, sonner, radix-ui, sheet, popover, command]

# Dependency graph
requires:
  - phase: 04-painting-module plan 00
    provides: recipeSteps.ts (isPaintMissing, DraftStep), PaintCombobox, @dnd-kit setup, test stubs
  - phase: 02-data-layer-entity-crud
    provides: recipe/recipePaint DB queries, useRecipes/useRecipePaints hooks, PaintingRecipe type
provides:
  - recipeSchema zod schema + RecipeFormValues type (consumed by plan 04-03)
  - RecipeTable TanStack Table component with skeleton/empty state/row click
  - RecipeTableColumns buildRecipeColumns — name/faction/unit/area/stepCount/actions columns
  - RecipeEmptyState — BookOpen icon + "No recipes yet" + Add Recipe CTA
  - RecipeDeleteDialog — confirm dialog with success/error Sonner toasts
  - RecipeDetailSheet — read-only Sheet with ordered steps + green/red owned dots (RECIPE-06)
  - RecipesPage — page container with faction multi-select, unit single-select, area text filter
  - /recipes route live (PlaceholderPage replaced)
affects: [04-03-painting-module, 05-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - buildRecipeColumns factory pattern (mirrors buildColumns from UnitTableColumns)
    - useAllStepCounts local hook with composite query key ['recipe-paints', 'all-counts', ...ids]
    - RecipeDetailSheet keyed on recipe.id to force fresh mount when switching rows

key-files:
  created:
    - src/features/recipes/recipeSchema.ts
    - src/features/recipes/RecipeEmptyState.tsx
    - src/features/recipes/RecipeDeleteDialog.tsx
    - src/features/recipes/RecipeTableColumns.tsx
    - src/features/recipes/RecipeTable.tsx
    - src/features/recipes/RecipeDetailSheet.tsx
    - src/features/recipes/RecipesPage.tsx
  modified:
    - src/app/recipes/page.tsx (PlaceholderPage removed, re-exports RecipesPage)
    - tests/painting/RecipeTable.test.tsx (it.skip stubs filled — RECIPE-07, RECIPE-08)

key-decisions:
  - "recipeSchema uses .nullable() not .default() on all optional fields (Pitfall 3 — matches 02-03 factionSchema decision; form defaultValues handle defaults)"
  - "useAllStepCounts queries getRecipePaintsByRecipe per recipe; invalidate ['recipe-paints', 'all-counts'] on mutations in plan 04-03 OR replace with bulk count query if performance degrades"
  - "RecipesPage.onAddRecipe / onEditRecipe are console.warn no-ops — explicit handoff to plan 04-03 which wires the form Sheet"
  - "RecipeDetailSheet owns zero fetch state for steps — it calls useRecipePaints(recipe?.id) directly (pattern from UnitDetailSheet)"

patterns-established:
  - "RecipeDetailSheet key={recipe?.id ?? 'none'}: forces fresh mount when switching recipes, prevents stale step data (POLISH-04 pattern from UnitDetailSheet)"
  - "Step dots: text-green-500 (owned) / text-red-500 (missing) driven by isPaintMissing from recipeSteps.ts"
  - "Filter bar inline in RecipesPage (not extracted to separate component): faction multi-select + unit single-select + area text input as three standalone helpers in same file"

requirements-completed: [RECIPE-04, RECIPE-06, RECIPE-07, RECIPE-08]

# Metrics
duration: 5min
completed: 2026-05-01
---

# Phase 04 Plan 02: Recipes List Surface Summary

**TanStack Table recipe list with faction/unit/area filters, read-only detail Sheet with green/red owned dots, delete confirm dialog, empty state, and recipeSchema — /recipes route live**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-01T08:24:56Z
- **Completed:** 2026-05-01T08:29:39Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Full recipe list surface: RecipesPage with filter bar, RecipeTable, RecipeDetailSheet, RecipeDeleteDialog all wired together
- RECIPE-06: Detail sheet renders ordered steps with green dot (owned, `paint.owned === 1`) / red dot (missing) via `isPaintMissing`
- RECIPE-07: Faction multi-select Popover + Unit single-select Popover + Area text Input narrow the table live via `useMemo` filter
- RECIPE-08: RecipeEmptyState with BookOpen icon and "No recipes yet" heading renders when no recipes
- RECIPE-04: RecipeDeleteDialog confirms before delete; toast.success("Recipe deleted.") on success, toast.error("Failed to delete recipe. Please try again.") on error
- recipeSchema with RecipeFormValues type exported — consumed by plan 04-03's form (no `.default()` per Pitfall 3)
- PlaceholderPage removed from /recipes route — RecipesPage now renders

## Component Tree

```
RecipesPage
├── FactionFilter (Popover + Command, multi-select)
├── UnitFilter (Popover + Command, single-select)
├── Input (area text filter)
├── RecipeTable
│   ├── buildRecipeColumns → name / faction / linkedUnit / area / stepCount / actions
│   └── RecipeEmptyState (when data=[])
├── RecipeDetailSheet
│   ├── useRecipePaints(recipe.id)  → ordered steps
│   ├── usePaints()                 → paintMap for dot indicator
│   └── isPaintMissing(paint)       → green/red ● dots
└── RecipeDeleteDialog
    └── useDeleteRecipe()           → mutateAsync + Sonner toasts
```

## recipeSchema Fields

| Field          | Zod constraint                                     |
|----------------|----------------------------------------------------|
| name           | string min(1) max(120) — required                  |
| faction_id     | number().int().nullable()                          |
| unit_id        | number().int().nullable()                          |
| area           | string max(80) nullable                            |
| notes          | string max(2000) nullable                          |
| tutorial_link  | string nullable + URL regex refine when non-null   |

No `.default()` used anywhere (Pitfall 3). Form defaultValues in plan 04-03 handle initial state.

## Step Count Aggregation

`useAllStepCounts(recipes)` fetches `getRecipePaintsByRecipe(recipeId)` per recipe in a single `useQuery`, keyed `["recipe-paints", "all-counts", ids.join(",")]`.

**Implication for plan 04-03:** After create/edit mutations, invalidate `["recipe-paints", "all-counts"]` (or prefix). If performance becomes an issue with many recipes, replace with a single `SELECT recipe_id, COUNT(*) FROM recipe_paints GROUP BY recipe_id` bulk query.

## Task Commits

1. **Task 1: Build recipe table primitives** - `fa924ae` (feat)
2. **Task 2: Build RecipeDetailSheet, RecipesPage, route swap** - `a9c8c96` (feat)

## Files Created/Modified

- `src/features/recipes/recipeSchema.ts` — zod schema + RecipeFormValues type (plan 04-03 consumer)
- `src/features/recipes/RecipeEmptyState.tsx` — BookOpen icon + "No recipes yet" + Add Recipe CTA
- `src/features/recipes/RecipeDeleteDialog.tsx` — confirm dialog with Sonner toasts
- `src/features/recipes/RecipeTableColumns.tsx` — buildRecipeColumns factory with 6 columns
- `src/features/recipes/RecipeTable.tsx` — TanStack Table with skeleton/empty/rows
- `src/features/recipes/RecipeDetailSheet.tsx` — read-only Sheet + step list + owned dots
- `src/features/recipes/RecipesPage.tsx` — page container with filter bar + all dialogs
- `src/app/recipes/page.tsx` — PlaceholderPage replaced; re-exports RecipesPage
- `tests/painting/RecipeTable.test.tsx` — it.skip stubs filled (RECIPE-07, RECIPE-08 + 2 more)

## Decisions Made

- `recipeSchema` uses `.nullable()` not `.default()` on all optional fields — consistent with Pitfall 3 decision from 02-03 faction schema; plan 04-03 form uses `defaultValues` to set initial state
- `useAllStepCounts` per-recipe query strategy chosen for simplicity; plan 04-03 note: invalidate `["recipe-paints", "all-counts"]` after mutations
- Add/Edit form Sheet is explicitly deferred to plan 04-03 via `console.warn` no-ops in `onAddRecipe` / `onEditRecipe`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Plan 04-03 can import `recipeSchema` and `RecipeFormValues` immediately
- Plan 04-03 will replace the `console.warn` no-ops in `onAddRecipe` / `onEditRecipe` with real form Sheet state
- After plan 04-03 mutations, invalidate `["recipe-paints", "all-counts"]` in `useCreateRecipe` / `useUpdateRecipe`

---
*Phase: 04-painting-module*
*Completed: 2026-05-01*

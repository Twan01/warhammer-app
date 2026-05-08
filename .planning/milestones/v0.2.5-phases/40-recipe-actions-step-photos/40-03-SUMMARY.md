---
phase: 40-recipe-actions-step-photos
plan: "03"
subsystem: painting-recipes
tags: [substitute-paint, wishlist, paint-availability, PAINT-02, PAINT-03]
dependency_graph:
  requires: ["40-02"]
  provides: [alt-paint-ui, wishlist-bulk-add]
  affects: [RecipeStepRow, RecipeStepTimeline, RecipeDetailSheet]
tech_stack:
  added: []
  patterns: [sequential-mutate-loop, name-based-dedup, canShow-guard]
key_files:
  created: []
  modified:
    - src/features/recipes/RecipeStepRow.tsx
    - src/features/recipes/RecipeStepTimeline.tsx
    - src/features/recipes/RecipeDetailSheet.tsx
    - tests/painting/recipeStepRow.test.tsx
    - tests/painting/recipeDetailSheet.test.tsx
decisions:
  - Alt paint placed on step row line 2 (grid-cols-5) to keep line 1 uncluttered
  - canAddToWishlist guards on faction_id != null to prevent FK violations on wishlist_items
  - Alt paint does NOT affect isPaintMissing / availability badge (primary paint only)
  - Name-based dedup (brand + name string) prevents duplicate wishlist entries
  - Sequential mutateAsync loop (not Promise.all) for simpler error handling
metrics:
  duration_minutes: 10
  completed_date: "2026-05-07"
  tasks_completed: 2
  files_modified: 5
---

# Phase 40 Plan 03: Substitute Paint + Wishlist Bulk Add Summary

**One-liner:** Alt paint combobox in step row + "Alt:" display in timeline + "Add all missing to wishlist" button with faction guard and name-based duplicate prevention.

## What Was Built

### Task 1 — Alt paint combobox in RecipeStepRow + alt paint display in RecipeStepTimeline

- Expanded step row line 2 grid from `grid-cols-4` to `grid-cols-5`, adding a 5th cell for the alt paint combobox
- Second `PaintCombobox` instance with `step.alt_paint_id` binding and "Alt paint" micro-label (no `onCreateNew` — users select existing paints only for substitutes)
- `data-testid="alt-paint-combobox-container"` for test targeting
- `RecipeStepTimeline` displays alt paint below the primary paint line with `Alt: {brand} {name}` prefix, yellow-500 swatch dot, and `data-testid="alt-paint-display"`
- Updated `recipeStepRow.test.tsx`: changed `getByTestId("paint-combobox")` to `getAllByTestId` (now 2 instances), added 5 PAINT-02 alt paint tests

### Task 2 — "Add all missing to wishlist" button in RecipeDetailSheet

- Imports: `ShoppingCart`, `useWishlistItems`, `useCreateWishlistItem`, `isPaintMissing`
- `missingPaints` memo: filters steps by primary `paint_id` only, maps to Paint, filters by `isPaintMissing`
- `uniqueMissingPaints` memo: deduplicates by paint ID (paint appearing in multiple steps counted once)
- `canAddToWishlist` guard: `uniqueMissingPaints.length > 0 && recipe?.faction_id != null` — prevents FK violation on `wishlist_items.faction_id NOT NULL`
- `handleAddMissingToWishlist`: name-based dedup against existing wishlist (`${brand} ${name}`), sequential `mutateAsync` loop, toast success with count, toast info when all already on wishlist
- Each wishlist item: `notes: "From recipe: {recipe.name}"`
- Added 4 PAINT-03 tests: button shown when missing+faction, hidden when all owned, hidden when no faction_id, hidden when no steps

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 5a9e596 | feat(40-03): add alt paint combobox in RecipeStepRow and Alt: display in RecipeStepTimeline |
| Task 2 | a009907 | feat(40-03): add 'Add all missing to wishlist' button in RecipeDetailSheet |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getByTestId ambiguity when two PaintCombobox instances rendered**
- **Found during:** Task 1 verification
- **Issue:** Existing test `"renders the PaintCombobox (mocked)"` used `getByTestId("paint-combobox")` which threw when two comboboxes existed
- **Fix:** Changed to `getAllByTestId("paint-combobox")` and asserted length >= 1
- **Files modified:** tests/painting/recipeStepRow.test.tsx
- **Commit:** 5a9e596

## Self-Check: PASSED

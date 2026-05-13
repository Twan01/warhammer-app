---
phase: 63-applied-recipe-ux
plan: 02
subsystem: recipes
tags: [apply-dialog, recipes-tab, unit-detail, recipe-picker, preview]
dependency_graph:
  requires: [62-01, 62-02, 63-01]
  provides: [ApplyRecipeDialog, AppliedRecipesTab, UnitDetailSheet-recipes-tab]
  affects: [63-03, 63-04]
tech_stack:
  added: []
  patterns: [two-step-dialog, sibling-dialog-portal, command-picker, tab-extension]
key_files:
  created:
    - src/features/recipes/ApplyRecipeDialog.tsx
    - src/features/units/AppliedRecipesTab.tsx
    - tests/applied-recipes/applyRecipeDialog.test.tsx
    - tests/applied-recipes/appliedRecipesTab.test.tsx
  modified:
    - src/features/units/UnitDetailSheet.tsx
decisions:
  - "ApplyRecipeDialog uses two-step flow (picker -> preview -> confirm) with useState for selectedRecipeId"
  - "Dialog rendered as sibling to Sheet via fragment wrapper for z-index safety (P6)"
  - "Faction name lookup via useFactions + factionMap (Recipe type has faction_id not name)"
metrics:
  duration: 8m
  completed: 2026-05-13
---

# Phase 63 Plan 02: ApplyRecipeDialog + AppliedRecipesTab + UnitDetailSheet Wiring Summary

Searchable recipe picker dialog with SectionedTimeline/RecipeStepTimeline preview, applied recipes tab with embedded AssignmentChecklist, wired into UnitDetailSheet as 4th tab.

## Task Results

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | ApplyRecipeDialog + AppliedRecipesTab + UnitDetailSheet wiring | d1386de | ApplyRecipeDialog.tsx, AppliedRecipesTab.tsx, UnitDetailSheet.tsx |
| 2 | ApplyRecipeDialog + AppliedRecipesTab tests | 85c288a | applyRecipeDialog.test.tsx, appliedRecipesTab.test.tsx |

## Implementation Details

### ApplyRecipeDialog (src/features/recipes/ApplyRecipeDialog.tsx)
- Two-step flow: searchable Command picker -> SectionedTimeline/RecipeStepTimeline preview -> confirm
- Props: `{ open, unitId, onClose }`
- Uses `useCreateAssignment().mutate` on confirm with toast success/error
- Faction badge on picker items via `useFactions()` + `factionMap`
- Resets `selectedRecipeId` to null on dialog open via useEffect
- Builds paintMap from `usePaints()` for preview components

### AppliedRecipesTab (src/features/units/AppliedRecipesTab.tsx)
- Props: `{ unitId, onApplyRecipe }`
- Empty state with ClipboardList icon and "Apply Recipe" CTA button
- Assignment cards: recipe name header + Trash2 delete + embedded AssignmentChecklist
- Delete passes all 3 fields `{ id, unitId, recipeId }` (P2 pitfall)
- AssignmentChecklist gated on `assignment.id !== undefined` (P1 pitfall)

### UnitDetailSheet Modifications
- Added 4th TabsTrigger `value="recipes"` after journal
- Added TabsContent rendering AppliedRecipesTab with onApplyRecipe callback
- ApplyRecipeDialog rendered as SIBLING to Sheet (P6 pitfall) via fragment wrapper
- Dialog state `applyDialogOpen` owned by Sheet component

## Tests

- **applyRecipeDialog.test.tsx** (4 tests): searchable list, preview after selection, create mutation args, reset on reopen
- **appliedRecipesTab.test.tsx** (4 tests): assignment cards with names, empty state CTA, onApplyRecipe callback, delete with 3 fields

All 8 tests pass. Pre-existing failures in unrelated test files (datasheet, rules-hub) are out of scope.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- All 5 files exist on disk
- Both commits (d1386de, 85c288a) found in git log
- UnitDetailSheet has 4 TabsTrigger elements (details, playbook, journal, recipes)
- tsc --noEmit exits 0
- All 8 new tests pass

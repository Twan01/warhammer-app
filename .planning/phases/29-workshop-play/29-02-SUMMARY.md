---
phase: 29-workshop-play
plan: 02
subsystem: ui
tags: [react, tailwind, tanstack-table, swatch, vitest]

# Dependency graph
requires:
  - phase: 29-workshop-play/29-01
    provides: useRecipeSwatchData hook + getRecipeSwatchColors query returning Map<recipe_id, SwatchEntry[]>
provides:
  - WKSP-01 verified — PaintRow hex_color swatch and bg-muted fallback confirmed by 3 tests
  - WKSP-02 implemented — RecipeTable "Palette" column with overlapping h-3 w-3 swatch circles, -ml-1 overlap, +N overflow indicator
  - buildRecipeColumns updated signature (6 params, swatchColorsByRecipe 4th)
  - RecipeTableProps extended with swatchColorsByRecipe prop
  - RecipesPage wires useRecipeSwatchData to RecipeTable
affects:
  - 29-03 (PLAY-01 — ArmyList readiness panel, next in phase)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SwatchStrip helper pattern — React.createElement-based test component replicating column cell JSX for focused rendering tests without full RecipeTable mount
    - Overlapping swatch circles via -ml-1 negative margin on i > 0 items

key-files:
  created:
    - tests/workshop-play/paintRowSwatch.test.tsx
  modified:
    - src/features/recipes/RecipeTableColumns.tsx
    - src/features/recipes/RecipeTable.tsx
    - src/features/recipes/RecipesPage.tsx
    - tests/workshop-play/recipeSwatchData.test.ts
    - tests/painting/RecipeTable.test.tsx

key-decisions:
  - "SwatchStrip test helper uses React.createElement (not JSX) so recipeSwatchData.test.ts can stay .ts — no rename needed"
  - "RecipeTable.test.tsx base props updated to include swatchColorsByRecipe default Map to fix TypeScript prop requirement (Rule 1 auto-fix)"

patterns-established:
  - "Palette column swatch strip: h-3 w-3 rounded-full circles, -ml-1 after first, max 8 with +N overflow span"

requirements-completed:
  - WKSP-01
  - WKSP-02

# Metrics
duration: 18min
completed: 2026-05-05
---

# Phase 29 Plan 02: Workshop Play Swatch UI Summary

**PaintRow WKSP-01 verified + RecipeTable "Palette" swatch strip (WKSP-02) with overlapping circles and +N overflow via buildRecipeColumns 6-param signature**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-05T16:40:00Z
- **Completed:** 2026-05-05T16:58:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- WKSP-01 verified — existing PaintRow swatch (hex_color colored circle / null bg-muted fallback) confirmed correct by 3 new tests; PaintRow.tsx unchanged
- WKSP-02 implemented — new "Palette" column in RecipeTable shows horizontal strip of overlapping 12px swatch circles with +N overflow indicator for recipes with >8 paints
- RecipesPage now calls useRecipeSwatchData and threads data down through RecipeTable into buildRecipeColumns — full prop chain wired

## Task Commits

1. **Task 1: Verify WKSP-01 swatch consistency + flip test stubs** - `b150e73` (test)
2. **Task 2: Add recipe swatch strip to RecipeTable + flip stubs** - `280684b` (feat)

**Plan metadata:** (docs commit after summary)

## Files Created/Modified

- `tests/workshop-play/paintRowSwatch.test.tsx` — 3 active tests verifying colored swatch, muted fallback, and size/shape classes
- `src/features/recipes/RecipeTableColumns.tsx` — buildRecipeColumns gets 6th param swatchColorsByRecipe; new palette column with overlapping swatch circles
- `src/features/recipes/RecipeTable.tsx` — RecipeTableProps extended with swatchColorsByRecipe; useMemo updated to pass it
- `src/features/recipes/RecipesPage.tsx` — useRecipeSwatchData hook added + swatchColorsByRecipe prop passed to RecipeTable
- `tests/workshop-play/recipeSwatchData.test.ts` — 4 UI stubs flipped to active tests (tests 5-8: 8 circles, +N overflow, bg-muted fallback, -ml-1 margin)
- `tests/painting/RecipeTable.test.tsx` — base props updated with swatchColorsByRecipe default Map (Rule 1 auto-fix)

## Decisions Made

- SwatchStrip test helper written using React.createElement (not JSX) so recipeSwatchData.test.ts can remain a `.ts` file without rename — avoids a spurious file rename and keeps the test colocated with the query/hook tests in the same file
- RecipeTable.test.tsx base props needed `swatchColorsByRecipe` because RecipeTableProps now requires it (TypeScript compile would fail) — added as empty Map default, consistent with how stepCountByRecipe is handled

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added swatchColorsByRecipe default to existing RecipeTable.test.tsx base props**
- **Found during:** Task 2 (RecipeTable prop update)
- **Issue:** RecipeTableProps now requires swatchColorsByRecipe — existing RecipeTable.test.tsx renderTable helper's baseProps would fail TypeScript type check
- **Fix:** Added `swatchColorsByRecipe: new Map()` to baseProps in tests/painting/RecipeTable.test.tsx
- **Files modified:** tests/painting/RecipeTable.test.tsx
- **Verification:** All 4 existing RecipeTable tests still pass
- **Committed in:** 280684b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — missing required prop in existing test)
**Impact on plan:** Necessary correctness fix; no scope creep.

## Issues Encountered

None.

## Next Phase Readiness

- WKSP-01 and WKSP-02 complete — Phase 29 Workshop requirements done
- Plan 29-03 is next (PLAY-01: ArmyList readiness panel + PLAY-02 hook stubs)
- All 546 tests pass, pnpm build succeeds

---
*Phase: 29-workshop-play*
*Completed: 2026-05-05*

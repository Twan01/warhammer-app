---
phase: 50-section-form-ui
plan: "03"
subsystem: recipes
tags: [recipe-form, sections, dnd, progressive-disclosure, submit-flow]
dependency_graph:
  requires: ["50-01", "50-02"]
  provides: ["RecipeFormSheet with DraftSection[] state and section-aware submit"]
  affects: ["src/features/recipes/RecipeFormSheet.tsx"]
tech_stack:
  added: []
  patterns:
    - "localId-to-dbId Map pattern for section_id assignment in submit flow"
    - "Progressive disclosure: sections.length <= 1 = flat RecipeStepList, 2+ = RecipeSectionList"
    - "DELETE-all + re-INSERT pattern for sections on recipe edit (CASCADE handles steps)"
key_files:
  created: []
  modified:
    - src/features/recipes/RecipeFormSheet.tsx
    - tests/painting/formatMinutes.test.tsx
decisions:
  - "DELETE-all existing sections on edit then re-INSERT preserves clean section ordering without a diff algorithm"
  - "existingSections.length === 0 branch on edit leaves sections as default (handles legacy unsectioned recipes gracefully)"
  - "formatMinutes.test.tsx mocks updated to include useRecipeSections + RECIPE_PAINTS_KEY/STEP_COUNTS_KEY/RECIPE_AVAILABILITY_KEY/RECIPE_SWATCH_KEY constants so the rewritten component renders correctly under test"
metrics:
  duration: "~20 min"
  completed: "2026-05-08"
  tasks_completed: 1
  files_modified: 2
---

# Phase 50 Plan 03: RecipeFormSheet Integration Summary

**One-liner:** RecipeFormSheet rewritten with DraftSection[] state, progressive disclosure (1 section = flat, 2+ = section cards), and section-aware submit that maps localId-to-dbId for step section_id assignment.

## What Was Built

Task 1 rewrote `src/features/recipes/RecipeFormSheet.tsx` to integrate all prior phase 50 work:

- **State:** `useState<DraftStep[]>` replaced with `useState<DraftSection[]>([makeDraftSection("Steps")])` — one default section on new recipe, populated via `buildDraftSections` on edit.
- **Initialization:** Single `useEffect` gated on `[recipe?.id, existingSections.length, existingSteps.length]`. Edit path calls `buildDraftSections(existingSections, existingSteps)`; new recipe path resets to `[makeDraftSection("Steps")]`.
- **Progressive disclosure:** `sections.length <= 1` renders `RecipeStepList` directly (flat, no section UI visible). `sections.length >= 2` renders `RecipeSectionList` with collapsible section cards.
- **Add Section button:** Calls `addSection()` which appends a `makeDraftSection()` — triggers the progressive disclosure switch on second section.
- **PAINT-03 new-paint detection:** Updated `setSteps` to `setSections(prev => prev.map(sec => ({ ...sec, steps: sec.steps.map(...) })))` so inline paint creation works within any section.
- **Submit flow:** Deletes all existing sections (CASCADE removes their steps), then creates sections in array order building a `Map<localId, dbId>`, then creates steps with `section_id` resolved via the map. Invalidates all 6 cache keys.
- **Preserved:** `key={recipe?.id ?? "new"}` on `SheetContent`, `<PaintSheet>` stacked portal, all form fields unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated formatMinutes.test.tsx mocks for new useRecipeSections dependency**

- **Found during:** Task 1 verification (`pnpm test`)
- **Issue:** `RecipeFormSheet` now calls `useRecipeSections` which was not mocked in `formatMinutes.test.tsx`. Without a mock, the component couldn't resolve sections state from `existingSteps`, so `totalMinutes` remained 0 and all 5 time-sum assertions failed.
- **Fix:** Added `vi.mock("@/hooks/useRecipeSections", ...)` returning a single default section, updated `renderSheet` to tag steps with `section_id: DEFAULT_SECTION_ID`, and added missing constant exports to the `useRecipePaints` mock (`RECIPE_PAINTS_KEY`, `STEP_COUNTS_KEY`, `RECIPE_AVAILABILITY_KEY`, `RECIPE_SWATCH_KEY`).
- **Files modified:** `tests/painting/formatMinutes.test.tsx`
- **Commit:** 62fcc61

## Self-Check

- [x] `src/features/recipes/RecipeFormSheet.tsx` exists and contains `useState<DraftSection[]>`
- [x] `tests/painting/formatMinutes.test.tsx` updated with `useRecipeSections` mock
- [x] Build passes: `pnpm build` exits 0
- [x] All 1086 tests pass: `pnpm test` exits 0

## Self-Check: PASSED

---
phase: 38-structured-step-input
plan: "01"
subsystem: database
tags: [sqlite, typescript, react-query, recipe-steps, painting-phases]

# Dependency graph
requires:
  - phase: 37-schema-foundation
    provides: recipe_steps table with all 10 columns (painting_phase, tool, technique, dilution, time_estimate_minutes) already in DB schema
provides:
  - PAINTING_PHASES const array (10 values) and PaintingPhase type exported from recipeSchema.ts
  - Extended DraftStep interface with 5 new fields (painting_phase, tool, technique, dilution, time_estimate_minutes)
  - 10-column addRecipePaint INSERT matching full CreateRecipeStepInput type
  - Tests covering new field initialization and spread preservation via computeOrderIndex
affects:
  - 38-02 (step creation UI — depends on DraftStep having all fields for form wiring)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DraftStep mirrors RecipeStep fields (minus id/created_at) — single source of truth for step editing state
    - makeDraftStep() factory function initializes all nullable fields to null explicitly
    - $1..$10 positional placeholders for full 10-column INSERT (Tauri plugin-sql requirement)

key-files:
  created: []
  modified:
    - src/features/recipes/recipeSchema.ts
    - src/features/recipes/recipeSteps.ts
    - src/db/queries/recipePaints.ts
    - src/features/recipes/RecipeFormSheet.tsx
    - tests/painting/recipeSteps.test.ts

key-decisions:
  - "PAINTING_PHASES added to recipeSchema.ts (not recipeSteps.ts) — follows existing const array pattern (RECIPE_STYLES, RECIPE_SURFACES, etc.)"
  - "New DraftStep fields use string | null not PaintingPhase type — keeps form state loose, validation lives at submit boundary"

patterns-established:
  - "DraftStep extends to mirror RecipeStep: when RecipeStep gains fields, DraftStep and makeDraftStep() must track them"
  - "RecipeFormSheet existing-step mapper must be kept in sync with DraftStep interface"

requirements-completed: [STEP-01, STEP-02, STEP-03, STEP-04]

# Metrics
duration: 15min
completed: 2026-05-07
---

# Phase 38 Plan 01: Data Layer Extension Summary

**PAINTING_PHASES const, 9-field DraftStep interface, and 10-column addRecipePaint INSERT closing the gap between DB schema and TypeScript data layer**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-07T10:03:00Z
- **Completed:** 2026-05-07T10:18:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added PAINTING_PHASES const array with 10 painting phase values and PaintingPhase type to recipeSchema.ts
- Extended DraftStep interface from 4 to 9 non-localId fields, makeDraftStep() initializes all new fields to null
- Expanded addRecipePaint INSERT from 5-column to 10-column with correct $1..$10 positional placeholders
- Added 6 new tests in STEP-01/03/04 describe block covering new field initialization and spread preservation
- All 810 tests pass, TypeScript build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PAINTING_PHASES const and extend DraftStep** - `116b0f7` (feat)
2. **Task 2: Expand addRecipePaint INSERT to 10 columns and update tests** - `e21c91c` (feat)

## Files Created/Modified
- `src/features/recipes/recipeSchema.ts` - Added PAINTING_PHASES const array (10 values) and PaintingPhase type
- `src/features/recipes/recipeSteps.ts` - Extended DraftStep interface with 5 new fields, updated makeDraftStep()
- `src/db/queries/recipePaints.ts` - Expanded addRecipePaint INSERT from 5 to 10 columns with $1..$10 placeholders
- `src/features/recipes/RecipeFormSheet.tsx` - Fixed existing-step mapper to include 5 new DraftStep fields (auto-fix)
- `tests/painting/recipeSteps.test.ts` - Updated step() helper, added STEP-01/03/04 describe block with 6 tests

## Decisions Made
- PAINTING_PHASES placed in recipeSchema.ts (not recipeSteps.ts) — follows the existing pattern where all const arrays for the recipe feature live in one file
- DraftStep new fields use `string | null` rather than `PaintingPhase` union type — keeps draft state loose; validation/coercion happens at form submit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed RecipeFormSheet.tsx missing new DraftStep fields in existing-step mapper**
- **Found during:** Task 2 (TypeScript build verification)
- **Issue:** When loading an existing recipe for editing, the `useEffect` that maps `existingSteps` into `DraftStep[]` only mapped 4 fields — TypeScript error TS2345 on the missing 5 new fields
- **Fix:** Added all 5 new fields (`painting_phase`, `tool`, `technique`, `dilution`, `time_estimate_minutes`) to the existing-step mapper with `?? null` guards
- **Files modified:** `src/features/recipes/RecipeFormSheet.tsx`
- **Verification:** `pnpm build` exits 0, TypeScript compilation succeeds
- **Committed in:** `e21c91c` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix was necessary for correctness — without it, editing any existing recipe would have caused a TypeScript error at build time and broken the edit flow at runtime.

## Issues Encountered
None beyond the auto-fixed TS error above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Data layer fully extended — DraftStep has all 9 non-localId fields, addRecipePaint writes all 10 columns
- Phase 38 Plan 02 can now wire UI controls (phase dropdown, tool/technique/dilution text inputs, time estimate) to the DraftStep fields
- RecipeFormSheet.tsx correctly round-trips all step fields when editing existing recipes

## Self-Check

Verifying claims before closing:

---
*Phase: 38-structured-step-input*
*Completed: 2026-05-07*

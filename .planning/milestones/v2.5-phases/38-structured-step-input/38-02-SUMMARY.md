---
phase: 38-structured-step-input
plan: "02"
subsystem: ui
tags: [react, typescript, shadcn, dnd-kit, recipes, painting-steps]

# Dependency graph
requires:
  - phase: 38-01
    provides: DraftStep type with 9 fields, PAINTING_PHASES const, addRecipePaint mutation with all new columns

provides:
  - Two-line step row UI with painting_phase Select, tool/technique/dilution/time inputs
  - Edit-mode hydration of all 5 new step fields from database
  - Both onSubmit branches pass real DraftStep values (not null placeholders)
  - Time sum display next to Recipe Steps header with formatMinutes helper

affects: [38-03, 38-04, 39-painting-studio, Phase 40 photo upload]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "__none__ sentinel Select pattern reused for painting_phase dropdown in step rows"
    - "useMemo for derived display values (totalMinutes) computed from steps array"
    - "datalist elements for tool/technique autocomplete suggestions without locking input values"

key-files:
  created: []
  modified:
    - src/features/recipes/RecipeStepRow.tsx
    - src/features/recipes/RecipeFormSheet.tsx

key-decisions:
  - "datalist suggestions (not combobox) for tool and technique — keeps freeform text entry while offering hints"
  - "formatMinutes as module-level function — reusable outside component, no hook dependency"
  - "Math.round() enforces integer discipline at input boundary — prevents float values reaching SQLite INTEGER column"

patterns-established:
  - "Two-row step input layout: (phase Select + title + paint) on row 1, (tool + technique + dilution + time) on row 2"
  - "Time sum displayed inline next to section header via useMemo + conditional render"

requirements-completed: [STEP-01, STEP-02, STEP-03, STEP-04]

# Metrics
duration: 4min
completed: 2026-05-07
---

# Phase 38 Plan 02: Structured Step Input — UI Wiring Summary

**Two-line recipe step row with painting_phase Select, tool/technique/dilution/time inputs, edit-mode hydration of all 5 new fields, and live time sum display next to the Recipe Steps header**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-07T08:10:44Z
- **Completed:** 2026-05-07T08:14:37Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 2

## Accomplishments

- Replaced STEP_SUGGESTIONS datalist + plain step_name input with a proper two-line layout: painting_phase Select (7.5rem) + title input (flex-1) + PaintCombobox on line 1, followed by tool/technique/dilution/time grid on line 2
- Fixed both `addRecipePaint.mutateAsync` call sites in RecipeFormSheet to pass real DraftStep field values instead of hardcoded `null` placeholders — critical for data persistence
- Added `totalMinutes` useMemo + `formatMinutes` helper, displayed inline next to "Recipe Steps" header (e.g., "~45 min", "~1h 30min")

## Task Commits

Each task was committed atomically:

1. **Task 1: Update RecipeStepRow with two-line layout and painting_phase Select** - `9d09187` (feat)
2. **Task 2: Wire RecipeFormSheet — edit hydration, real values on save, time sum display** - `0afec19` (feat)
3. **Task 3: Verify structured step input end-to-end** - auto-approved (checkpoint:human-verify, auto mode)

## Files Created/Modified

- `src/features/recipes/RecipeStepRow.tsx` - Rewrote to two-line layout: painting_phase Select with __none__ sentinel, flex-1 title input (no datalist), PaintCombobox in w-40 wrapper; second row grid with tool/technique/dilution/time inputs; datalist suggestions for tool and technique; notes input preserved on line 3
- `src/features/recipes/RecipeFormSheet.tsx` - Added useMemo import, formatMinutes module-level function, totalMinutes computed value, fixed both onSubmit mutateAsync call sites to use real DraftStep values, updated Recipe Steps header with conditional time sum display

## Decisions Made

- Used `datalist` (not a combobox) for tool and technique suggestions — preserves freeform entry while offering hints, matching the UX for notes-style fields
- `formatMinutes` placed at module level above the component — makes it testable in isolation and avoids re-creating the function on every render
- Edit-mode hydration was already partially complete from Plan 01 (auto-fix carried forward) — no additional changes needed there

## Deviations from Plan

None - plan executed exactly as written. The edit-mode hydration was already correct from the Plan 01 auto-fix (Decision: "RecipeFormSheet.tsx existing-step mapper must be kept in sync with DraftStep interface").

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- STEP-01 through STEP-04 requirements fully satisfied
- RecipeStepRow and RecipeFormSheet are the complete structured step input UI — ready for Phase 38 Plan 03 (if any) or Phase 39 Painting Studio
- Photo upload form field (STEP-05) deferred to Phase 40 as planned

---
*Phase: 38-structured-step-input*
*Completed: 2026-05-07*

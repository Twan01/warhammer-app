---
phase: 40-recipe-actions-step-photos
plan: 02
subsystem: ui
tags: [react, tauri, lucide-react, recipe, photo-upload, duplication]

# Dependency graph
requires:
  - phase: 40-01-recipe-actions-step-photos
    provides: "useDuplicateRecipe hook, DraftStep with step_photo_path + alt_paint_id, 12-col addRecipePaint, migration 013"
provides:
  - "Duplicate button in RecipeDetailSheet footer (Copy icon, useDuplicateRecipe wired)"
  - "Per-step photo upload icon in RecipeStepRow (writes UUID filename to AppData)"
  - "Result photo upload button in RecipeFormSheet header section"
  - "Step photo thumbnails in RecipeStepTimeline via stepPhotoUrls Map prop"
  - "Step photo URL resolution in RecipeDetailSheet via appDataDir + convertFileSrc"
  - "DraftStep mapper and onSubmit preserve step_photo_path and alt_paint_id through save cycle"
affects: [phase-41-session-recipe-linking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Photo upload: openDialog → readFile(abs path, no baseDir) → writeFile(UUID, AppData) → store relative filename in DB"
    - "Step photo URL resolution: appDataDir() + join() + convertFileSrc() → asset:// URL in Map keyed by step.id"
    - "onDuplicate prop pattern: RecipeDetailSheet notifies RecipesPage of new recipe ID to open immediately"

key-files:
  created: []
  modified:
    - src/features/recipes/RecipeDetailSheet.tsx
    - src/features/recipes/RecipeFormSheet.tsx
    - src/features/recipes/RecipeStepRow.tsx
    - src/features/recipes/RecipeStepTimeline.tsx
    - src/features/recipes/RecipesPage.tsx
    - tests/painting/recipeDetailSheet.test.tsx

key-decisions:
  - "onDuplicate callback pattern chosen (not selectedRecipeId state): parent RecipesPage handles opening the copy, keeping RecipeDetailSheet stateless"
  - "stepPhotoUrls resolved in RecipeDetailSheet (not RecipeStepTimeline) — timeline stays a pure presentational component"
  - "Photo upload button placed after PaintCombobox on line 1 of step row — icon color changes to text-primary when step has a photo"
  - "result_photo_path now read from form values in create path (was hardcoded null) — completing the STEP-05 photo upload chain"

patterns-established:
  - "Tauri photo upload pattern: openDialog → readFile(absolute, no baseDir) → writeFile(UUID.ext, {baseDir: BaseDirectory.AppData}) → store UUID filename"
  - "Asset URL resolution: appDataDir() + join(dir, relativePath) + convertFileSrc(absolute) in useEffect with cleanup cancel flag"

requirements-completed: [STUDIO-03, STEP-05]

# Metrics
duration: 15min
completed: 2026-05-07
---

# Phase 40 Plan 02: Recipe Actions + Step Photos UI Summary

**Duplicate button with Copy icon in RecipeDetailSheet, per-step ImageIcon photo upload in RecipeStepRow writing UUID files to AppData, result photo upload in RecipeFormSheet header, and 64px thumbnails in RecipeStepTimeline resolved via asset:// URLs**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-07T12:48:00Z
- **Completed:** 2026-05-07T12:53:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Duplicate button wired end-to-end: RecipeDetailSheet footer Copy icon → useDuplicateRecipe → onDuplicate callback → RecipesPage opens copy immediately in detail sheet
- Per-step photo upload in RecipeStepRow: openDialog → readFile → writeFile(UUID) → onChange updates DraftStep.step_photo_path; icon turns primary color when photo attached
- Result photo upload in RecipeFormSheet header section between estimated_minutes and tutorial_link fields; both edit and create onSubmit paths now pass result_photo_path from form values
- Step photo thumbnails (h-16 w-16) render in RecipeStepTimeline via stepPhotoUrls Map resolved in RecipeDetailSheet with appDataDir + convertFileSrc pattern
- DraftStep mapper in RecipeFormSheet preserves step_photo_path and alt_paint_id through the save cycle (both edit and create paths)
- 3 new STUDIO-03 tests: Duplicate button renders, calls hook with correct args, fires onDuplicate callback; all 892 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Recipe Duplication UI + RecipeFormSheet DraftStep mapper update** - `b353891` (feat)
2. **Task 2: Step photo upload + result photo + timeline thumbnails** - `6e0e58c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/features/recipes/RecipeDetailSheet.tsx` - Added Copy/toast/useDuplicateRecipe imports, onDuplicate prop, handleDuplicate fn, stepPhotoUrls state + useEffect, Duplicate button in footer, passes stepPhotoUrls to RecipeStepTimeline
- `src/features/recipes/RecipeFormSheet.tsx` - Added Tauri file API imports, ImageIcon, handleResultPhotoUpload fn, result photo upload FormItem, fixed create path result_photo_path from form values
- `src/features/recipes/RecipeStepRow.tsx` - Added ImageIcon + Tauri dialog/fs imports + toast, handlePhotoUpload fn, photo upload button after PaintCombobox with color indicator
- `src/features/recipes/RecipeStepTimeline.tsx` - Added stepPhotoUrls?: Map<number, string> prop, img thumbnail with data-testid="step-photo-thumbnail"
- `src/features/recipes/RecipesPage.tsx` - Added onDuplicate prop to RecipeDetailSheet with setSelectedRecipe + setDetailOpen handler
- `tests/painting/recipeDetailSheet.test.tsx` - Added Tauri API mocks, useDuplicateRecipe mock, step_photo_path/alt_paint_id to makeStep, onDuplicate to renderSheet, 3 STUDIO-03 tests

## Decisions Made

- onDuplicate callback pattern chosen (not selectedRecipeId state): RecipeDetailSheet stays stateless, parent RecipesPage handles navigation
- stepPhotoUrls resolved in RecipeDetailSheet (not RecipeStepTimeline) so timeline remains a pure presentational component
- Photo upload button placed after PaintCombobox div on step row line 1; uses text-primary color when step has a photo attached

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- STUDIO-03 (recipe duplication) and STEP-05 (step photos) delivered end-to-end
- Photo upload pattern (UUID relative path to AppData) established and ready for Phase 41 if needed
- Phase 41 (session-recipe linking) can proceed; no blockers from this plan

---
*Phase: 40-recipe-actions-step-photos*
*Completed: 2026-05-07*

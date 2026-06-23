---
phase: 142-technique-authoring-library-browse
fixed_at: 2026-06-21T00:00:00Z
review_path: .planning/phases/142-technique-authoring-library-browse/142-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 142: Code Review Fix Report

**Fixed at:** 2026-06-21
**Source review:** `.planning/phases/142-technique-authoring-library-browse/142-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-03: Silent data loss — unsupported form fields removed

**Files modified:** `src/features/techniques/techniqueSchema.ts`, `src/types/technique.ts`, `src/features/techniques/TechniqueFormSheet.tsx`, `tests/techniques/techniqueSchema.test.ts`
**Commit:** `85616ba4`
**Applied fix:** Removed `description`, `estimated_minutes`, and `result_photo_path` from the Zod schema (`techniqueSchema.ts`), `TechniqueFormValues` interface (`src/types/technique.ts`), `DEFAULT_VALUES` and `buildDefaults` helpers, and all three corresponding form fields from `TechniqueFormSheet.tsx`. Removed `handleResultPhotoUpload` and its Tauri fs/dialog imports (`readFile`, `writeFile`, `BaseDirectory`, `openDialog`, `ImageIcon`) — these caused orphaned AppData files on every save that included a photo. Updated `techniqueSchema.test.ts` to match the corrected 4-field schema (removing tests for `description` length, `estimated_minutes` min, and `result_photo_path`).

### WR-02: useEffect keyed on .length misses same-count data changes

**Files modified:** `src/features/techniques/TechniqueFormSheet.tsx`
**Commit:** `85616ba4` (same commit as WR-03)
**Applied fix:** Removed the `existingSectionsLen`, `existingStepsLen`, `existingSlotsLen` length-intermediate variables. Changed the `useEffect` dependency array from `[technique?.id, existingSectionsLen, existingStepsLen, existingSlotsLen]` to `[technique?.id, existingSlots, existingSections, existingSteps]` so any change in the React Query data arrays (not just length changes) triggers form re-initialization in edit mode.

### IN-02: console.error debug artifact in production path

**Files modified:** `src/features/techniques/TechniqueFormSheet.tsx`
**Commit:** `85616ba4` (same commit as WR-03/WR-02)
**Applied fix:** Removed `console.error("[TechniqueFormSheet] save failed:", err)` from the catch block. Changed `catch (err)` to `catch` since `err` was no longer referenced. User-facing `toast.error` remains.

### WR-01: Duplicate DOM id attributes from repeated datalist renders

**Files modified:** `src/features/techniques/TechniqueStepList.tsx`, `src/features/techniques/TechniqueFormSheet.tsx`
**Commit:** `d1e0cc93`
**Applied fix:** Removed both `<datalist id="tool-suggestions">` and `<datalist id="technique-suggestions">` from `TechniqueStepList.tsx` (where they rendered once per section, creating N duplicate id pairs). Added both datalists once inside `TechniqueFormSheet.tsx`, just before the Colour Slots section. `TechniqueStepRow` inputs keep their `list="tool-suggestions"` / `list="technique-suggestions"` attributes unchanged.

### IN-01: Dead guard section.notes !== undefined always true

**Files modified:** `src/features/techniques/TechniqueSectionCard.tsx`
**Commit:** `0b581110`
**Applied fix:** Removed the `{section.notes !== undefined && (...)}` conditional wrapper from the notes Input in `TechniqueSectionCard`. The Input now renders unconditionally. `DraftTechniqueSection.notes` is `string | null` (never `undefined`), so the guard was always true and misleading.

### IN-03: Both counts use the same Layers icon

**Files modified:** `src/features/techniques/TechniqueCard.tsx`
**Commit:** `f4caff03`
**Applied fix:** Added `ListChecks` to the lucide-react import. Swapped the step-count row icon from `<Layers>` to `<ListChecks>` so slot count (Layers) and step count (ListChecks) are visually distinct at a glance.

---

_Fixed: 2026-06-21_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

---
phase: 144-live-link-re-sync
fixed_at: 2026-06-22T18:30:00Z
review_path: .planning/phases/144-live-link-re-sync/144-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 144: Code Review Fix Report

**Fixed at:** 2026-06-22
**Source review:** .planning/phases/144-live-link-re-sync/144-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01: Surviving recipe_sections not propagating name/surface/optional/notes

**Files modified:** `src/db/queries/recipeTechniqueResync.ts`, `tests/data-layer/technique-resync.test.ts`
**Commit:** db0e8d42
**Applied fix:** Expanded the `UPDATE recipe_sections` in step 4b from a single-column `SET order_index = $2` to a 6-column UPDATE that also writes `name`, `surface`, `optional`, and `notes` from the technique_section. Added test asserting section rename on a technique propagates to linked recipe_sections.

### CR-02: Manual steps inside technique-owned sections deleted by resync

**Files modified:** `src/db/queries/recipeTechniqueResync.ts`, `tests/data-layer/technique-resync.test.ts`
**Commit:** db0e8d42 (same commit as CR-01 — same file)
**Applied fix:** Added `paint_id: number | null` to the `RecipeStepInfo` interface and the step 4c SELECT. Changed the step 4d delete condition from `technique_step_id === null` to `technique_step_id === null && paint_id === null`. This preserves user-added manual steps (paint_id IS NOT NULL) while still cleaning up technique-materialised orphans (paint_id IS NULL). Added test asserting a manual step with a real paint_id survives resync even when a technique step is deleted.

### WR-01: False stepReorders count for multi-section techniques

**Files modified:** `src/lib/techniquePreviewDiff.ts`, `tests/lib/techniquePreviewDiff.test.ts`
**Commit:** 0de9b730
**Applied fix:** Replaced the flat global position counter (`pos++` across all sections) with per-section position tracking (`secPos` resets to 0 at each section boundary). This matches how `technique_steps.order_index` is stored (per-section). Added test: multi-section no-op asserts `stepReorders === 0` when steps are at the same per-section positions.

### WR-02: New recipe_sections INSERT using 0-based technique index causing order_index collisions

**Files modified:** `src/db/queries/recipeTechniqueResync.ts`
**Commit:** db0e8d42 (same commit as CR-01 — same file)
**Applied fix:** Added a `MAX(order_index)` query before the INSERT loop to compute the recipe's current highest section order_index, then uses `nextSectionOrderIndex++` (starting at `maxIdx + 1`) for each new section. This prevents order_index collisions when multiple technique instances exist in the same recipe.

### WR-03: pendingSubmitRef not cleared on Cancel

**Files modified:** `src/features/techniques/TechniqueFormSheet.tsx`
**Commit:** 5d53722f
**Applied fix:** Added `pendingSubmitRef.current = null;` to the Cancel button's `onClick` handler in the structural-edit confirmation dialog, alongside the existing `setConfirmDialog(null)` call.

### WR-04: useUpdateTechnique missing recipe-steps invalidation

**Files modified:** `src/hooks/useTechniques.ts`
**Commit:** 45e8f002
**Applied fix:** Added `qc.invalidateQueries({ queryKey: ["recipe-steps"] })` to `useUpdateTechnique.onSuccess`, alongside the existing recipe-sections/recipe-paints/slot-resolution-map invalidations. This is a no-op if no query currently uses that key, but guards against future step-list consumers.

### IN-01: No index on recipe_sections(technique_section_id)

**Files modified:** `src-tauri/migrations/053_technique_section_idx.sql` (new), `src-tauri/src/lib.rs`
**Commit:** ba9793e4
**Applied fix:** Created migration 053 with `CREATE INDEX IF NOT EXISTS idx_recipe_sections_technique_section_id ON recipe_sections(technique_section_id)`. Registered as `version: 53` in lib.rs.

### IN-02: Unused `_techniqueId` parameter in syncInstance

**Files modified:** `src/db/queries/recipeTechniqueResync.ts`
**Commit:** db0e8d42 (same commit as CR-01 — same file)
**Applied fix:** Removed the `_techniqueId: number` parameter from the `syncInstance` function signature and its corresponding argument at the call site in `resyncTechniqueInstances`. The technique data is already passed via `techniqueSections` and `stepsByTechSection`.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-06-22_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

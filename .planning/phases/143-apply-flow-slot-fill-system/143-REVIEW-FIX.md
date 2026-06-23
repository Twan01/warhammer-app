---
phase: 143-apply-flow-slot-fill-system
fixed_at: 2026-06-22T00:00:00Z
review_path: .planning/phases/143-apply-flow-slot-fill-system/143-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 143: Code Review Fix Report

**Fixed at:** 2026-06-22
**Source review:** `.planning/phases/143-apply-flow-slot-fill-system/143-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (CR-01, CR-02, CR-03, WR-01, WR-02, WR-03, IN-01, IN-02, IN-03)
- Fixed: 9
- Skipped: 0

---

## Fixed Issues

### CR-01: `getSlotResolutionMap` Map key collision corrupts paint resolution under SLOT-04

**Files modified:** `src/db/queries/recipeTechniqueSlotMaps.ts`, `src/lib/effectivePaintId.ts`, `tests/data-layer/effectivePaintId.test.ts`, `tests/data-layer/apply-technique.test.ts`, `tests/lib/effectivePaintId.test.ts`
**Commits:** `d51021cb`, `6cdf568a`
**Applied fix:** Changed `getSlotResolutionMap` to SELECT `rs.id AS recipe_step_id` and key the Map on `recipe_steps.id` (unique per application) instead of `technique_step_id` (only unique per-technique). Changed `effectivePaintId` to look up `step.id` in the map and added required `id: number` field to `PaintResolvableStep`. Updated all three test files to pass `id` in step objects and key the map correctly. Added SLOT-04 double-apply test case to both test files proving each instance's step resolves to its own paint.

### CR-02: `duplicateRecipe` silently drops all technique materialisation data

**Files modified:** `src/db/queries/recipes.ts`, `tests/painting/duplicateRecipe.test.ts`
**Commits:** `0ac1dc3b`, `dee180f1`
**Applied fix:** `duplicateRecipe` now (1) copies `recipe_technique_instances` rows building an old→new instance ID map, (2) copies `recipe_technique_slot_maps` for each new instance, (3) includes `technique_instance_id` in the section INSERT (remapped via instanceIdMap), and (4) includes `technique_step_id` in the step INSERT (no remapping — points at same source rows). Added AUDIT comments at both INSERT sites for future migration safety. Also tightened `lastInsertId` null checks for recipe/section INSERTs (throws instead of `?? 0`). Updated the existing mock-based test to add the new technique instances SELECT call to the mock sequence and updated assertions for the new 11-column section and 14-column step INSERTs.

### CR-03: `missingPaints` in `RecipeDetailSheet` reads `step.paint_id` directly, bypassing `effectivePaintId`

**Files modified:** `src/features/recipes/RecipeDetailSheet.tsx`
**Commit:** `7a4a4366`
**Applied fix:** Added `effectivePaintId` import and rewrote the `missingPaints` memo to resolve each step via `effectivePaintId(s, resolvedMap)` instead of filtering on `s.paint_id != null` directly. Technique-owned steps (which always have `paint_id = null`) now correctly surface their slot-filled paints in the missing-paint wishlist calculation. Added `slotMap` to the memo's dependency array.

### WR-01: `useUpdateSlotMap` does not invalidate `SLOT_MAP_BY_INSTANCE_KEY`

**Files modified:** `src/hooks/useTechniqueInstances.ts`
**Commit:** `6be900be`
**Applied fix:** Added `SLOT_MAP_BY_INSTANCE_KEY` import from `useSlotResolutionMap` and added `qc.invalidateQueries({ queryKey: SLOT_MAP_BY_INSTANCE_KEY(variables.instanceId) })` to the `onSuccess` handler, preventing the EditColoursDialog prefill from showing stale values when reopened within the 5-minute staleTime window.

### WR-02: `applyTechnique` uses `lastInsertId ?? 0` — silent zero-ID fallback

**Files modified:** `src/db/queries/recipeTechniqueInstances.ts`
**Commit:** `9ff340bd`
**Applied fix:** Replaced `const instanceId = instanceResult.lastInsertId ?? 0` with an explicit check and throw: `if (!instanceId) throw new Error("applyTechnique: INSERT recipe_technique_instances did not return lastInsertId")`. Applied same pattern to the section INSERT's `lastInsertId`.

### WR-03: `getSlotResolutionMap` JOIN excludes slotless steps without explanation

**Files modified:** `src/db/queries/recipeTechniqueSlotMaps.ts`
**Commit:** `d51021cb` (included in CR-01 commit)
**Applied fix:** Added a clarifying SQL comment `-- (ts.colour_slot_id IS NULL means no slot; sm.paint_id will be NULL via LEFT JOIN)` in the WHERE clause, and updated the JSDoc to explain that slotless steps yield null paint by design via the LEFT JOIN.

### IN-01: `_instanceTechniqueNameMap` prop in `TechniqueControls` is declared but never read

**Files modified:** `src/features/recipes/RecipeSectionList.tsx`
**Commit:** `7c97c94a`
**Applied fix:** Removed `instanceTechniqueNameMap: Map<number, string>` from `TechniqueControlsProps`, removed the `_instanceTechniqueNameMap` destructured parameter from `TechniqueControls`, and removed `instanceTechniqueNameMap={nameMap}` from the call site.

### IN-02: `_sections` and `_readOnly` are destructured but unused

**Files modified:** `src/features/recipes/RecipeSectionList.tsx`, `src/features/recipes/RecipeStepTimeline.tsx`, `src/features/recipes/SectionedTimeline.tsx`
**Commit:** `7c97c94a`
**Applied fix:** Removed `sections: DraftSection[]` from `TechniqueNameResolverProps` and `_sections` from the component destructuring and call site. Removed `readOnly?: boolean` from `RecipeStepTimelineProps` and the `_readOnly` parameter (the parent already enforces read-only via `pointer-events-none` CSS on the wrapper div); removed `readOnly={isTechniqueSection}` from the `SectionedTimeline` call site.

### IN-03: `duplicateRecipe` INSERT sites missing column audit comments

**Files modified:** `src/db/queries/recipes.ts`
**Commit:** `0ac1dc3b` (included in CR-02 commit)
**Applied fix:** Added AUDIT comments at both the section INSERT and step INSERT sites in `duplicateRecipe` documenting the current column set (migration 051 baseline) and flagging them for review when future migrations add columns to `recipe_sections` or `recipe_steps`.

---

## Build and Test Results

- `pnpm build`: PASS (tsc strict + vite build clean)
- `pnpm test`: PASS — 2999 tests passed, 6 skipped, 38 todo (3043 total)
  - All 9 findings fixed and verified
  - New SLOT-04 double-apply resolution test added and passing
  - All pre-existing tests remain green

---

_Fixed: 2026-06-22_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

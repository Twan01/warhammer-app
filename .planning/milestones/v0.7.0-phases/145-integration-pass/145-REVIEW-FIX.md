---
phase: 145-integration-pass
fixed_at: 2026-06-22T00:00:00Z
review_path: .planning/phases/145-integration-pass/145-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 145: Code Review Fix Report

**Fixed at:** 2026-06-22T00:00:00Z
**Source review:** .planning/phases/145-integration-pass/145-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: getSlotResolutionMap does not exclude detached instances

**Files modified:** `src/db/queries/recipeTechniqueSlotMaps.ts`
**Commit:** 171f98bd
**Applied fix:** Added `AND rti.detached = 0` to the WHERE clause of `getSlotResolutionMap`,
matching the guard already present in `getUnfilledSlotCount`. Detached instances no longer
leak stale slot fills into the resolution map.

---

### WR-01: getStepSlotIdMap does not filter detached instances

**Files modified:** `src/db/queries/recipeTechniqueSlotMaps.ts`
**Commit:** 171f98bd (same atomic commit as CR-01 — same file)
**Applied fix:** Added `AND rti.detached = 0` to the WHERE clause of `getStepSlotIdMap`.
The sed substitution pattern matched both queries in the same pass; both were committed
atomically.

---

### CR-02: ChecklistStepRow renders unfilled technique slots as invisible plain rows

**Files modified:** `src/features/recipes/ChecklistStepRow.tsx`, `src/features/recipes/AssignmentChecklist.tsx`, `tests/techniques/AssignmentChecklist.test.tsx`
**Commit:** 349bae39
**Applied fix:**
- `ChecklistStepRow`: added `isUnfilledSlot: boolean` prop; included it in `hasDetail` so
  the row always shows a chevron and CollapsibleContent for unfilled technique steps;
  rendered a dashed-circle div with `aria-label="Colour slot unfilled"` and "Slot unfilled"
  text inside the expanded content, mirroring the StepFocalView pattern.
- `AssignmentChecklist`: added `isStepUnfilledSlot` useCallback that returns true when
  `technique_step_id` is set and `effectivePaintId` resolves to null; passed
  `isUnfilledSlot={isStepUnfilledSlot(step)}` to all three `ChecklistStepRow` call sites
  (orphanSteps map, sectionSteps map, flat list).
- Test: added two new assertions to `tests/techniques/AssignmentChecklist.test.tsx` —
  one checks "Slot unfilled" text renders after expanding the row, the other asserts
  `aria-label="Colour slot unfilled"` is accessible.

---

### WR-02: SlotReassignMiniDialog passes showCloseButton={false} — non-standard prop

**Files modified:** `src/features/painting-mode/SlotReassignMiniDialog.tsx`
**Commit:** a6846dc2
**Applied fix:** Removed `showCloseButton={false}` from `<DialogContent>`. The dialog now
relies on the existing `onOpenChange` handler and the built-in close button (X), which
already calls `onClose()` correctly via `onOpenChange(false)`.

---

### WR-03: PaintReadinessBanner dismiss flag survives recipe navigation

**Files modified:** `src/features/painting-mode/PaintingModeView.tsx`
**Commit:** 3130eb4d
**Applied fix:** Added `useEffect(() => { setBannerDismissed(false); }, [recipeId])` after
the `bannerDismissed` useState declaration. `useEffect` was already imported. The banner
dismiss state now resets whenever `recipeId` changes.

---

### IN-01: useSlotResolutionMap JSDoc says "technique_step_id" key — should be "recipe_step_id"

**Files modified:** `src/hooks/useSlotResolutionMap.ts`
**Commit:** 96677016
**Applied fix:** Updated the section comment from
`// useSlotResolutionMap — Map<technique_step_id, paint_id|null> for a recipe`
to
`// useSlotResolutionMap — Map<recipe_step_id, paint_id|null> for a recipe`
to reflect the SLOT-04 fix semantics.

---

### IN-02: resolvedPaint() defined as inline function in AssignmentChecklist — not memoized

**Files modified:** `src/features/recipes/AssignmentChecklist.tsx`
**Commit:** 349bae39 (same atomic commit as CR-02 — same file)
**Applied fix:** Converted `function resolvedPaint(step)` to
`const resolvedPaint = useCallback((step) => { ... }, [slotMap, paintsById])`.
Also added `useCallback` to the import.

---

## Build and Test Results

**pnpm build:** PASSED — TypeScript strict check clean, Vite build succeeded (3254 modules)
**pnpm test:** PASSED — 3056 tests passed, 6 skipped, 0 failed (340 test files)
- New CR-02 tests confirmed green:
  - "CR-02: technique step with unfilled slot shows dashed-circle indicator (not a plain row)"
  - "CR-02: technique step with unfilled slot has distinct indicator accessible via aria-label"

---

_Fixed: 2026-06-22T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

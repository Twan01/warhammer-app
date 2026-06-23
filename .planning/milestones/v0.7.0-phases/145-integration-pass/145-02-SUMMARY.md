---
phase: 145-integration-pass
plan: "02"
subsystem: painting-mode
tags: [technique-library, slot-maps, painting-mode, effectivePaintId, three-state-ui, INTG-01, INTG-02, INTG-06]
dependency_graph:
  requires: [145-01]
  provides: [PaintReadinessBanner-unfilledSlotCount, StepFocalView-isUnfilledSlot, PaintingModeView-slotMap-wired, INTG-01, INTG-02, INTG-06]
  affects:
    - src/features/painting-mode/PaintReadinessBanner.tsx
    - src/features/painting-mode/StepFocalView.tsx
    - src/features/painting-mode/PaintingModeView.tsx
    - tests/painting-mode/PaintReadinessBanner.test.tsx
    - tests/painting-mode/StepFocalView.test.tsx
tech_stack:
  added: []
  patterns: [effectivePaintId consumer wiring, three-state paint block, enabled-by-id hook fallback, slotMap useMemo dep]
key_files:
  created: []
  modified:
    - src/features/painting-mode/PaintReadinessBanner.tsx
    - src/features/painting-mode/StepFocalView.tsx
    - src/features/painting-mode/PaintingModeView.tsx
    - tests/painting-mode/PaintReadinessBanner.test.tsx
    - tests/painting-mode/StepFocalView.test.tsx
decisions:
  - hasPaint = !!paint (not currentStep.paint_id !== null && paint) — parent now resolves paint via effectivePaintId so local paint_id check breaks for technique steps
  - isUnfilledSlot derived as technique_step_id != null && resolvedPaintId === null — unfilled slot is visually distinct, never silently shown as '(no paint)'
  - slotMap added to missingPaints useMemo deps — prevents stale resolution when slots are reassigned (T-145-04)
  - onReassignSlot omitted from PaintingModeView pass-through — SlotReassignMiniDialog is Plan 04
metrics:
  duration: "14 minutes"
  completed: "2026-06-22T19:17:00Z"
  tasks_completed: 3
  files_changed: 5
---

# Phase 145 Plan 02: Integration Pass — Painting Mode Wire-up Summary

**One-liner:** effectivePaintId resolution spine wired into PaintingModeView (missingPaints + currentPaint + isUnfilledSlot), StepFocalView extended with distinct dashed unfilled-slot indicator, and PaintReadinessBanner extended with neutral "N colour slots unfilled" line.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | PaintReadinessBanner — unfilledSlotCount prop + "N colour slots unfilled" line | 835d1bea | src/features/painting-mode/PaintReadinessBanner.tsx, tests/painting-mode/PaintReadinessBanner.test.tsx |
| 2 | StepFocalView — three-state paint block with distinct unfilled-slot indicator | 0eeafe55 | src/features/painting-mode/StepFocalView.tsx, tests/painting-mode/StepFocalView.test.tsx |
| 3 | PaintingModeView — wire slotMap into missingPaints + currentPaint + banner | 072fc934 | src/features/painting-mode/PaintingModeView.tsx |

## What Was Built

### PaintReadinessBanner extension (INTG-06)
Added `unfilledSlotCount?: number` prop. Updated early-return guard to `missingPaints.length === 0 && !unfilledSlotCount` so the banner stays rendered when only unfilled slots are present. Added Circle icon + Separator + neutral `text-muted-foreground` "N colour slots unfilled" line (singular/plural). Four new test cases green.

### StepFocalView three-state paint block (INTG-01)
Added `isUnfilledSlot?: boolean` and `onReassignSlot?: () => void` props. Replaced `const hasPaint = currentStep.paint_id !== null && paint` with `const hasPaint = !!paint` (parent now resolves via effectivePaintId — local paint_id check breaks for technique steps). Three-state render: (1) hasPaint → resolved swatch unchanged; (2) isUnfilledSlot → dashed `h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground` circle inside a button with aria-label "Colour slot unfilled. Tap to assign a paint." + label "Slot unfilled — tap to assign"; (3) fallback `(no paint)`. Three new INTG-01 tests green.

### PaintingModeView wiring (INTG-02)
Imported `useSlotResolutionMap`, `useUnfilledSlotCount`, `effectivePaintId`. Two hook calls at component level. missingPaints useMemo now calls `effectivePaintId(step, slotMap)` instead of reading `step.paint_id` directly — filled technique slots now count toward missing exactly as plain steps. `slotMap` added to useMemo deps (T-145-04 threat mitigation). `currentPaint` derived via `resolvedPaintId = effectivePaintId(currentStep, slotMap)`. `isUnfilledSlot = technique_step_id != null && resolvedPaintId === null`. `showBanner` updated to include `unfilledSlotCount > 0`. Props passed down: `unfilledSlotCount` to banner, `isUnfilledSlot` to StepFocalView. No `SlotReassignMiniDialog` / `onReassignSlot` in this plan (Plan 04).

## Verification Results

- `pnpm test -- tests/painting-mode/`: 338 test files passed, 3044 tests passed (7 new from this plan)
- `pnpm build`: clean TypeScript check + Vite build successful
- `grep -E "step\.paint_id|currentStep\.paint_id" src/features/painting-mode/PaintingModeView.tsx`: no match (INTG-02 gate clean)
- `grep "effectivePaintId(step, slotMap)" src/features/painting-mode/PaintingModeView.tsx`: 1 match

## Deviations from Plan

None — plan executed exactly as written. The `onReassignSlot` prop was added to StepFocalView (as specified) but not passed from PaintingModeView (also as specified — Plan 04 handles the mini-dialog).

## Known Stubs

- `onReassignSlot` prop on StepFocalView is wired to nothing in PaintingModeView. Plan 04 (SlotReassignMiniDialog) will wire it. The dashed button is correctly rendered but clicking it is a no-op until Plan 04.

## Threat Flags

None beyond the plan's threat model entries (T-145-04, T-145-05, T-145-06 all mitigated).

## Self-Check: PASSED

- [x] `src/features/painting-mode/PaintReadinessBanner.tsx` exists and contains `unfilledSlotCount`, `Separator`, `Circle`, "colour slot unfilled"
- [x] `src/features/painting-mode/StepFocalView.tsx` exists and contains `isUnfilledSlot`, `border-dashed`, "Colour slot unfilled. Tap to assign a paint."
- [x] `src/features/painting-mode/PaintingModeView.tsx` exists and contains `effectivePaintId(step, slotMap)`, `useSlotResolutionMap`, `useUnfilledSlotCount`, `unfilledSlotCount > 0`; no direct `step.paint_id` / `currentStep.paint_id` resolution reads
- [x] Commits 835d1bea, 0eeafe55, 072fc934 exist in git log

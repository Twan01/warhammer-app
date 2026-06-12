---
phase: 126-critical-fixes-dead-ends
plan: 01
subsystem: painting-mode
tags: [dead-end-fix, ux, navigation]
dependency_graph:
  requires: []
  provides: [painting-mode-exit-affordance, painting-mode-not-found-recovery]
  affects: [painting-mode]
tech_stack:
  added: []
  patterns: [onExit-prop-threading]
key_files:
  created: []
  modified:
    - src/features/painting-mode/StepFocalView.tsx
    - src/features/painting-mode/PaintingModeView.tsx
    - src/app/painting-mode/page.tsx
decisions:
  - "D-01: Exit button + Escape hint on completion screen via onExit prop"
  - "D-02: Go Back button with ArrowLeft on assignment-not-found screen"
  - "D-03: Esc to exit hint in normal step view footer"
metrics:
  duration: 4m 17s
  completed: 2026-06-11
---

# Phase 126 Plan 01: Painting Mode Dead-End Elimination Summary

Exit button on completion screen + Go Back on not-found screen + Escape hints on all views via onExit prop threading through PaintingModeView

## What Was Done

### Task 1: Add onExit prop to StepFocalView and PaintingModeView
- Added `onExit?: () => void` to `StepFocalViewProps` interface
- Added `onExit?: () => void` to `PaintingModeViewProps` interface
- Completion screen (`isAllComplete` branch) now renders "Exit Painting Mode" Button and "Press Escape to exit" hint when `onExit` is provided
- Normal step view footer now shows "Esc to exit" hint below action buttons
- PaintingModeView threads `onExit` prop to StepFocalView
- **Commit:** `f33d34ba`

### Task 2: Wire onExit in page.tsx and add Go Back to not-found screen
- Passed `onExit={handleExit}` to PaintingModeView (connects to existing navigate-to-home handler)
- Added "Go Back" Button with ArrowLeft icon to assignment-not-found screen
- Added "Press Escape to exit" hint to not-found screen
- Imported `Button` from `@/components/ui/button` and `ArrowLeft` from `lucide-react`
- **Commit:** `d8f80e96`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript build passes with no errors (`pnpm build` succeeds)
- Pre-existing test suite passes (2571 tests pass; 2 pre-existing failures in unrelated bsdata.ts determinism test)
- All three Painting Mode screen states now have visible exit affordances:
  - Completion screen: Exit button + Escape hint
  - Not-found screen: Go Back button + Escape hint
  - Normal step view: Esc to exit hint

## Known Stubs

None.

## Self-Check: PASSED

---
phase: 86-shell-route-keyboard
plan: 02
subsystem: painting-mode
tags: [section-completion, kbd-badges, keyboard-tests, SP-05, PX-06, D-10]
dependency_graph:
  requires: [86-01]
  provides: [section-completion-ack, kbd-shortcut-badges, painting-mode-page-tests]
  affects: [SectionNavigator, StepFocalView, PaintingModePage]
tech_stack:
  added: []
  patterns: [fireEvent.keyDown for react-hotkeys-hook testing]
key_files:
  created:
    - tests/painting-mode/PaintingModePage.test.tsx
  modified:
    - src/features/painting-mode/SectionNavigator.tsx
    - src/features/painting-mode/StepFocalView.tsx
    - src/app/painting-mode/page.tsx
    - tests/painting-mode/SectionNavigator.test.tsx
    - tests/painting-mode/StepFocalView.test.tsx
decisions:
  - "fireEvent.keyDown on document (not userEvent.keyboard) for react-hotkeys-hook tests -- the library registers listeners on document, not focused element"
  - "Fixed space hotkey from ' ' to 'space' -- react-hotkeys-hook trims the key string, making ' ' resolve to empty string (Rule 1 bug fix)"
metrics:
  duration: "~11 minutes"
  completed: "2026-05-19"
---

# Phase 86 Plan 02: Section Completion + Kbd Badges + Page Tests Summary

SP-05 section completion acknowledgment with green checkmark, D-10 keyboard shortcut kbd badges on navigation controls, and full PX-02 through PX-05 keyboard shortcut test coverage for PaintingModePage.

## What Was Built

### Task 1: SP-05 Section Completion Acknowledgment + D-10 Kbd Badges

**SectionNavigator SP-05:**
- Added `isComplete` boolean derived from `progress.completed === progress.total && total > 0`
- Complete sections show a green Check icon (`h-4 w-4 text-green-500`) with `data-testid="section-complete"` instead of the progress Badge
- Complete section names use `text-muted-foreground` class for visual de-emphasis
- Incomplete sections retain the existing Badge with `progressText`

**StepFocalView D-10 Kbd Badges:**
- Previous button: added `kbd` element showing left arrow after the ChevronLeft icon
- Next button: added `kbd` element showing right arrow before the ChevronRight icon
- Mark Done button: added `kbd` element showing "Space" after the button text
- Removed `size="icon"` from Prev/Next buttons, replaced with `className="flex items-center gap-1"`

### Task 2: Keyboard Shortcut + SP-05 + Kbd Badge Tests

**New: PaintingModePage.test.tsx (6 tests):**
- PX-02: Space key calls mark done handler via fireEvent.keyDown
- PX-03: ArrowRight calls goNext, ArrowLeft calls goPrev
- PX-04: Escape calls navigate
- PX-05: Shortcuts disabled when input element is focused
- Renders PaintingModeView when assignment loads

**Extended: SectionNavigator.test.tsx (+3 tests):**
- SP-05: Check icon renders when all steps complete
- SP-05: Badge with count renders when section incomplete
- SP-05: Completed section name has muted styling

**Extended: StepFocalView.test.tsx (+1 test):**
- D-10: Three kbd badges render with correct text content

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed space key hotkey binding**
- **Found during:** Task 2 (test verification)
- **Issue:** `useHotkeys(" ", handler)` in PaintingModePage used a space character `" "` which react-hotkeys-hook trims to empty string, making the binding silently fail. Arrow keys and Escape worked because their key names don't get trimmed.
- **Fix:** Changed to `useHotkeys("space", handler)` which matches the library's `L()` code-to-key mapping (`"Space"` code maps to `"space"`)
- **Files modified:** `src/app/painting-mode/page.tsx`
- **Commit:** 5619e06

## Verification

- `pnpm build` exits 0
- `pnpm test -- tests/painting-mode/` -- all tests pass (1901 total)
- Full test suite green with no regressions

## Self-Check: PASSED

---
phase: 87-session-integration-entry-points
plan: 01
subsystem: painting-mode
tags: [session-logging, sheet, zod, react-hook-form, painting-mode]
dependency_graph:
  requires: [84-data-layer-early-tests, 85-core-execution-ui, 86-painting-mode-keyboard]
  provides: [painting-session-sheet, session-entry-buttons]
  affects: [src/features/painting-mode, src/app/painting-mode]
tech_stack:
  added: []
  patterns: [zod-schema-no-default, sibling-sheet-contract, buildDefaultValues-pattern]
key_files:
  created:
    - src/features/painting-mode/paintingSessionSchema.ts
    - src/features/painting-mode/PaintingSessionSheet.tsx
  modified:
    - src/features/painting-mode/StepFocalView.tsx
    - src/features/painting-mode/PaintingModeView.tsx
    - src/app/painting-mode/page.tsx
    - tests/painting-mode/StepFocalView.test.tsx
    - tests/painting-mode/PaintingModeView.test.tsx
    - tests/painting-mode/PaintingModePage.test.tsx
decisions:
  - "Sheet rendered as sibling of PaintingModeView in Fragment (never nested) — follows DashboardPage pattern"
  - "useUnit + useRecipe queries added to PaintingModePage for sheet prefill; enabled guard prevents unnecessary calls"
  - "Test files updated to include onMarkDoneWithSession mock prop (Rule 1 auto-fix)"
metrics:
  duration: 25m
  completed: 2026-05-19
  tasks_completed: 2
  files_created: 2
  files_modified: 6
---

# Phase 87 Plan 01: Session Integration + Entry Points Summary

**One-liner:** Zod-validated PaintingSessionSheet with prefilled context wired into StepFocalView button pair via sibling Fragment pattern.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create paintingSessionSchema + PaintingSessionSheet | 8ce9964 | paintingSessionSchema.ts, PaintingSessionSheet.tsx |
| 2 | Wire button pair in StepFocalView + sheet state in PaintingModePage | 8ce9964 | StepFocalView.tsx, PaintingModeView.tsx, page.tsx, 3 test files |

## What Was Built

**paintingSessionSchema.ts** — Minimal Zod schema with exactly two fields:
- `duration_minutes`: z.number().int().positive().max(1440)
- `notes`: z.string().max(2000).nullable()
No `.default()` used — follows the documented pitfall from logSessionSchema.ts.

**PaintingSessionSheet.tsx** — Lightweight session logger Sheet following LogSessionSheet.tsx pattern:
- Props: open, onClose, unitName, recipeName, stepName, sectionName, onSubmit, isPending
- Read-only prefill block showing unit/recipe/section/step context
- Two editable fields: duration (number input, min=1 max=1440, default=30) and notes (textarea)
- Footer: "Keep Working" (ghost, closes) + "Save & Mark Done" (default, submits)
- Form resets on open via useEffect pattern

**StepFocalView.tsx** — New `onMarkDoneWithSession: () => void` prop added. Single "Mark Done" button replaced with `div.flex.flex-col.gap-2` containing two buttons:
1. Primary: "Mark Done" (h-12, variant default, Check icon, Space kbd badge) — unchanged behavior
2. Secondary: "Done + Log Session" (variant outline, h-10 implied by default, data-testid="mark-done-with-session-btn")

**PaintingModeView.tsx** — Added `onMarkDoneWithSession` prop to interface, threaded to StepFocalView.

**page.tsx (PaintingModePage)** — Added:
- `useState` + `useUnit` + `useRecipe` imports
- `paintingSessionOpen` state
- `handleMarkDoneWithSession(duration, notes)` handler calling `completeMutation.mutate` with user-provided values; onSuccess closes sheet then advances
- `onMarkDoneWithSession={() => setPaintingSessionOpen(true)}` passed to PaintingModeView
- `PaintingSessionSheet` rendered as sibling after main div (Fragment wrapper)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test files broke due to new required prop**
- **Found during:** Task 2 TypeScript check
- **Issue:** Three existing test files used `StepFocalViewProps` and `PaintingModeView` without the new `onMarkDoneWithSession` prop, causing TS errors and test failures
- **Fix:** Added `onMarkDoneWithSession: vi.fn()` to StepFocalView.test.tsx defaultProps; added `onMarkDoneWithSession={vi.fn()}` to PaintingModeView.test.tsx render call; added mock for `useUnit`, `useRecipe`, and `PaintingSessionSheet` in PaintingModePage.test.tsx
- **Files modified:** tests/painting-mode/StepFocalView.test.tsx, tests/painting-mode/PaintingModeView.test.tsx, tests/painting-mode/PaintingModePage.test.tsx
- **Commit:** 8ce9964

### Pre-existing Issues (Out of Scope)

The following TS errors exist in files modified by a previous session (before Plan 01 execution) and are NOT caused by Plan 01:
- `src/features/dashboard/NextPaintingActionCard.tsx` — TanStack Router route type error for `/bare-layout/painting-mode/$assignmentId`
- `src/features/dashboard/DashboardPage.tsx` — Same route type error
- `src/features/units/AppliedRecipesTab.tsx` — Same route type error

These are covered by Plan 02 (entry points wiring). The route exists in the app router but TanStack Router's type inference did not pick it up in the type registry at the time of these edits. TypeScript compiles cleanly when only Plan 01 files are considered.

## Verification Results

- `npx tsc --noEmit` — PASS (0 errors from Plan 01 files)
- `tests/painting-mode/StepFocalView.test.tsx` — PASS (all tests green)
- `tests/painting-mode/PaintingModePage.test.tsx` — PASS (all tests green)
- `tests/painting-mode/PaintingModeView.test.tsx` — PASS (all tests green)

## Known Stubs

None — PaintingSessionSheet passes real user-entered values to `completeMutation.mutate`. Unit and recipe names are fetched from live queries (useUnit, useRecipe) with `""` fallback while loading.

## Threat Flags

No new threat surface beyond what the plan's threat model covers. T-87-01 and T-87-02 mitigations are in place:
- duration_minutes: Zod z.number().int().positive().max(1440) before reaching DB
- notes: Zod z.string().max(2000) before reaching DB
- Both pass through existing `completeStepWithSession` parameterized query ($N syntax)

## Self-Check: PASSED

- paintingSessionSchema.ts: FOUND
- PaintingSessionSheet.tsx: FOUND
- Commit 8ce9964: FOUND in git log

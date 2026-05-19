---
phase: 85-core-execution-ui
plan: "03"
subsystem: painting-mode
tags: [ui, composition, step-execution, split-panel]
dependency_graph:
  requires: [85-01, 85-02]
  provides: [PaintingModeView, StepFocalView]
  affects: [painting-mode-route, painting-mode-shell]
tech_stack:
  added: []
  patterns: [root-composition, prop-drilling, split-panel-layout, photo-url-resolution]
key_files:
  created:
    - src/features/painting-mode/StepFocalView.tsx
    - src/features/painting-mode/PaintingModeView.tsx
    - tests/painting-mode/StepFocalView.test.tsx
    - tests/painting-mode/PaintingModeView.test.tsx
  modified: []
decisions:
  - "unitId passed as third prop to PaintingModeView (Pitfall 2 resolution)"
  - "Mark-done creates 0-duration session for atomic step+session write (Pitfall 1)"
  - "Photo URL resolution follows RecipeDetailSheet cancelled-flag pattern"
metrics:
  duration: 5m
  completed: 2026-05-19
---

# Phase 85 Plan 03: Step Focal View + Root Composition Summary

StepFocalView hero card with paint swatch, metadata row, reference photo, prev/next navigation, position indicator, and mark-done button; PaintingModeView root composing all hooks and child components into split-panel layout with paint readiness banner and loading/empty states.

## What Was Done

### Task 1: StepFocalView + PaintingModeView components (f6eb414)

**StepFocalView** -- right panel of split layout:
- Step name in Display 28px heading
- 40px paint swatch circle with backgroundColor from hex_color, paint name, brand+type, owned indicator dot
- Paintless steps show "(no paint)" with no swatch
- StepMetadataRow for technique/tool/dilution/time
- Reference photo (max-h-320px, collapses when absent)
- Step notes (conditional)
- Navigation bar: Previous/Next ghost buttons with disabled states, position indicator "Step X of Y . SectionName"
- Full-width Mark Done primary button (h-12, disabled when completed or all-complete)
- All-complete state: CheckCircle + "All steps complete!" replacing content

**PaintingModeView** -- root composition:
- Props: assignmentId, recipeId, unitId
- Composes: usePaintingModeState, useCompleteStep, usePaints, useRecipeSections
- Builds paintMap (Map<number, Paint>) from usePaints
- Derives missingPaints with isPaintMissing + deduplication
- Resolves step photo URLs via appDataDir + join + convertFileSrc with cancelled-flag pattern
- Mark-done handler: CompleteStepVars with duration_minutes: 0 session, goNext on success
- Loading skeleton (3 Skeleton blocks)
- Empty state: "No steps in this recipe" heading + body
- Split-panel: PaintReadinessBanner (conditional) + SectionNavigator (280px) + StepFocalView (flex-1)

### Task 2: Test suites (f71485f)

**StepFocalView tests** (14 tests):
- Step name rendered (SE-01)
- Paint swatch with backgroundColor style (SE-01)
- Paint name and brand info (SE-01)
- Metadata row fields (SE-01)
- Reference photo shown/hidden (SE-05)
- Position indicator with/without section name (SE-04)
- Previous/Next button disabled states and callbacks (SE-03)
- Mark Done callback (SE-02)
- Mark Done disabled when completed
- Paintless step handling
- All-complete state

**PaintingModeView tests** (5 integration tests):
- Loading skeleton (PX-01)
- Empty state message
- Split-panel layout renders both panels
- Banner shown for missing paints
- No banner when paints owned

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **unitId as third prop** -- PaintingModeView accepts { assignmentId, recipeId, unitId } to satisfy useCompleteStep's CompleteStepVars requirement without an extra query
2. **Minimal session on mark-done** -- duration_minutes: 0 with todayISO() date; Phase 87 adds session logging UI
3. **Photo URL pattern** -- Reused RecipeDetailSheet's cancelled-flag async useEffect pattern for resolving asset:// URLs

## Verification

- pnpm build: PASS (no TypeScript errors)
- pnpm test: 210 files passed, 1891 tests green

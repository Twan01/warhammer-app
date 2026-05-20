---
phase: 87
slug: session-integration-entry-points
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-19
audited: 2026-05-20
---

# Phase 87: Session Integration + Entry Points — Validation Architecture

**Extracted from:** 87-RESEARCH.md
**Phase:** 87-session-integration-entry-points

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest section) |
| Quick run command | `pnpm test -- tests/painting-mode/` |
| Full suite command | `pnpm test` |

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SL-01 | PaintingSessionSheet opens prefilled with unit/recipe/section/step context | unit | `pnpm test -- tests/painting-mode/PaintingSessionSheet.test.tsx` | Yes -- green |
| SL-02 | "Done + Log Session" calls `completeStepWithSession` with user-entered duration+notes | unit | `pnpm test -- tests/painting-mode/PaintingModePage.test.tsx` | Yes -- green (extended) |
| SL-03 | "Mark Done" standalone does not open sheet or pass non-zero duration | unit | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx` | Yes -- green (extended) |
| EP-01 | NextPaintingActionCard link points to painting mode route | unit | `pnpm test -- tests/dashboard/NextPaintingActionCard.test.tsx` | Yes -- green (pre-existing) |
| EP-02 | CurrentFocusCard "Paint" button triggers navigation | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | Yes -- green |
| EP-03 | AppliedRecipesTab shows "Paint" button per assignment | unit | `pnpm test -- tests/units/AppliedRecipesTab.test.tsx` | Yes -- green |
| EP-04 | KanbanCard shows painting mode link when assignmentId available | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | Yes -- green |
| EP-05 | RecipeDetailSheet shows "Paint" link for applied units | unit | `pnpm test -- tests/recipes/RecipeDetailSheetPaint.test.tsx` | Yes -- green |
| EP-06 | Entry point surfaces suppress paint link when no assignment | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | Yes -- green (covered in EP-02/EP-04 negative tests) |

## Sampling Rate

- **Per task commit:** `pnpm test -- tests/painting-mode/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

## Wave 0 Gaps -- RESOLVED

- [x] `tests/painting-mode/PaintingSessionSheet.test.tsx` -- 7 tests, covers SL-01 (sheet renders prefilled fields, form defaults, submit, close)
- [x] `tests/painting-mode/entryPoints.test.tsx` -- 8 tests, covers EP-02 + EP-04 + EP-06 (CurrentFocusCard Paint, KanbanCard paint icon, negative cases)
- [x] `tests/units/AppliedRecipesTab.test.tsx` -- 4 tests, covers EP-03 (Paint button per assignment, navigation)
- [x] `tests/recipes/RecipeDetailSheetPaint.test.tsx` -- 4 tests, covers EP-05 (Paint button for applied units)
- [x] `tests/painting-mode/PaintingModePage.test.tsx` -- extended with 3 SL-02 tests (session sheet open, context props, mutation payload)
- [x] `tests/painting-mode/StepFocalView.test.tsx` -- extended with 3 SL-03 tests (button existence, isolation, disabled state)

## Validation Audit 2026-05-20

| Metric | Count |
|--------|-------|
| Gaps found | 8 |
| Resolved | 8 |
| Escalated | 0 |

**Nyquist-compliant:** All 9 requirements have automated verification (1 pre-existing, 8 filled).

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
| SL-01 | PaintingSessionSheet opens prefilled with unit/recipe/section/step context | unit | `pnpm test -- tests/painting-mode/PaintingSessionSheet.test.tsx` | No — Wave 0 |
| SL-02 | "Done + Log Session" calls `completeStepWithSession` with user-entered duration+notes | unit | `pnpm test -- tests/painting-mode/PaintingModePage.test.tsx` | Yes — extend existing |
| SL-03 | "Mark Done" standalone does not open sheet or pass non-zero duration | unit | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx` | Yes — extend existing |
| EP-01 | NextPaintingActionCard link points to painting mode route | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | No — Wave 0 |
| EP-02 | CurrentFocusCard "Paint" button triggers navigation | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | No — Wave 0 |
| EP-03 | AppliedRecipesTab shows "Start Painting" button per assignment | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | No — Wave 0 |
| EP-04 | KanbanCard shows painting mode link when assignmentId available | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | No — Wave 0 |
| EP-05 | RecipeDetailSheet shows "Paint" link for applied units | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | No — Wave 0 |
| EP-06 | Entry point surfaces suppress paint link when no assignment | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | No — Wave 0 |

## Sampling Rate

- **Per task commit:** `pnpm test -- tests/painting-mode/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

## Wave 0 Gaps

- [ ] `tests/painting-mode/PaintingSessionSheet.test.tsx` — covers SL-01 (sheet renders prefilled fields)
- [ ] `tests/painting-mode/entryPoints.test.tsx` — covers EP-01 through EP-06 (one describe block per surface, mocking hooks)

*(Existing test files `PaintingModePage.test.tsx` and `StepFocalView.test.tsx` will be extended for SL-02 and SL-03 within plan tasks.)*

---
phase: 84-data-layer-early-tests
plan: 02
subsystem: hooks
tags: [react-query, zustand, painting-mode, navigation, tdd]

# Dependency graph
requires:
  - phase: 48-51 (v0.2.7)
    provides: RecipeSection type, useRecipeSections hook
  - phase: 62 (v0.2.10)
    provides: StepProgress type, useStepProgress hook
provides:
  - usePaintingModeState hook — section-aware step ordering + navigation + progress
affects: [85-core-execution-ui, 86-shell-route-keyboard, 87-session-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [composition-hook, section-aware-ordering, mount-only-initial-selection]

key-files:
  created:
    - src/hooks/usePaintingModeState.ts
    - tests/painting-mode/paintingModeState.test.ts
  modified: []

key-decisions:
  - "Empty useMemo deps for initialStepId — mount-only computation, navigation is controlled state after"
  - "999999 fallback for null section_id — unsectioned steps always sort last"

patterns-established:
  - "Composition hook pattern: usePaintingModeState composes 3 existing hooks, no new DB queries"
  - "Section-aware ordering: sectionOrderMap.get(section_id) ?? 999999, then order_index"

requirements-completed: [DL-02, DL-04, TS-01, TS-03]

# Metrics
duration: 4min
completed: 2026-05-19
---

# Phase 84 Plan 02: usePaintingModeState Navigation Hook Summary

**Section-aware step ordering hook with first-incomplete selection, prev/next/jumpTo navigation, and per-section progress map — 11 TDD tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-19T12:59:18Z
- **Completed:** 2026-05-19T13:03:24Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files created:** 2

## Accomplishments
- Section-aware step ordering using COALESCE(section.order_index, 999999) pattern
- First-incomplete-step auto-selection on mount for immediate painting resume
- Full navigation API: goPrev, goNext, goToStep with boundary guards
- Per-section progress map (completed/total/name) for sidebar progress indicators
- 11 comprehensive tests covering ordering, navigation, and progress scenarios

## TDD Gate Compliance

- RED commit: `348e664` — test(84-02): 11 failing tests (module not found)
- GREEN commit: `eaa1d8a` — feat(84-02): all 11 tests pass, build clean
- No REFACTOR needed — implementation clean on first pass

## Task Commits

1. **Task 1: Create paintingModeState tests (RED)** - `348e664` (test)
2. **Task 2: Implement usePaintingModeState hook (GREEN)** - `eaa1d8a` (feat)

## Files Created/Modified
- `src/hooks/usePaintingModeState.ts` - Navigation hook composing useRecipePaints, useRecipeSections, useStepProgress
- `tests/painting-mode/paintingModeState.test.ts` - 11 test cases for ordering, navigation, progress

## Decisions Made
- Used empty dependency array for initialStepId useMemo — mount-only computation since navigation becomes controlled state after first render
- 999999 sentinel value for null section_id ensures unsectioned steps always sort after all sectioned steps

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- usePaintingModeState ready for Phase 85 UI consumption
- Hook returns all state needed for PaintingModePage: orderedSteps, currentStepId, navigation functions, sectionProgressMap
- No blockers

---
*Phase: 84-data-layer-early-tests*
*Completed: 2026-05-19*

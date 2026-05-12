---
phase: 60-kanban-currentfocus-integration
plan: 01
subsystem: workflow-position-derivation
tags: [pure-function, react-query, batch-enrichment, tdd]
dependency_graph:
  requires: []
  provides: [computeWorkflowPosition, useWorkflowPositions, WorkflowPosition]
  affects: [KanbanCard, CurrentFocusCard, getRecipeNamesByUnitIds]
tech_stack:
  added: []
  patterns: [batch-enrichment-hook, pure-function-derivation, sorted-key-cache]
key_files:
  created:
    - src/lib/computeWorkflowPosition.ts
    - src/hooks/useWorkflowPositions.ts
    - tests/lib/computeWorkflowPosition.test.ts
  modified:
    - src/db/queries/recipes.ts
decisions:
  - "computeWorkflowPosition placed in src/lib/ (pure utility, no feature-specific imports)"
  - "getRecipeNamesByUnitIds extended with id field (additive, no consumer breakage)"
  - "useWorkflowPositions fetches recipe map internally (self-contained hook)"
metrics:
  duration: 524s
  completed: 2026-05-12
  tasks: 2/2
  files_created: 3
  files_modified: 1
  test_cases: 12
---

# Phase 60 Plan 01: Workflow Position Derivation Summary

Pure function + batch hook for deriving workflow position from last painting session's step/section data, covering sectioned/flat/section-only/complete/orphaned scenarios with 12 unit tests.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | computeWorkflowPosition pure function (TDD) | bed234d (RED), cc6ba87 (GREEN) | src/lib/computeWorkflowPosition.ts, tests/lib/computeWorkflowPosition.test.ts |
| 2 | useWorkflowPositions hook + recipe query extension | 55417a1 | src/hooks/useWorkflowPositions.ts, src/db/queries/recipes.ts |

## TDD Gate Compliance

- RED gate: test(60-01) commit bed234d -- 12 failing tests (module not found)
- GREEN gate: feat(60-01) commit cc6ba87 -- all 12 tests pass
- REFACTOR gate: skipped (code clean on first pass, no refactoring needed)

## What Was Built

### computeWorkflowPosition (src/lib/computeWorkflowPosition.ts)
- Pure function: `(lastSessionStepId, lastSessionSectionName, sections, steps) -> WorkflowPosition | null`
- WorkflowPosition interface: sectionName, sectionIndex, totalSections, stepName, stepIndex, totalSteps, technique, isComplete, nextStepName
- Handles all 5 degradation scenarios (D-15 through D-19)
- Next step logic crosses section boundaries (D-03)
- Orphaned step ID graceful fallback to section_name (Pitfall 5)

### useWorkflowPositions (src/hooks/useWorkflowPositions.ts)
- Batch React Query hook following useKanbanEnrichment pattern exactly
- Sorted ID query key for cache stability (Pitfall 2)
- Promise.all parallel fetch per unit (sessions + sections + steps)
- Returns `Map<number, WorkflowPosition>` for page-level prop drilling
- 5-minute staleTime, enabled guard on empty arrays

### getRecipeNamesByUnitIds (src/db/queries/recipes.ts)
- Extended to return `id` field alongside `unit_id` and `name`
- Additive change, existing consumers unaffected (they destructure only unit_id and name)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused type import in test file**
- **Found during:** Task 2 verification (pnpm build)
- **Issue:** `WorkflowPosition` type was imported but unused in test file, causing TS6133 error
- **Fix:** Removed unused type import
- **Files modified:** tests/lib/computeWorkflowPosition.test.ts
- **Commit:** 55417a1 (bundled with Task 2)

## Verification Results

- `pnpm test -- tests/lib/computeWorkflowPosition.test.ts`: 12/12 tests pass
- `pnpm build`: TypeScript compiles cleanly, Vite build succeeds

## Known Stubs

None -- all functions fully implemented with real logic.

---
phase: 60-kanban-currentfocus-integration
plan: 02
subsystem: kanban-currentfocus-workflow-display
tags: [react-components, prop-drilling, workflow-display, graceful-degradation]
dependency_graph:
  requires: [computeWorkflowPosition, useWorkflowPositions, WorkflowPosition]
  provides: [KanbanCard-workflow-display, CurrentFocusCard-workflow-guidance]
  affects: [KanbanBoard, KanbanColumn, DashboardPage]
tech_stack:
  added: []
  patterns: [conditional-rendering, prop-extension, batch-map-passthrough]
key_files:
  created: []
  modified:
    - src/features/painting-projects/KanbanCard.tsx
    - src/features/painting-projects/KanbanColumn.tsx
    - src/features/painting-projects/KanbanBoard.tsx
    - src/features/dashboard/CurrentFocusCard.tsx
    - src/features/dashboard/DashboardPage.tsx
    - tests/painting/KanbanCard.test.tsx
    - tests/dashboard/CurrentFocusCard.test.tsx
decisions:
  - "KanbanCard workflow line replaces (not appends to) status hint -- mutually exclusive rendering"
  - "CurrentFocusCard workflow line inserted between recipe name and model count rows"
  - "Layers icon at 12px prefixes CurrentFocusCard workflow line matching Palette icon pattern"
  - "tabular-nums class applied to step count span for alignment stability"
metrics:
  duration: 604s
  completed: 2026-05-12
  tasks: 2/2
  files_created: 0
  files_modified: 7
  test_cases: 10
---

# Phase 60 Plan 02: Kanban & CurrentFocus Workflow Display Summary

Wired workflow position data into KanbanCard and CurrentFocusCard with section-aware rendering, graceful degradation across 5 scenarios, and 10 new component tests.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Wire workflow positions into Kanban prop chain | 4a375dd | KanbanBoard.tsx, KanbanColumn.tsx, KanbanCard.tsx, KanbanCard.test.tsx |
| 2 | Wire workflow position into CurrentFocusCard and DashboardPage | 6484946 | CurrentFocusCard.tsx, DashboardPage.tsx, CurrentFocusCard.test.tsx |

## What Was Built

### KanbanCard Workflow Display
- KanbanBoard calls `useWorkflowPositions(activeUnitIds)` and passes `Map<number, WorkflowPosition>` to KanbanColumn
- KanbanColumn passes individual `workflowPosition` per card via `Map.get(u.id)`
- KanbanCard renders workflow-aware hint with arrow prefix matching existing style:
  - Full section+step: "SectionName: NextStepName"
  - Section only: "SectionName"
  - Flat recipe: "step N/M"
  - Complete: "Complete"
  - No position: falls back to existing `getNextActionHint(status)` (D-15)

### CurrentFocusCard Workflow Guidance
- DashboardPage calls `useWorkflowPositions([focusUnitId])` and passes to CurrentFocusCard
- CurrentFocusCard renders workflow guidance with Layers icon prefix:
  - Full: "SectionName: Technique -- step N/M"
  - No technique: "SectionName -- step N/M"
  - Section only: "SectionName"
  - Flat: "Step N/M"
  - Complete: "Recipe complete"
  - No position: line not rendered (existing behavior preserved)

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `pnpm test -- tests/painting/KanbanCard.test.tsx`: 7/7 tests pass (3 existing + 4 new)
- `pnpm test -- tests/dashboard/CurrentFocusCard.test.tsx`: 22/22 tests pass (16 existing + 6 new)
- `pnpm build`: TypeScript compiles cleanly, Vite build succeeds

## Known Stubs

None -- all rendering paths fully implemented with real data flow.

## Self-Check: PASSED

- [x] src/features/painting-projects/KanbanCard.tsx contains workflowPosition
- [x] src/features/painting-projects/KanbanColumn.tsx contains workflowPositions
- [x] src/features/painting-projects/KanbanBoard.tsx contains useWorkflowPositions
- [x] src/features/dashboard/CurrentFocusCard.tsx contains workflowPosition
- [x] src/features/dashboard/DashboardPage.tsx contains useWorkflowPositions
- [x] Commit 4a375dd exists
- [x] Commit 6484946 exists

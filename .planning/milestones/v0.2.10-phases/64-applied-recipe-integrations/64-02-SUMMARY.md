---
phase: 64-applied-recipe-integrations
plan: "02"
subsystem: painting-projects
tags: [kanban, applied-recipes, enrichment, progress-display]
dependency_graph:
  requires: [64-01]
  provides: [applied-recipe-progress-on-kanban]
  affects: [KanbanCard, KanbanColumn, useKanbanEnrichment]
tech_stack:
  added: []
  patterns: [batch-enrichment-extension, prop-pass-through]
key_files:
  created: []
  modified:
    - src/types/recipeAssignment.ts
    - src/hooks/useKanbanEnrichment.ts
    - src/features/painting-projects/KanbanCard.tsx
    - src/features/painting-projects/KanbanColumn.tsx
decisions:
  - "Primary assignment selected as last item (most recently created) from ASC-sorted list"
  - "Recipe name fetched via getRecipeById rather than from recipeRows to use assigned recipe name"
  - "Applied progress display is non-italic (concrete data) vs italic workflowPosition (hint)"
metrics:
  duration: 127s
  completed: "2026-05-13"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 64 Plan 02: Applied Recipe Progress on Kanban Cards Summary

Batch-fetched applied recipe assignment progress in useKanbanEnrichment and rendered completion fractions on Kanban cards, superseding workflowPosition hints when assignment data exists.

## What Was Done

### Task 1: AppliedRecipeProgress type + useKanbanEnrichment extension
- Added `AppliedRecipeProgress` interface to `src/types/recipeAssignment.ts` with recipeName, completed, total, assignmentCount fields
- Extended `KanbanEnrichment` interface to include `appliedProgress: Map<number, AppliedRecipeProgress>`
- Added batch fetch loop in queryFn: for each unit, fetches assignments via `getAssignmentsByUnit`, picks the most recently created, then parallel-fetches recipe steps, step progress, and recipe name
- Uses `computeAssignmentProgress` to derive completed/total counts
- **Commit:** `35564ab`

### Task 2: KanbanCard display + KanbanColumn pass-through
- Added `appliedProgress` prop to `KanbanCardProps`
- Replaced workflowPosition block with three-way conditional: appliedProgress (concrete) > workflowPosition (hint) > getNextActionHint (fallback)
- Applied progress line shows `{recipeName}: {completed}/{total} steps` with `(+N more)` suffix for multiple assignments
- KanbanColumn passes `enrichment?.appliedProgress?.get(u.id)` to each KanbanCard
- **Commit:** `cbdfb4e`

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Verification

- `pnpm build` passes with zero TypeScript errors after both tasks.

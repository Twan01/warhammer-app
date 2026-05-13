---
phase: "64"
plan: "01"
subsystem: dashboard
tags: [applied-recipes, bridge, session-logging]
dependency_graph:
  requires: [useRecipeAssignments, LogSessionSheet]
  provides: [AR-05-bridge]
  affects: [recipe-assignments, kanban-enrichment]
tech_stack:
  patterns: [bridge-pattern, find-or-create, partial-failure-toast]
key_files:
  modified:
    - src/features/dashboard/LogSessionSheet.tsx
decisions:
  - "Use step.order_index for toggleStepProgress (not step id) per Pitfall 2"
  - "Invalidate both assignments and kanban-enrichment caches after bridge"
metrics:
  duration: "3 minutes"
  completed: "2026-05-13"
---

# Phase 64 Plan 01: AR-05 Bridge in LogSessionSheet Summary

Added bridge logic so logging a painting session with a recipe step auto-marks that step as completed in the applied recipe assignment, using find-or-create pattern for assignments.

## Changes

### LogSessionSheet.tsx

1. **New imports**: Added `useAssignmentsByUnit`, `useCreateAssignment`, `useToggleStepProgress`, `ASSIGNMENTS_KEY` from `useRecipeAssignments`, plus `useQueryClient` from TanStack React Query.

2. **New hooks**: Added `watchedUnitId` form watcher, `useAssignmentsByUnit` query (enabled when unit_id > 0), `useCreateAssignment` and `useToggleStepProgress` mutations, and `useQueryClient` for cache invalidation.

3. **Bridge block in onSubmit**: After `createSession.mutateAsync` succeeds and before the status-update block, a new block runs when both `recipe_id` and `recipe_step_id` are set:
   - Finds the step object to get `order_index`
   - Looks up existing assignment for the unit+recipe pair
   - If none exists, creates one via `createAssignment.mutateAsync`
   - Marks the step completed via `toggleStepProgress.mutateAsync` using `step.order_index`
   - Invalidates `ASSIGNMENTS_KEY` and `kanban-enrichment` caches
   - On failure: shows warning toast and closes sheet (session already logged successfully)

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `pnpm build`: PASSED (tsc + vite build, no errors)

## Self-Check: PASSED

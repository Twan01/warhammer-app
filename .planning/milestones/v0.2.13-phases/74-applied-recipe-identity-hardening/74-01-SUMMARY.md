---
phase: 74-applied-recipe-identity-hardening
plan: 01
title: "Step Progress Identity Migration & Data Layer"
subsystem: applied-recipes
tags: [migration, data-layer, identity-key, step-progress]
dependency_graph:
  requires: []
  provides: [migration-028, recipe-step-id-progress, updated-query-layer]
  affects: [hooks, ui-components, tests]
tech_stack:
  added: []
  patterns: [table-rebuild-migration, CTE-ROW_NUMBER-dedup]
key_files:
  created:
    - src-tauri/migrations/028_step_progress_identity.sql
  modified:
    - src-tauri/src/lib.rs
    - src/types/recipeAssignment.ts
    - src/db/queries/recipeAssignments.ts
    - src/lib/computeAssignmentProgress.ts
    - src/hooks/useRecipeAssignments.ts
    - src/features/recipes/AssignmentChecklist.tsx
    - src/features/dashboard/LogSessionSheet.tsx
    - tests/lib/computeAssignmentProgress.test.ts
    - tests/applied-recipes/assignmentChecklist.test.tsx
    - tests/painting/recipeAssignments.test.ts
    - tests/foundation/migration027.test.ts
    - tests/data-layer/db-helpers.ts
decisions:
  - Migration back-fill uses CTE with ROW_NUMBER to deduplicate per-section order_index collisions
  - getStepProgress uses direct ORDER BY recipe_step_id (UI builds lookup by key, row order irrelevant)
metrics:
  duration: "15m"
  completed: "2026-05-14"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 13
---

# Phase 74 Plan 01: Step Progress Identity Migration & Data Layer Summary

Migration 028 rebuilds unit_recipe_step_progress with recipe_step_id FK replacing order_index, with CTE-based back-fill that deduplicates per-section order_index collisions via ROW_NUMBER

## Task Completion

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Migration 028 and lib.rs registration | fc546a6 | Created 028_step_progress_identity.sql with table rebuild + back-fill CTE; registered migration 28 in lib.rs |
| 2 | Update type, query, and pure function layers | 65fb062 | StepProgress uses recipe_step_id; upsertStepProgress/getStepProgress updated; computeAssignmentProgress matches by step.id |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated consumer chain to unblock TypeScript build**
- **Found during:** Task 2
- **Issue:** Changing StepProgress type and upsertStepProgress signature caused TS errors in useRecipeAssignments hook, AssignmentChecklist, and LogSessionSheet (these files are scoped to plan 02 wave 2, but the build fails without updating them)
- **Fix:** Updated useToggleStepProgress mutation params (orderIndex -> recipeStepId), AssignmentChecklist completedSet/handleToggle/keys (order_index -> recipe_step_id/step.id), LogSessionSheet auto-mark call (orderIndex -> recipeStepId)
- **Files modified:** src/hooks/useRecipeAssignments.ts, src/features/recipes/AssignmentChecklist.tsx, src/features/dashboard/LogSessionSheet.tsx
- **Commit:** 65fb062

**2. [Rule 3 - Blocking] Updated test fixtures and assertions for new field names**
- **Found during:** Task 2 build verification
- **Issue:** Test files referenced order_index on StepProgress and orderIndex on mutation params, causing tsc to fail
- **Fix:** Updated test fixture types (TestStep uses id, TestProgress uses recipe_step_id), assertion values, mock data in assignmentChecklist and recipeAssignments tests
- **Files modified:** tests/lib/computeAssignmentProgress.test.ts, tests/applied-recipes/assignmentChecklist.test.tsx, tests/painting/recipeAssignments.test.ts
- **Commit:** 65fb062

**3. [Rule 3 - Blocking] Updated migration parity test infrastructure**
- **Found during:** Task 2 full test suite run
- **Issue:** tests/data-layer/db-helpers.ts HOBBYFORGE_MIGRATIONS array was missing migrations 026, 027, and 028; tests/foundation/migration027.test.ts asserted max version was 27
- **Fix:** Added missing migrations to array, updated max version assertion to 28
- **Files modified:** tests/data-layer/db-helpers.ts, tests/foundation/migration027.test.ts
- **Commit:** 65fb062

## Verification

- pnpm build: PASSED (TypeScript + Vite)
- pnpm test: PASSED (179 files, 1586 tests, 0 failures)
- No references to order_index remain in StepProgress type, query functions, or computeAssignmentProgress

## Impact on Plan 02

Plan 02 (wave 2, depends on 74-01) was scoped to update hooks, AssignmentChecklist, LogSessionSheet, and tests. These changes were pulled into plan 01 as Rule 3 deviations to unblock the TypeScript build. Plan 02 may need adjustment -- its primary remaining value is any additional test coverage or verification steps not covered here.

## Known Stubs

None.

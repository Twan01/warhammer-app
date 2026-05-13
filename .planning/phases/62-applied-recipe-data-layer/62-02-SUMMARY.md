---
phase: 62-applied-recipe-data-layer
plan: 02
subsystem: data-layer
tags: [react-query, hooks, crud, sqlite, tests]

# Dependency graph
requires:
  - "62-01: Migration 021 tables + TypeScript types"
provides:
  - "8 CRUD query functions for unit_recipe_assignments and unit_recipe_step_progress"
  - "7 React Query hooks with 4 cache key exports"
  - "D-13 symmetric cache invalidation contract"
affects:
  - "Phase 63 UI components will consume these hooks directly"

# Tech stack
added: []
patterns:
  - "ON CONFLICT DO UPDATE SET for upsert (not INSERT OR REPLACE)"
  - "INSERT OR IGNORE for bulk dedup"
  - "Broad prefix invalidation for bulk mutations (Pitfall 5)"

# Key files
created:
  - src/db/queries/recipeAssignments.ts
  - src/hooks/useRecipeAssignments.ts
  - tests/painting/recipeAssignments.test.ts
modified: []

# Decisions
decisions:
  - "D-13 symmetry: useCreateAssignment and useDeleteAssignment invalidate exactly UNIT_ASSIGNMENTS_KEY + RECIPE_ASSIGNMENTS_KEY"
  - "useBulkCreateAssignments invalidates broad ASSIGNMENTS_KEY prefix to cover all per-unit views"

# Metrics
duration: ~5min
completed: 2026-05-13
tasks_completed: 2
tasks_total: 2
---

# Phase 62 Plan 02: Query & Hook Data Layer Summary

Query module with 8 parameterized CRUD functions, hook module with 7 React Query hooks and 4 cache key exports, plus 32 tests covering SQL assertions and cache invalidation contracts including D-13 symmetry verification.

## What Was Built

### Task 1: Query Module (src/db/queries/recipeAssignments.ts)

8 exported async functions following the canonical recipeSections.ts pattern:

| Function | Type | Key SQL Pattern |
|----------|------|-----------------|
| getAssignmentsByUnit | SELECT | WHERE unit_id = $1 ORDER BY created_at ASC |
| getAssignmentsByRecipe | SELECT | WHERE recipe_id = $1 ORDER BY created_at ASC |
| getAssignment | SELECT | WHERE id = $1, returns first row or null |
| createAssignment | INSERT | (unit_id, recipe_id) VALUES ($1, $2), returns lastInsertId |
| deleteAssignment | DELETE | WHERE id = $1 |
| getStepProgress | SELECT | WHERE assignment_id = $1 ORDER BY order_index ASC |
| upsertStepProgress | UPSERT | ON CONFLICT(assignment_id, order_index) DO UPDATE SET |
| bulkCreateAssignments | BULK INSERT | INSERT OR IGNORE per unitId in loop |

### Task 2: Hook Module + Tests

**src/hooks/useRecipeAssignments.ts** - 4 cache keys + 7 hooks:

Cache keys: ASSIGNMENTS_KEY, UNIT_ASSIGNMENTS_KEY(unitId), RECIPE_ASSIGNMENTS_KEY(recipeId), STEP_PROGRESS_KEY(assignmentId)

| Hook | Type | Invalidates |
|------|------|-------------|
| useAssignmentsByUnit | query | - |
| useAssignmentsByRecipe | query | - |
| useStepProgress | query | - |
| useCreateAssignment | mutation | UNIT_ASSIGNMENTS_KEY + RECIPE_ASSIGNMENTS_KEY |
| useDeleteAssignment | mutation | UNIT_ASSIGNMENTS_KEY + RECIPE_ASSIGNMENTS_KEY (D-13 symmetric) |
| useToggleStepProgress | mutation | STEP_PROGRESS_KEY |
| useBulkCreateAssignments | mutation | ASSIGNMENTS_KEY (broad) + RECIPE_ASSIGNMENTS_KEY |

**tests/painting/recipeAssignments.test.ts** - 32 tests across 12 describe blocks:
- Groups 1-8: SQL assertion tests for all 8 query functions
- Groups 9-12: Hook invalidation contract tests for all 4 mutation hooks
- D-13 symmetry test: verifies create and delete produce identical invalidation keys

## Verification Results

- `pnpm build`: PASSED
- `pnpm test -- tests/painting/recipeAssignments.test.ts`: 32/32 PASSED
- `pnpm test` (full suite): 1356 passed, 5 failed (all pre-existing in datasheetQueries + SyncStatusCard)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

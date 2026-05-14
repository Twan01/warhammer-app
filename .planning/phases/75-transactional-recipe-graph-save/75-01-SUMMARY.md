---
phase: 75-transactional-recipe-graph-save
plan: "01"
subsystem: db/queries
tags: [transaction, recipe, sql, testing]
dependency_graph:
  requires: [src/features/recipes/recipeDiff.ts, src/features/recipes/recipeSteps.ts, src/features/recipes/recipeSchema.ts, src/features/recipes/recipeSection.ts, src/db/client.ts]
  provides: [saveRecipeGraph]
  affects: [src/db/queries/recipes.ts]
tech_stack:
  added: []
  patterns: [BEGIN/COMMIT/ROLLBACK transaction, five-phase diff execution, sectionIdMap extension pattern]
key_files:
  created:
    - tests/painting/saveRecipeGraph.test.ts
  modified:
    - src/db/queries/recipes.ts
decisions:
  - "Iterate sections array (not flat diff arrays) for step UPDATE/INSERT loops to get correct per-section order_index"
  - "Use inline SQL for all operations — no helper delegation to avoid nested transaction risk"
  - "buildSectionIdMap seeds from survivors; sectionIdMap.set() extended after each new-section INSERT"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-14"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 2
---

# Phase 75 Plan 01: Transactional Recipe Graph Save Summary

**One-liner:** `saveRecipeGraph()` wraps the full five-phase diff (recipe + sections + steps) in a single BEGIN/COMMIT block with inline SQL and 17 unit tests.

## Tasks Completed

| Task | Commit | Files |
|------|--------|-------|
| 1: Create saveRecipeGraph() with transaction wrapper | 52df5f3 | src/db/queries/recipes.ts, tests/painting/saveRecipeGraph.test.ts |

## What Was Built

Added `saveRecipeGraph()` to `src/db/queries/recipes.ts`. The function:

- Accepts `recipeId: number | null` to distinguish create vs edit paths
- Issues `BEGIN TRANSACTION` as the first DB operation
- **Create path:** INSERT recipe row, INSERT all sections (building sectionIdMap), INSERT all steps per section with `computeOrderIndex`
- **Edit path:** UPDATE recipe row, five-phase diff (DELETE removed sections → UPDATE existing sections → INSERT new sections extending sectionIdMap → DELETE removed steps → UPDATE/INSERT remaining steps per section)
- Calls `COMMIT` on success, `ROLLBACK` in catch, re-throws the error
- Uses only inline $1/$2 parameterized SQL — no helper function calls inside the transaction

## Test Coverage (17 tests, all passing)

- Create path: BEGIN issued first, recipe INSERT params, returns new id, section inserts with correct recipe_id, step inserts with sectionIdMap-resolved section_id, per-section order_index resets, COMMIT last
- Edit path: BEGIN first, UPDATE recipe with recipeId, returns existing id, deletes removed sections, updates existing sections, inserts new sections, deletes removed steps, updates existing steps, inserts new steps, sectionIdMap extension for steps in new sections, COMMIT last
- Rollback: ROLLBACK called and COMMIT not called on any execute rejection; error re-thrown; rollback on edit path error

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All SQL uses $1/$2 positional parameters (T-75-01 mitigated).

## Self-Check: PASSED

- src/db/queries/recipes.ts modified: confirmed
- tests/painting/saveRecipeGraph.test.ts created: confirmed
- Commit 52df5f3: confirmed
- pnpm test: 17/17 saveRecipeGraph tests pass
- pnpm build: exits 0 (no TypeScript errors)

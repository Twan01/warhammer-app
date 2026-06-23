---
phase: 146-detach-safety-rails
plan: "01"
subsystem: data-layer
tags: [detach, technique-library, tdd, fnd-03, safe-02, safe-03]
dependency_graph:
  requires: [recipeTechniqueInstances, recipeTechniqueResync, effectivePaintId]
  provides: [recipeTechniqueDetach, detachTechniqueInstance, detachAllAndDeleteTechnique, getNonDetachedInstanceCount]
  affects: [recipe_steps, recipe_sections, recipe_technique_instances, recipe_technique_slot_maps]
tech_stack:
  added: []
  patterns: [guard-first TDD, single-db-handle contract, bake-before-delete ordering]
key_files:
  created:
    - tests/data-layer/detach-technique.test.ts
    - src/db/queries/recipeTechniqueDetach.ts
  modified:
    - tests/data-layer/detach-technique.test.ts  # fixture bug fix (assignment_id FK)
decisions:
  - "Re-export getNonDetachedInstanceCount from recipeTechniqueResync — no SQL duplication, detach trio cohesive in one module"
  - "Test fixture uses unit_recipe_assignments(assignment_id) not unit_id to match migration 028 schema"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_created: 2
---

# Phase 146 Plan 01: Detach Data-Layer Engine Summary

Guard-first TDD detach engine — `detachTechniqueInstance(db, instanceId)` bakes slot-resolved colours into `recipe_steps.paint_id` before CASCADE-deleting slot maps, NULLs FK link columns, and deletes the instance row; `detachAllAndDeleteTechnique(techniqueId)` iterates non-detached instances on a single db handle then deletes the technique, preserving all recipe content (SC#3 / FND-03).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write guard-first detach data-layer test (RED) | 2f378ac3 | tests/data-layer/detach-technique.test.ts |
| 2 | Implement recipeTechniqueDetach.ts (GREEN) | 71b6a603 | src/db/queries/recipeTechniqueDetach.ts, tests/data-layer/detach-technique.test.ts |

## Verification Results

- `pnpm test -- tests/data-layer/detach-technique.test.ts`: 11/11 GREEN
- `pnpm test` full suite: 3067 passed, 6 skipped, 38 todo — no regressions
- `pnpm build`: TypeScript clean, Vite build clean

### Acceptance Criteria Checks

- `UPDATE recipe_steps SET paint_id` at line 94, `DELETE FROM recipe_technique_instances` at line 125 — bake-before-delete ordering confirmed (T-146-01 mitigated)
- No `BEGIN`/`COMMIT` in source
- No `getDb()` inside `detachTechniqueInstance` (only in `detachAllAndDeleteTechnique`)
- No `DELETE FROM recipe_steps` or `DELETE FROM recipe_sections` anywhere — step-id stability confirmed (T-146-02 mitigated)
- `detachAllAndDeleteTechnique` calls `getDb()` exactly once and passes same handle to each `detachTechniqueInstance(db, ...)` call (T-146-03 mitigated)
- `getNonDetachedInstanceCount` exported from `recipeTechniqueDetach.ts` via re-export

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wrong FK column in progress fixture**
- **Found during:** Task 2 first test run
- **Issue:** Test inserted `unit_recipe_step_progress` with `unit_id` column, but migration 028 rebuilt the table to use `assignment_id` (FK to `unit_recipe_assignments`) — `unit_id` column does not exist.
- **Fix:** Changed fixture to first insert `unit_recipe_assignments(unit_id, recipe_id)` then `unit_recipe_step_progress(assignment_id, recipe_step_id, completed)`, matching the actual schema.
- **Files modified:** `tests/data-layer/detach-technique.test.ts`
- **Commit:** 71b6a603 (included in Task 2 commit)

**2. [Rule 1 - Bug] Removed unused `techniqueStepId` module-scoped var**
- **Found during:** `pnpm build` TypeScript check after Task 2
- **Issue:** `noUnusedLocals` enforced; `techniqueStepId` was declared as module-scoped but not used in any test assertion (the step id is derived from `applyTechnique` materialisation, not from the technique_step row).
- **Fix:** Removed module-scoped `techniqueStepId` variable and switched the two `INSERT INTO technique_steps` calls to inline (no variable capture needed).
- **Files modified:** `tests/data-layer/detach-technique.test.ts`
- **Commit:** 71b6a603 (included in Task 2 commit)

## Known Stubs

None. The data-layer engine is fully implemented with no placeholder logic.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All writes are to existing local SQLite tables. T-146-01 through T-146-03 mitigated as designed.

## Self-Check: PASSED

- `tests/data-layer/detach-technique.test.ts` exists: FOUND
- `src/db/queries/recipeTechniqueDetach.ts` exists: FOUND
- Commit 2f378ac3 (RED test): FOUND
- Commit 71b6a603 (GREEN implementation): FOUND

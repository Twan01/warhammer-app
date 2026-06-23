---
phase: 141-schema-foundation-progress-identity-lock
plan: "03"
subsystem: data-layer
tags: [tdd, data-layer, fnd-03, progress-identity, technique-library]
dependency_graph:
  requires:
    - 141-01  # migration 051 must exist for createHobbyforgeDb() to pick it up
  provides:
    - FND-03 invariant locked via data-layer test
    - Better-sqlite3 harness proof of technique step identity (reorder/add/remove/remove-slot)
    - Teeth-proving counter-case showing DELETE+INSERT breaks the invariant
  affects: []
tech_stack:
  added: []
  patterns:
    - single-db-handle flat inline SQL (FND-05)
    - better-sqlite3 in-memory migration chain test
key_files:
  created:
    - tests/data-layer/technique-progress-identity.test.ts
  modified: []
decisions:
  - "D-09: FND-03 invariant tested directly via better-sqlite3 SQL — no production resyncTechniqueInstance needed (deferred Phase 144)"
  - "D-10: single db handle, flat inline SQL throughout test file — no BEGIN, no nested transactions"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-21"
  tasks: 2
  files: 1
---

# Phase 141 Plan 03: FND-03 Technique Progress Identity Lock Summary

**One-liner:** Data-layer test locking the progress-identity invariant — four SQL cases (reorder/add/remove-step/remove-slot) + DELETE+INSERT counter-case prove technique step edits never silently move or orphan a step-completion marker.

## What Was Built

### Task 1: Technique materialisation fixture (smoke test)
Created `tests/data-layer/technique-progress-identity.test.ts` (`// @vitest-environment node`) with a `beforeEach` fixture building a complete technique materialisation graph via a single `createHobbyforgeDb()` handle (FND-05):

- Technique + `technique_section` + `technique_colour_slot` + 3 `technique_steps` (S1 order 0, S2 order 1 referencing the slot, S3 order 2)
- `painting_recipes` row + `recipe_technique_instances` row (instanceId)
- `recipe_sections` row with `technique_instance_id = instanceId` + 3 materialised `recipe_steps` rows carrying `technique_step_id = S1/S2/S3` (paint_id NULL)
- `unit_recipe_assignments` row + `unit_recipe_step_progress` row marking S2's `recipe_steps` PK (`s2RecipeStepId`) as `completed = 1`
- Smoke test: asserts S2's progress row exists with `recipe_step_id === s2RecipeStepId` and `completed = 1`

### Task 2: Four invariant cases + teeth-proving counter-case
Five `it()` blocks using the same fixture and single db handle:

1. **REORDER** — `UPDATE recipe_steps SET order_index = ? WHERE technique_step_id = ?` swaps S1 and S3. S2's progress row survives with the SAME `recipe_step_id` PK and `completed = 1`. Order index values confirmed changed.
2. **ADD STEP S4** — Insert new `technique_step` S4, then materialise it as a new `recipe_steps` row. New row exists with NO `unit_recipe_step_progress` entry. S2 progress unchanged.
3. **REMOVE STEP S1** — `DELETE FROM recipe_steps WHERE technique_step_id = ?`. S1's row is gone (any progress would have CASCADE-deleted). S2 progress untouched. Total recipe_steps count drops by 1.
4. **REMOVE SLOT** — Insert a `recipe_technique_slot_maps` row (paint_id NULL = unfilled), then `DELETE FROM technique_colour_slots`. Slot_map rows for that slot drop to 0 via ON DELETE CASCADE. `technique_steps.colour_slot_id` for S2 becomes NULL via ON DELETE SET NULL. No dangling orphans.
5. **COUNTER-CASE (teeth)** — DELETE S2's materialised `recipe_steps` row (CASCADE deletes its progress), then re-INSERT an equivalent row. New row gets a fresh autoincrement PK. Assertions: original progress is GONE (completion LOST), new row has NO progress. This proves the UPDATE-by-PK path (cases 1-4) is non-trivial — the invariant would fail under DELETE+INSERT.

## Test Results

```
pnpm test -- tests/data-layer/technique-progress-identity.test.ts

 ✓ technique progress identity (FND-03) > fixture: S2 progress row exists with completed=1 and the recorded recipe_step_id PK
 ✓ technique progress identity (FND-03) > reorder (S1↔S3 swap): S2 progress row keeps the same recipe_step_id PK and completed=1
 ✓ technique progress identity (FND-03) > add step S4: new recipe_steps row has no progress marker; S2 progress untouched
 ✓ technique progress identity (FND-03) > remove step S1: S1 recipe_step gone via CASCADE; S2 progress untouched; count drops by 1
 ✓ technique progress identity (FND-03) > remove slot: recipe_technique_slot_maps rows gone via CASCADE; technique_steps.colour_slot_id → NULL
 ✓ technique progress identity (FND-03) > counter-case (teeth): DELETE+INSERT MOVES the progress marker — proves assertions are non-trivial

Full suite: 320 test files passed (2916 tests). pnpm check:version OK (51 migrations, no CR bytes).
```

## Deviations from Plan

None — plan executed exactly as written. Both tasks were implemented in a single atomic write of the complete test file (fixture + all assertion cases), then committed as a single commit since the file was never in a "Task 1 only" intermediate state.

## Known Stubs

None. This plan creates only a data-layer test with no stubs.

## Threat Flags

None. This plan adds a single in-memory test file with no network endpoints, auth paths, or schema changes beyond the already-shipped migration 051.

## Self-Check

- [x] `tests/data-layer/technique-progress-identity.test.ts` exists (419 lines, >120 min_lines)
- [x] Commit `97d07a1e` exists: `test(141-03): add FND-03 technique progress identity invariant test`
- [x] `pnpm test -- tests/data-layer/technique-progress-identity.test.ts` exits 0 (6 tests)
- [x] Full suite `pnpm test` exits 0 (2916 tests, 320 files)
- [x] `pnpm check:version` exits 0 (migration count 51, no CR bytes)

## Self-Check: PASSED

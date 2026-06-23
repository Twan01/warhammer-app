---
phase: 143
plan: 01
subsystem: data-layer
tags: [guard, safety, tdd, technique-library, slot-fill]
dependency_graph:
  requires: [141-04, 142]
  provides: [143-02, 143-03, 143-04]
  affects: [saveRecipeGraph, buildDraftSections, recipe editor save flow]
tech_stack:
  added: []
  patterns: [SC#5 guard pattern, createDbBridge param reorder fix, stub module for RED contracts]
key_files:
  created:
    - tests/data-layer/saveRecipeGraph-guard.test.ts
    - tests/data-layer/apply-technique.test.ts
    - tests/data-layer/effectivePaintId.test.ts
    - src/db/queries/recipeTechniqueInstances.ts
  modified:
    - src/db/queries/recipes.ts
    - src/features/recipes/recipeSection.ts
    - tests/data-layer/db-helpers.ts
decisions:
  - "SC#5 guard reads from existingSteps (DB rows) not draft — technique steps absent from draft appear in toDelete; only existingSteps carries their technique_step_id"
  - "UPDATE guard fires on s.technique_step_id (forwarded by buildDraftSections) as first statement inside dbId branch — before any db.execute call"
  - "recipeTechniqueInstances.ts stub created (throws NotImplemented) so TypeScript resolves the Plan 02 contract import and pnpm build stays clean"
  - "createDbBridge convertParams fixed to reorder params by dollar-N index — the $2...$13 SET then $1 WHERE pattern was binding params in SQL-position order (wrong) rather than $N-index order (correct)"
  - "apply-technique.test.ts uses describe (not describe.skip) since TS import resolves via stub; tests are RED due to throw, not compile error"
metrics:
  duration: "~35 minutes"
  completed: "2026-06-22"
  tasks_completed: 2
  files_changed: 7
---

# Phase 143 Plan 01: Safety Foundation — SC#5 Guard Summary

Established the safety invariant of the entire Technique Library milestone before any UI relies on it: the `saveRecipeGraph` skip-guard that prevents the recipe editor from ever DELETEing or UPDATEing a live-linked `recipe_steps` row (one carrying `technique_step_id IS NOT NULL`), proven by three data-layer test files before any apply flow or UI is written.

## What Was Built

**saveRecipeGraph guard (T-143-01 / T-143-02)**
- DELETE pass: `existingSteps.find(s => s.id === id)` lookup + `continue` when `step?.technique_step_id != null` before the DELETE execute. Comment: "SC#5 GUARD: skip live-linked technique step". Reads from `existingSteps` (DB rows) because technique-owned steps are absent from the draft.
- UPDATE branch: `if (s.technique_step_id != null) continue;` as the FIRST statement inside `if (s.dbId !== null)`, before any UPDATE execute. Same SC#5 GUARD comment. Relies on `buildDraftSections` forwarding `technique_step_id` onto DraftStep.

**buildDraftSections forward/filter (T-143-02)**
- Filter: `.filter((st) => st.section_id === s.id && st.technique_step_id == null)` — excludes technique-owned steps from editor draft (Pitfall 2).
- Map: added `technique_step_id: st.technique_step_id ?? null` to the DraftStep object — enables the UPDATE guard to fire correctly.

**Three data-layer test files**
- `effectivePaintId.test.ts`: 6 pure-unit cases (filled/unfilled-null/unfilled-missing/plain-null/plain-undefined/plain-null-paint) — all GREEN immediately (FND-04 already exists).
- `saveRecipeGraph-guard.test.ts`: 3 cases (DELETE-skip, UPDATE-skip, plain-still-deletes) — GREEN after Task 2 guard implementation.
- `apply-technique.test.ts`: 6 RED contract cases for Plan 02 (SLOT-03/SLOT-04 instance independence, slot maps, step materialisation) — correctly RED (throws "not yet implemented").

**recipeTechniqueInstances.ts stub**
- Created minimal stub exporting `applyTechnique` as a `throw new Error(...)` function so `pnpm build` (TypeScript) stays clean while the test contract references a not-yet-existing module.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed createDbBridge convertParams param-reorder bug**
- **Found during:** Task 2 guard implementation (guard tests failed with SQLITE_CONSTRAINT_NOTNULL on recipe_steps.step_name)
- **Issue:** `convertParams` replaced `$N` tokens left-to-right in SQL string order, then spread params in array order. For `UPDATE ... SET x=$2, y=$3 WHERE id=$1`, `params[0]` (the id) was bound to the `$2` position (paint_id slot), and `params[1]` (paint_id=null) was bound to the `$3` position (step_name slot) — triggering the NOT NULL constraint.
- **Fix:** Replaced `convertParams(sql)` with `convertParamsAndReorder(sql, params)` which: (1) extracts `$N` indices in SQL appearance order, (2) builds a reordered params array mapping each SQL-position to `params[N-1]`, (3) replaces `$N` with `?`. This correctly handles any SQL where `$1` appears after higher-numbered params (standard UPDATE pattern).
- **Files modified:** `tests/data-layer/db-helpers.ts`
- **Commit:** d77cf12b

**2. [Rule 2 - Missing critical] Added recipeTechniqueInstances.ts stub module**
- **Found during:** Task 2 / pnpm build verification
- **Issue:** `apply-technique.test.ts` imports `applyTechnique` from `@/db/queries/recipeTechniqueInstances` which didn't exist, causing `tsc` TS2307 error and `pnpm build` failure.
- **Fix:** Created minimal stub with correctly-typed `applyTechnique` signature that throws "not yet implemented". Plan 02 replaces the body with the real implementation.
- **Files modified:** `src/db/queries/recipeTechniqueInstances.ts` (created)
- **Commit:** d77cf12b

## Test Results

| File | Status | Cases |
|------|--------|-------|
| `tests/data-layer/effectivePaintId.test.ts` | GREEN | 6/6 passed |
| `tests/data-layer/saveRecipeGraph-guard.test.ts` | GREEN | 3/3 passed |
| `tests/data-layer/apply-technique.test.ts` | RED (expected) | 0/6 (throws stub error — Plan 02 contract) |
| `tests/painting/saveRecipeGraph.test.ts` | GREEN (unchanged) | All passed |

## Threat Flag Scan

No new network endpoints, auth paths, or trust boundary crossings introduced. All changes are data-layer internal (query guard logic and test helpers).

## Self-Check: PASSED

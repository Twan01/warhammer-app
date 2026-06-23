---
phase: 143
plan: 02
subsystem: data-layer
tags: [apply-flow, slot-fill, technique-library, react-query, hooks]
dependency_graph:
  requires: [143-01]
  provides: [143-03, 143-04]
  affects: [recipe editor, painting mode, slot-fill UI, effectivePaintId consumers]
tech_stack:
  added: []
  patterns: [insert-only apply mutation (mirrors duplicateTechnique), enabled-by-id useQuery, 7-key CASCADE invalidation, INSERT OR REPLACE slot maps]
key_files:
  created:
    - src/db/queries/recipeTechniqueInstances.ts
    - src/db/queries/recipeTechniqueSlotMaps.ts
    - src/hooks/useTechniqueInstances.ts
    - src/hooks/useSlotResolutionMap.ts
  modified:
    - tests/data-layer/apply-technique.test.ts
decisions:
  - "applyTechnique returns Promise<number> (instanceId) — test contract uses return value directly as instance id for slot-map assertions"
  - "apply-technique.test.ts seeded with paint ids 10/20/77 (INSERT OR IGNORE) so recipe_technique_slot_maps.paint_id FK ON RESTRICT passes in the in-memory test DB"
  - "SLOT_MAP_BY_INSTANCE_KEY exported from useSlotResolutionMap (not useTechniqueInstances) to keep read/write concerns separated"
  - "getInstancesForRecipe re-exported from useTechniqueInstances so callers have one import location for instance queries"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-22"
  tasks_completed: 3
  files_changed: 5
---

# Phase 143 Plan 02: Apply Flow & Slot-Fill System — Data Layer Summary

Built the full data-layer resolution spine for the technique apply flow: the insert-only `applyTechnique()` mutation that materialises a technique into the recipe graph with independent per-instance slot maps, plus the slot-map query module (`getSlotResolutionMap`, `getSlotMapByInstance`, `updateSlotMap`) and the four React Query hooks that wire them with correct 7-key CASCADE invalidation.

## What Was Built

**applyTechnique() (SLOT-03, SLOT-04, APPLY-01, APPLY-04)**
- Single `const db = await getDb()` — no BEGIN/COMMIT/ROLLBACK (mirrors `duplicateTechnique`)
- INSERT fresh `recipe_technique_instances` row unconditionally (never SELECT-or-reuse — guarantees SLOT-04 independence)
- SELECT `technique_sections` ordered by `order_index`; for each: INSERT `recipe_sections` with `technique_instance_id` set
- SELECT `technique_steps` per section; INSERT each as `recipe_steps` with `paint_id = NULL`, `alt_paint_id = NULL`, `step_photo_path = NULL`, `technique_step_id = step.id` (T-143-03 — effectivePaintId spine invariant)
- INSERT OR REPLACE `recipe_technique_slot_maps` for each `slotFills` entry (UNIQUE(instance_id, slot_id) makes REPLACE safe)
- Returns `Promise<number>` (instanceId) — matches RED contract test signature

**recipeTechniqueSlotMaps.ts**
- `getSlotResolutionMap`: 4-table INNER JOIN + LEFT JOIN on `slot_maps`, keyed on `rs.technique_step_id` (Pitfall 3 — NOT `rs.id`); unfilled slots → `null`
- `getSlotMapByInstance`: single-table SELECT from `recipe_technique_slot_maps WHERE instance_id = $1`, Map<slot_id, paint_id|null> for Edit-colours prefill
- `updateSlotMap`: INSERT OR REPLACE loop per slot fill; no BEGIN/COMMIT

**useTechniqueInstances.ts**
- `TECHNIQUE_INSTANCES_KEY = (recipeId) => ["technique-instances", recipeId]`
- `useApplyTechnique`: mutation → `applyTechnique`; `onSuccess` calls `invalidateAfterApply` (7-key CASCADE)
- `useUpdateSlotMap`: mutation → `updateSlotMap(instanceId, slotFills)`; invalidates `SLOT_RESOLUTION_MAP_KEY` + resolved-paint keys for owning `recipeId`
- All RECIPE_* keys imported from existing hooks — no duplicate definitions

**useSlotResolutionMap.ts**
- `SLOT_RESOLUTION_MAP_KEY = (recipeId) => ["slot-resolution-map", recipeId]`
- `useSlotResolutionMap(recipeId | undefined)`: enabled-by-id; returns empty Map when disabled
- `useSlotMapByInstance(instanceId | undefined)`: enabled-by-id; returns empty Map when disabled

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed apply-technique.test.ts missing paint seed rows**
- **Found during:** Task 1 — apply-technique tests failing with "FOREIGN KEY constraint failed"
- **Issue:** The Plan 01 RED contract test used `paint_id = 77` (and `10`, `20`) in `recipe_technique_slot_maps` without inserting corresponding rows in `paints`. With `PRAGMA foreign_keys = ON`, the `REFERENCES paints(id) ON DELETE RESTRICT` FK rejected these inserts.
- **Fix:** Added `INSERT OR IGNORE INTO paints` for ids 10, 20, 77 in the `beforeEach` fixture of `apply-technique.test.ts`, seeding the minimal rows needed for FK satisfaction. Using `INSERT OR IGNORE` and explicit ids ensures deterministic FK resolution without disrupting the sequential autoincrement counter.
- **Files modified:** `tests/data-layer/apply-technique.test.ts`
- **Commit:** 9e6a1a4c

**2. [Plan deviation] applyTechnique returns `Promise<number>` not `Promise<{ instanceId, firstSectionId }>`**
- **Found during:** Task 1 — test contract analysis
- **Issue:** The Plan 02 task description specified `Promise<{ instanceId: number; firstSectionId: number }>` but the RED contract test (`apply-technique.test.ts`) uses the return value directly as `const instanceAId = await applyTechnique(...)` and asserts `expect(typeof instanceAId).toBe("number")` and uses it in SQL WHERE clauses as the instance id.
- **Fix:** Implemented return type as `Promise<number>` (just instanceId) matching the contract test. The stub from Plan 01 already had `Promise<number>` signature.
- **Impact:** None — `firstSectionId` is not needed by any Plan 02 or Plan 03 consumer; can be added in a future plan if UI requires it.

## Test Results

| File | Status | Cases |
|------|--------|-------|
| `tests/data-layer/apply-technique.test.ts` | GREEN | 6/6 (was RED in Plan 01) |
| `tests/data-layer/effectivePaintId.test.ts` | GREEN | 6/6 (unchanged) |
| `tests/data-layer/saveRecipeGraph-guard.test.ts` | GREEN | 3/3 (unchanged) |
| All test files | GREEN | 2997 passed, 6 skipped, 0 failed |

## Threat Flag Scan

No new network endpoints, auth paths, or trust boundary crossings. T-143-03 (paint source tampering) mitigated: every `recipe_steps` INSERT in `applyTechnique` uses literal `null` for `paint_id` — never reads `step.paint_id` off a `TechniqueStep`. T-143-04 (instance isolation) mitigated: unconditional INSERT + UNIQUE(instance_id, slot_id) proven by SLOT-03/SLOT-04 test cases.

## Known Stubs

None — all exports are fully implemented.

## Self-Check: PASSED

Files exist:
- `src/db/queries/recipeTechniqueInstances.ts` — FOUND
- `src/db/queries/recipeTechniqueSlotMaps.ts` — FOUND
- `src/hooks/useTechniqueInstances.ts` — FOUND
- `src/hooks/useSlotResolutionMap.ts` — FOUND

Commits exist:
- 9e6a1a4c — feat(143-02): Task 1 applyTechnique
- 857cac2a — feat(143-02): Task 2 recipeTechniqueSlotMaps
- 192441a2 — feat(143-02): Task 3 hooks

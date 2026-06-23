---
phase: 145-integration-pass
plan: "01"
subsystem: data-layer
tags: [technique-library, slot-maps, queries, hooks, tests, wave-0]
dependency_graph:
  requires: [144-live-link-re-sync]
  provides: [getUnfilledSlotCount, getStepSlotIdMap, useUnfilledSlotCount, useStepSlotIdMap, UNFILLED_SLOT_COUNT_KEY, STEP_SLOT_ID_MAP_KEY, INTG-02-test, INTG-05-test, INTG-06-test]
  affects: [src/db/queries/recipeTechniqueSlotMaps.ts, src/hooks/useSlotResolutionMap.ts, src/hooks/useTechniqueInstances.ts]
tech_stack:
  added: []
  patterns: [enabled-by-id hook, LEFT JOIN unfilled-slot count, flat inline SQL, React Query key factories]
key_files:
  created:
    - tests/data-layer/recipe-duplication-live-link.test.ts
    - tests/data-layer/unfilled-slot-count.test.ts
    - tests/data-layer/availability-effective-paint.test.ts
  modified:
    - src/db/queries/recipeTechniqueSlotMaps.ts
    - src/hooks/useSlotResolutionMap.ts
    - src/hooks/useTechniqueInstances.ts
decisions:
  - LEFT JOIN (not INNER JOIN) on recipe_technique_slot_maps in getUnfilledSlotCount — missing rows = unfilled, an INNER JOIN would silently undercount
  - getStepSlotIdMap is a separate query (not merged into getSlotResolutionMap) to preserve existing consumers of useSlotResolutionMap unchanged
  - UNFILLED_SLOT_COUNT_KEY added to useUpdateSlotMap invalidation so readiness banner refreshes after inline slot reassignment
metrics:
  duration: "11 minutes"
  completed: "2026-06-22T18:48:00Z"
  tasks_completed: 3
  files_changed: 6
---

# Phase 145 Plan 01: Data-Layer Foundation Summary

**One-liner:** Two new SQL queries (`getUnfilledSlotCount` via LEFT JOIN + detached filter, `getStepSlotIdMap` reusing the slot-resolution JOIN chain) with enabled-by-id hooks, `UNFILLED_SLOT_COUNT_KEY` invalidation wiring, and three green data-layer tests encoding the honesty invariant (no silent undercounting for INTG-02/05/06).

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | getUnfilledSlotCount + getStepSlotIdMap queries | eb6126c3 | src/db/queries/recipeTechniqueSlotMaps.ts |
| 2 | useUnfilledSlotCount + useStepSlotIdMap hooks + invalidation | 54619aa8 | src/hooks/useSlotResolutionMap.ts, src/hooks/useTechniqueInstances.ts |
| 3 | Three data-layer tests — INTG-02/05/06 | d9bf5068 | tests/data-layer/*.test.ts (3 new files) |

## What Was Built

### getUnfilledSlotCount(recipeId)
Counts unfilled colour slots across all non-detached technique instances for a recipe. Uses `JOIN technique_colour_slots` to enumerate all expected slots, then `LEFT JOIN recipe_technique_slot_maps` (critical — INNER JOIN would miss slots with no row). Filters `rti.detached = 0` (T-145-02). Returns `0` for recipes with no instances.

### getStepSlotIdMap(recipeId)
Returns `Map<recipe_step.id, colour_slot_id | null>` for all technique steps in a recipe. Reuses the same JOIN chain as `getSlotResolutionMap` but selects `ts.colour_slot_id` instead of the resolved `paint_id`. Used by PaintingModeView (Plan 145-02) to know which slot a tapped technique step maps to for the SlotReassignMiniDialog.

### Hooks + Key Factories
`UNFILLED_SLOT_COUNT_KEY`, `STEP_SLOT_ID_MAP_KEY`, `useUnfilledSlotCount`, `useStepSlotIdMap` — all following the enabled-by-id pattern from the existing `useSlotResolutionMap`. Both fall back to `0` / empty Map when `recipeId` is undefined.

### Invalidation Extension
`useUpdateSlotMap.onSuccess` now invalidates `UNFILLED_SLOT_COUNT_KEY(recipeId)` alongside the five pre-existing invalidation calls, ensuring the readiness banner refreshes after an inline slot reassignment.

### Data-Layer Tests
- **INTG-05 (recipe-duplication-live-link.test.ts):** 5 assertions — copy has distinct instances, independent slot maps, steps carry `technique_step_id`, sections point to copy's instances, original unchanged.
- **INTG-06 (unfilled-slot-count.test.ts):** 7 assertions — no instances = 0; all unfilled; partial fill; all filled = 0; explicit NULL counts unfilled; detached excluded; mixed detached/non-detached.
- **INTG-02 (availability-effective-paint.test.ts):** 6 assertions — filled slot resolves to paint; unfilled slot resolves to null (not missing); plain step uses `step.paint_id` (FND-04 fallback); slotMap has correct size and null entries for unfilled slots.

## Verification Results

- `pnpm test -- tests/data-layer/`: 33 test files passed, 268 tests passed (18 new from this plan)
- `pnpm build`: clean, no TypeScript errors
- `grep -c "BEGIN" src/db/queries/recipeTechniqueSlotMaps.ts`: 2 (both in JSDoc comments, no SQL transactions added)

## Deviations from Plan

None — plan executed exactly as written. The `detached` column was confirmed present in migration 051 line 61 with `DEFAULT 0`, so the `AND rti.detached = 0` filter was included as required.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model entries (T-145-01, T-145-02, T-145-03 all mitigated).

## Self-Check: PASSED

- [x] `src/db/queries/recipeTechniqueSlotMaps.ts` exists and exports both new functions
- [x] `src/hooks/useSlotResolutionMap.ts` exists and exports both new hooks + key factories
- [x] `tests/data-layer/recipe-duplication-live-link.test.ts` exists and passes
- [x] `tests/data-layer/unfilled-slot-count.test.ts` exists and passes
- [x] `tests/data-layer/availability-effective-paint.test.ts` exists and passes
- [x] Commits eb6126c3, 54619aa8, d9bf5068 all exist in git log

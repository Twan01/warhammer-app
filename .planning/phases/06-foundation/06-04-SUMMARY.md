---
phase: 06-foundation
plan: "04"
subsystem: hooks
tags: [tanstack-query, react-query, invalidation, hooks, typescript]

# Dependency graph
requires:
  - phase: 06-03
    provides: getPaintsWithRecipeCount, getStrategyNote, upsertStrategyNote, all armyLists query functions
  - phase: 06-02
    provides: PaintWithRecipeCount, StrategyNote, UpsertStrategyNoteInput, ArmyList, armyList types
provides:
  - PAINTS_WITH_RECIPES_KEY constant + usePaintsWithRecipeCount hook in usePaints.ts
  - useCreatePaint/useUpdatePaint/useDeletePaint each invalidate both PAINTS_KEY and PAINTS_WITH_RECIPES_KEY
  - useStrategyNote.ts with STRATEGY_NOTE_KEY factory, useStrategyNote query, useUpsertStrategyNote mutation
  - useArmyLists.ts with ARMY_LISTS_KEY, ARMY_LIST_KEY, ARMY_LIST_UNITS_KEY + 8 hooks (3 query, 5 mutation)
  - 9 real renderHook test assertions in tests/foundation/usePaints.test.ts (0 skipped)
affects: [07-paint-inventory, 08-army-list-builder, 09-unit-playbook]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "double-invalidation: paint mutations invalidate both PAINTS_KEY and PAINTS_WITH_RECIPES_KEY"
    - "DATA-09 forward-compat: army list mutations invalidate ['dashboard-stats'] for future dashboard use"
    - "per-unit query key factory: STRATEGY_NOTE_KEY(unitId) isolates strategy note cache per unit"
    - "list_id passthrough: RemoveUnitFromListInput/UpdateArmyListUnitVariables carry list_id for targeted invalidation"

key-files:
  created:
    - src/hooks/useStrategyNote.ts
    - src/hooks/useArmyLists.ts
  modified:
    - src/hooks/usePaints.ts
    - tests/foundation/usePaints.test.ts

key-decisions:
  - "useUpsertStrategyNote.onSuccess invalidates ONLY STRATEGY_NOTE_KEY(unit_id) — no ['units'] or ['dashboard-stats'] because strategy notes don't surface in collection table or dashboard"
  - "useArmyLists mutations all invalidate ['dashboard-stats'] per DATA-09 forward-compat, even though v1 dashboard doesn't show army list data yet"
  - "ARMY_LIST_UNITS_KEY(id) added as third key shape for granular unit-membership cache invalidation, beyond plan spec"
  - "RemoveUnitFromListInput and UpdateArmyListUnitVariables defined as local interfaces in useArmyLists.ts to carry list_id for targeted onSuccess invalidation"

patterns-established:
  - "Double-invalidation: any query that touches paints must invalidate both PAINTS_KEY and PAINTS_WITH_RECIPES_KEY"
  - "staleTime: Infinity for per-unit notes — note only changes via useUpsertStrategyNote in same form"

requirements-completed:
  - STRAT-06

# Metrics
duration: 3min
completed: "2026-05-01"
---

# Phase 6 Plan 04: TanStack Query Hooks Summary

**usePaints patched with PAINTS_WITH_RECIPES_KEY double-invalidation; useStrategyNote and useArmyLists hook modules created with targeted cache invalidation; Wave-0 skip stubs replaced with 9 real renderHook assertions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-01T21:14:37Z
- **Completed:** 2026-05-01T21:17:52Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Patched `usePaints.ts` with `PAINTS_WITH_RECIPES_KEY` constant and `usePaintsWithRecipeCount` hook; all 3 mutations now double-invalidate both paint cache keys — Phase 7 Paint Inventory page will never show stale recipe counts
- Created `useStrategyNote.ts` with per-unit `STRATEGY_NOTE_KEY(unitId)` factory, enabled-guard query, and `staleTime: Infinity` mutation that invalidates only the specific unit's note key (no cross-contamination to collection or dashboard)
- Created `useArmyLists.ts` with 3 keys and 8 hooks; all 6 mutation hooks carry DATA-09 `['dashboard-stats']` invalidation for forward compatibility; `RemoveUnitFromListInput` and `UpdateArmyListUnitVariables` interfaces pass `list_id` to enable targeted cache invalidation
- Replaced all 9 `it.skip` Wave-0 stubs in `tests/foundation/usePaints.test.ts` with real `renderHook` + `invalidateQueries` spy assertions — 142 total tests pass, 0 skipped

## Task Commits

1. **Task 1: Patch usePaints + real tests** - `3ab9a94` (feat)
2. **Task 2: Create useStrategyNote.ts** - `9cbdace` (feat)
3. **Task 3: Create useArmyLists.ts** - `0e270ba` (feat)

## Files Created/Modified

- `src/hooks/usePaints.ts` - Added `PAINTS_WITH_RECIPES_KEY`, `usePaintsWithRecipeCount`, and patched 3 mutations to double-invalidate
- `tests/foundation/usePaints.test.ts` - Replaced 9 `it.skip` Wave-0 stubs with real `renderHook` + spy assertions
- `src/hooks/useStrategyNote.ts` - New: `STRATEGY_NOTE_KEY(unitId)`, `useStrategyNote`, `useUpsertStrategyNote` with single-key invalidation
- `src/hooks/useArmyLists.ts` - New: `ARMY_LISTS_KEY`, `ARMY_LIST_KEY`, `ARMY_LIST_UNITS_KEY` + 8 hooks with DATA-09 `['dashboard-stats']` invalidation

## Decisions Made

- `useUpsertStrategyNote.onSuccess` invalidates only `STRATEGY_NOTE_KEY(unit_id)` — strategy notes don't appear in collection table or dashboard, so `['units']` and `['dashboard-stats']` are intentionally excluded
- All army list mutation hooks invalidate `['dashboard-stats']` per DATA-09 forward-compat pattern, even though v1 dashboard doesn't surface army list data yet
- `ARMY_LIST_UNITS_KEY(id)` added as a third key shape (beyond `ARMY_LISTS_KEY` and `ARMY_LIST_KEY`) for granular unit-membership cache invalidation
- `RemoveUnitFromListInput` and `UpdateArmyListUnitVariables` local interfaces carry `list_id` alongside the mutation payload, enabling `onSuccess` to invalidate the correct list detail key

## Deviations from Plan

None — plan executed exactly as written. The `ARMY_LIST_UNITS_KEY` constant and the two local interface definitions are within the plan spec for `useArmyLists.ts`.

## Issues Encountered

Pre-existing TypeScript errors in `tests/foundation/migration004.test.ts` (`node:fs` / `node:path` not in tsconfig, `__dirname` not found) were present before this plan and are out of scope. All three hook files produce zero tsc errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 7 Paint Inventory: `usePaintsWithRecipeCount` ready; paint mutations already double-invalidate
- Phase 8 Army List Builder: `useArmyLists` (all 8 hooks) ready for UI consumption
- Phase 9 Unit Playbook: `useStrategyNote` + `useUpsertStrategyNote` ready; `staleTime: Infinity` intentional
- Phase 6 back-end foundation (plans 01–04) complete — 06-05 is the final plan in the phase

---
*Phase: 06-foundation*
*Completed: 2026-05-01*

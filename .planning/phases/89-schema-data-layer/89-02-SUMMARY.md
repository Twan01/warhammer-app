---
phase: 89-schema-data-layer
plan: 02
subsystem: data-layer
tags: [queries, hooks, tests, army-lists, ghost-units, enhancements, warlord, tier-points]
dependency_graph:
  requires:
    - migration-031-army-list-v3
    - types-army-list-unit-v3
    - resolve-unit-points-tier
  provides:
    - query-functions-army-list-v3
    - mutation-hooks-army-list-v3
    - test-coverage-army-list-v3
  affects:
    - src/features/army-lists
    - src/features/game-day
tech_stack:
  added: []
  patterns:
    - 6-level-COALESCE (points_override > tier > synced > user-override > base > 0)
    - CASE WHEN list_id scoped warlord toggle (Pitfall 4)
    - LEFT JOIN units for ghost unit support
    - NULL-clear dedicated functions (D-13 pattern)
    - TEXT-copy denormalization for army_list_enhancements
key_files:
  created:
    - tests/army-list/armyListEnhancements.test.ts
  modified:
    - src/db/queries/armyLists.ts
    - src/hooks/useArmyLists.ts
    - tests/army-list/armyListQueries.test.ts
    - tests/foundation/armyListQueries.test.ts
decisions:
  - "setWarlord uses CASE WHEN id = $1 THEN 1 ELSE 0 END WHERE list_id = $2 — single UPDATE prevents cross-list mutation (Pitfall 4)"
  - "getArmyListWithUnits and getArmyListReadiness share identical 6-level COALESCE chain (D-09 atomicity)"
  - "Ghost unit sup/tier JOIN key is COALESCE(u.name, alu.ghost_unit_name) across all 3 query sites"
  - "addGhostUnitToList hardcodes NULL as unit_id in SQL (not a parameter) for clarity"
  - "useClearWarlord takes list_id as raw number (matches useClearArmyListDetachment pattern)"
  - "useEnhancementsByList uses ['army-list-enhancements', listId] key (not ARMY_LIST_UNITS_KEY)"
metrics:
  duration: 1080s
  completed: "2026-05-20"
  tasks: 2
  files_created: 1
  files_modified: 4
---

# Phase 89 Plan 02: Query Functions + Mutation Hooks Summary

**One-liner:** Extended 3 existing army list queries with LEFT JOIN and 6-level COALESCE for ghost/tier support; added 10 new query functions and 10 new React Query hooks for warlord, enhancement, leader attachment, and model count CRUD.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Query functions in armyLists.ts | 1dfa2f4 | src/db/queries/armyLists.ts |
| 2 | Mutation hooks + tests | cb28bf5 | src/hooks/useArmyLists.ts, tests/army-list/armyListQueries.test.ts, tests/army-list/armyListEnhancements.test.ts, tests/foundation/armyListQueries.test.ts |

## What Was Built

### Task 1: Query Functions

**`src/db/queries/armyLists.ts`** — 3 queries extended, 10 new functions added:

**Extended queries:**
- `getArmyListWithUnits`: INNER JOIN → LEFT JOIN, adds `ghost_unit_name`, `is_warlord`, `selected_model_count`, `leader_attached_to_id`, `tier_points` to SELECT; synced join key updated to `COALESCE(u.name, alu.ghost_unit_name)`; COALESCE upgraded from 5-level to 6-level; ORDER BY gains `alu.id ASC` tiebreaker (D-11)
- `getArmyListReadiness`: INNER JOIN → LEFT JOIN for both `units` and the COALESCE chain; synced/tier joins updated to use `COALESCE(u.name, alu.ghost_unit_name)`; 6-level COALESCE matches `getArmyListWithUnits` exactly (D-09)
- `getArmyListUnitNames`: INNER JOIN → LEFT JOIN units; `u.name AS unit_name` → `COALESCE(u.name, alu.ghost_unit_name) AS unit_name`

**New functions:**
- `setWarlord(armyListUnitId, listId)` — CASE WHEN scoped by list_id (T-89-04 mitigation)
- `clearWarlord(listId)` — SET is_warlord = 0 for all rows in list
- `addGhostUnitToList(input)` — INSERT with hardcoded NULL unit_id
- `setLeaderAttachment(armyListUnitId, targetId)` — SET leader_attached_to_id = $2
- `clearLeaderAttachment(armyListUnitId)` — SET leader_attached_to_id = NULL (D-13)
- `setSelectedModelCount(armyListUnitId, count)` — triggers tier-based re-resolution
- `clearSelectedModelCount(armyListUnitId)` — SET selected_model_count = NULL (D-13)
- `addEnhancement(input)` — INSERT into army_list_enhancements with TEXT/INTEGER snapshot
- `removeEnhancement(enhancementId)` — DELETE by enhancement id
- `getEnhancementsByList(listId)` — SELECT with ORDER BY created_at ASC

### Task 2: Mutation Hooks + Tests

**`src/hooks/useArmyLists.ts`** — 10 new exports:
- `useSetWarlord` — invalidates ARMY_LIST_UNITS_KEY + ARMY_LIST_KEY + ARMY_LISTS_KEY + dashboard-stats + army-list-readiness
- `useClearWarlord` — invalidates ARMY_LIST_UNITS_KEY + ARMY_LIST_KEY + army-list-readiness
- `useAddGhostUnitToList` — full standard invalidation set
- `useSetLeaderAttachment` — invalidates ARMY_LIST_UNITS_KEY + ARMY_LIST_KEY + army-list-readiness
- `useClearLeaderAttachment` — invalidates ARMY_LIST_UNITS_KEY + ARMY_LIST_KEY + army-list-readiness
- `useSetSelectedModelCount` — full standard invalidation set (points change)
- `useClearSelectedModelCount` — full standard invalidation set (points change)
- `useAddEnhancement` — full standard invalidation set
- `useRemoveEnhancement` — full standard invalidation set
- `useEnhancementsByList` (query hook) — key `["army-list-enhancements", listId]`

**Tests:**
- `tests/army-list/armyListQueries.test.ts`: Added 7 new tests for setWarlord (2), addGhostUnitToList (2), clearLeaderAttachment (2), clearSelectedModelCount (1)
- `tests/army-list/armyListEnhancements.test.ts` (NEW): 8 tests covering addEnhancement (3), removeEnhancement (2), getEnhancementsByList (3)
- `tests/foundation/armyListQueries.test.ts`: Updated 2 stale test assertions to match Phase 89 SQL changes (Rule 1 auto-fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Foundation test assertions stale after Phase 89 SQL changes**
- **Found during:** Task 2 (`pnpm test`)
- **Issue:** `tests/foundation/armyListQueries.test.ts` had 2 tests asserting against pre-Phase-89 SQL patterns: `JOIN units u ON u.id = alu.unit_id` (was changed to LEFT JOIN), `sup.unit_name = u.name` (was changed to COALESCE), `u.name AS unit_name` (was changed to COALESCE), 5-level COALESCE (now 6-level). These assertions passed before Plan 02 but broke once the queries were correctly updated.
- **Fix:** Updated both test descriptions and regex assertions to match the new correct Phase 89 SQL (LEFT JOIN, COALESCE join key, 6-level COALESCE, ORDER BY with tiebreaker).
- **Files modified:** `tests/foundation/armyListQueries.test.ts`
- **Commit:** cb28bf5

### Pre-existing Failures (Out of Scope)

The following test failures existed before Plan 02 and are not related to this plan's changes:
- `tests/datasheet/useRulesSync.test.ts` (3 failures) — `WAHAPEDIA_FACTIONS_KEY` export missing from `@/hooks/useDatasheet` mock
- `tests/painting/recipeAssignments.test.ts` (2 failures) — "invalidates exactly 2 keys" assertion fails because hooks now call 4 invalidations

These are logged to deferred-items.md for tracking.

## Known Stubs

None — this plan creates only query/hook/test contracts. No UI or rendering stubs present.

## Threat Surface Scan

No new network endpoints or trust boundaries introduced. T-89-04 (setWarlord cross-list mutation) mitigated as specified: WHERE list_id = $2 scoping verified in both implementation and test. T-89-05 (ghost_unit_name injection) accepted: parameterized query prevents SQL injection, local SQLite only. T-89-06 (getEnhancementsByList disclosure) accepted: local-only data.

## Self-Check: PASSED

- `src/db/queries/armyLists.ts` contains `setWarlord`: FOUND
- `src/hooks/useArmyLists.ts` contains `useSetWarlord`: FOUND
- `tests/army-list/armyListEnhancements.test.ts` exists and contains `addEnhancement`: FOUND
- `grep -c "LEFT JOIN units" src/db/queries/armyLists.ts` returns 3: VERIFIED
- `grep -c "setWarlord" src/hooks/useArmyLists.ts` returns 2: VERIFIED
- `pnpm build` exits 0: VERIFIED
- All army-list + resolveUnitPoints + foundation armyListQueries tests pass: VERIFIED
- Commits 1dfa2f4, cb28bf5: VERIFIED (git log)

---
phase: 76-points-resolver-unit-rules-mapping-split-warnings
plan: 01
subsystem: points-resolver, unit-rules-mapping, warnings
tags: [pure-function, crud-layer, refactor, sql]
dependency_graph:
  requires: [migration-026]
  provides: [resolveUnitPoints, computeListWarnings, unitRulesMapping-crud]
  affects: [armyLists-queries, dashboard-queries, computeUnitWarnings]
tech_stack:
  added: []
  patterns: [pure-function-resolver, warning-split, select-then-upsert]
key_files:
  created:
    - src/lib/resolveUnitPoints.ts
    - src/types/unitRulesMapping.ts
    - src/db/queries/unitRulesMapping.ts
    - src/hooks/useUnitRulesMapping.ts
    - tests/lib/resolveUnitPoints.test.ts
  modified:
    - src/types/armyList.ts
    - src/db/queries/armyLists.ts
    - src/db/queries/dashboard.ts
    - src/lib/computeUnitWarnings.ts
    - tests/lib/computeUnitWarnings.test.ts
    - tests/game-day/GameDayReadinessPanel.test.tsx
    - tests/game-day/UnitAbilityCards.test.tsx
    - tests/types/armyList.test.ts
    - tests/workshop-play/armyListReadinessPanel.test.tsx
decisions:
  - "resolveUnitPoints uses strict null check (!= null) to handle 0 as valid points value"
  - "Warning label changed from 'Stale points' to 'Stale points data' in list-level function per plan spec"
  - "computeListHealthStats no longer uses dedup filter; list-level counts from computeListWarnings directly"
metrics:
  duration: "16m"
  completed: "2026-05-15"
  tasks_completed: 2
  tasks_total: 2
  test_count: 47
  files_created: 5
  files_modified: 9
---

# Phase 76 Plan 01: Points Resolver, Mapping CRUD, Warning Split Summary

Pure points resolver with 5-level source labeling, unit_rules_mapping CRUD stack (types/queries/hooks), dashboard COALESCE upgrade to 4-level, and warning system split into list-level and unit-level functions.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| bc4dc7e | test | Add failing tests for resolveUnitPoints (RED) |
| 49557ac | feat | Implement resolveUnitPoints, types, SQL column exposure (GREEN) |
| 15115e2 | test | Update warning tests for list/unit split (RED) |
| 073b506 | feat | Warning split + mapping CRUD queries and hooks (GREEN) |

## Task Results

### Task 1: Resolver function, types, SQL exposure, and tests
- Created `resolveUnitPoints()` pure function with PointsSource union type
- Created `UnitRulesMapping` and `UpsertUnitRulesMappingInput` types with MatchStatus
- Extended `ArmyListUnitRow` with `synced_points` and `override_points` fields
- Added `sup.points AS synced_points` and `uo.points AS override_points` to getArmyListWithUnits SQL
- Upgraded dashboard `getArmyReadinessByFaction` from 2-level to 4-level COALESCE with LEFT JOINs
- 10 resolver tests passing covering all COALESCE levels + 0-value edge cases
- Fixed 4 test factory files for ArmyListUnitRow type extension (Rule 3)

### Task 2: Warning split + mapping queries/hooks + test updates
- Split `computeUnitWarnings` into unit-level only (4 conditions: Not painted, Not assembled, Manual override, Unknown points)
- Created `computeListWarnings` for list-level only (Points exceeded, Stale points data)
- Refactored `computeListHealthStats` to use `computeListWarnings` for list counts (removed dedup filter)
- Created `unitRulesMapping.ts` queries: get, getAll, upsert, delete, findMatchingDatasheets, findRulesDatasheets
- Created `useUnitRulesMapping.ts` hooks: UNIT_RULES_MAPPING_KEY, useUnitRulesMapping, useUpsertUnitRulesMapping, useDeleteUnitRulesMapping
- 37 warning tests passing (8 new computeListWarnings + updated unit/health tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed ArmyListUnitRow type mismatches in 4 test files**
- **Found during:** Task 1 GREEN phase
- **Issue:** Adding synced_points/override_points to ArmyListUnitRow broke test factories in GameDayReadinessPanel, UnitAbilityCards, armyList type tests, and armyListReadinessPanel tests
- **Fix:** Added synced_points: null and override_points: null to all test factory functions
- **Files modified:** tests/game-day/GameDayReadinessPanel.test.tsx, tests/game-day/UnitAbilityCards.test.tsx, tests/types/armyList.test.ts, tests/workshop-play/armyListReadinessPanel.test.tsx
- **Commit:** 49557ac

## Verification

- `pnpm test -- tests/lib/resolveUnitPoints.test.ts` -- 10/10 passed
- `pnpm test -- tests/lib/computeUnitWarnings.test.ts` -- 37/37 passed
- `pnpm build` -- success, no TypeScript errors
- Full test suite: 1602 passed, 2 pre-existing timing failures (dashboard query parallelism)

## Self-Check: PASSED

- [x] src/lib/resolveUnitPoints.ts exists
- [x] src/types/unitRulesMapping.ts exists
- [x] src/db/queries/unitRulesMapping.ts exists
- [x] src/hooks/useUnitRulesMapping.ts exists
- [x] tests/lib/resolveUnitPoints.test.ts exists
- [x] Commit bc4dc7e found
- [x] Commit 49557ac found
- [x] Commit 15115e2 found
- [x] Commit 073b506 found

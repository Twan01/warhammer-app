---
phase: 66-army-list-validation
plan: 01
subsystem: army-list-validation
tags: [warning-system, tactical-roles, pure-functions, types]
dependency_graph:
  requires: []
  provides:
    - computeUnitWarnings pure function
    - computeListHealthStats aggregation function
    - TACTICAL_ROLES const array and TacticalRole type
    - Extended ArmyListUnitRow with tactical_role
  affects:
    - src/db/queries/armyLists.ts (updateArmyListUnit SQL extended)
    - src/features/army-lists/ArmyListUnitRow.tsx (tactical_role preservation)
    - tests/foundation/armyListQueries.test.ts (updated assertions)
    - tests/game-day/UnitAbilityCards.test.tsx (fixture updated)
    - tests/workshop-play/armyListReadinessPanel.test.tsx (fixture updated)
tech_stack:
  added: []
  patterns:
    - Pure computation function (computeWorkflowPosition pattern)
    - Const array enum (PAINTING_STATUS_ORDER pattern)
    - Full-replacement UPDATE field extension
key_files:
  created:
    - src/lib/computeUnitWarnings.ts
    - tests/lib/computeUnitWarnings.test.ts
    - tests/types/armyList.test.ts
  modified:
    - src/types/armyList.ts
    - src/db/queries/armyLists.ts
    - src/features/army-lists/ArmyListUnitRow.tsx
    - tests/foundation/armyListQueries.test.ts
    - tests/game-day/UnitAbilityCards.test.tsx
    - tests/workshop-play/armyListReadinessPanel.test.tsx
decisions:
  - "tactical_role typed as string | null (not TacticalRole | null) on row interfaces for SQLite flexibility"
  - "Stale points warning fires on both 'stale' and 'never' freshness tiers"
metrics:
  duration: 12m
  completed: 2026-05-13
---

# Phase 66 Plan 01: Warning Classification and Tactical Role Types Summary

Pure warning classification engine with 5-level COALESCE-aware hard/soft categorization, TACTICAL_ROLES 7-role const array, and full test coverage (29 tests)

## Completed Tasks

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Define TACTICAL_ROLES and extend ArmyListUnitRow type | dfd75af | src/types/armyList.ts, tests/types/armyList.test.ts |
| 2 | Create computeUnitWarnings pure function with tests | b38789e | src/lib/computeUnitWarnings.ts, tests/lib/computeUnitWarnings.test.ts |

## What Was Built

### computeUnitWarnings (src/lib/computeUnitWarnings.ts)
Pure function classifying per-unit warnings in an army list:
- **Hard warnings:** "Points exceeded" when pointsLimit is set and totalPoints exceeds it (list-level condition per D-04)
- **Soft warnings:** "Not painted" (status_painting !== "Completed"), "Not assembled" (status_assembly === 0), "Manual override" (points_override !== null), "Unknown points" (effective_points === 0), "Stale points" (freshness is "stale" or "never")

### computeListHealthStats (src/lib/computeUnitWarnings.ts)
Aggregation function for the health summary panel:
- totalPoints: sum of effective_points across all units
- battleReadyPct: painted points / total points (rounded)
- ownershipPct: always 100 per D-15 (FK constraint ensures all units are owned)
- hardWarningCount / softWarningCount: counts across all units
- pointsExceeded: totalPoints > pointsLimit (false when pointsLimit is null)

### TACTICAL_ROLES (src/types/armyList.ts)
Const array with 7 roles following PAINTING_STATUS_ORDER pattern:
anti_tank, screening, objective_holder, fire_support, melee_threat, utility, transport

### Type Extensions
- ArmyListUnitRow extended with `tactical_role: string | null`
- UpdateArmyListUnitInput extended with `tactical_role: string | null`
- updateArmyListUnit SQL updated to `SET points_override=$2, notes=$3, tactical_role=$4`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed type errors from full-replacement UPDATE extension**
- **Found during:** Task 1
- **Issue:** Adding tactical_role to UpdateArmyListUnitInput broke all call sites that didn't pass it (ArmyListUnitRow.tsx, 3 test files)
- **Fix:** Added tactical_role preservation to both mutation call sites in ArmyListUnitRow.tsx, updated test fixtures in armyListQueries.test.ts, UnitAbilityCards.test.tsx, armyListReadinessPanel.test.tsx
- **Files modified:** src/features/army-lists/ArmyListUnitRow.tsx, src/db/queries/armyLists.ts, tests/foundation/armyListQueries.test.ts, tests/game-day/UnitAbilityCards.test.tsx, tests/workshop-play/armyListReadinessPanel.test.tsx
- **Commit:** dfd75af

**2. [Rule 1 - Bug] Fixed unused import type errors in test file**
- **Found during:** Task 2
- **Issue:** TypeScript strict mode flagged unused type imports (UnitWarnings, ListHealthStats, SyncFreshness) in test file
- **Fix:** Removed unused imports, kept only WarningContext and ArmyListUnitRow
- **Files modified:** tests/lib/computeUnitWarnings.test.ts
- **Commit:** b38789e

## Test Coverage

- **tests/types/armyList.test.ts:** 6 tests covering TACTICAL_ROLES array, display map, and type shape
- **tests/lib/computeUnitWarnings.test.ts:** 23 tests covering all hard/soft warning types, edge cases, and health stats aggregation
- **Total new tests:** 29
- **Full suite:** 1521 passed, 6 skipped, 12 todo

## Verification

- `pnpm test -- tests/lib/computeUnitWarnings.test.ts` -- all green
- `pnpm test -- tests/types/armyList.test.ts` -- all green
- `pnpm build` -- passes with no type errors

## Self-Check: PASSED

All files found, all commits verified.

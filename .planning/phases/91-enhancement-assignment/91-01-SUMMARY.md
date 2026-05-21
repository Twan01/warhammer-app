---
phase: 91-enhancement-assignment
plan: 01
subsystem: army-lists
tags: [data-layer, hooks, pure-functions, tests]
dependency_graph:
  requires: []
  provides: [getUnitKeywords, useUnitKeywords, computeListHealthStats-enhancementTotal]
  affects: [EnhancementPickerSheet, ArmyListSummaryBar]
tech_stack:
  added: []
  patterns: [cross-db-keyword-lookup, optional-param-backward-compat]
key_files:
  created:
    - src/hooks/useUnitKeywords.ts
    - tests/army-list/computeListHealthStats.test.ts
  modified:
    - src/db/queries/datasheets.ts
    - src/lib/computeUnitWarnings.ts
decisions:
  - Used SyncFreshness "fresh" in tests (not "synced" which is not a valid SyncFreshness value)
  - Adapted test fixtures to worktree's ArmyListUnitRow shape (pre-Phase 89, no ghost_unit_name/is_warlord fields)
metrics:
  duration: ~9 minutes
  completed: 2026-05-21
---

# Phase 91 Plan 01: Keyword Lookup and Enhancement Points Utilities Summary

Cross-DB unit keyword status query with React Query hook, plus enhancement points integration into list health stats.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | getUnitKeywords + useUnitKeywords | b08389b | src/db/queries/datasheets.ts, src/hooks/useUnitKeywords.ts |
| 2 | computeListHealthStats enhancementTotal + tests | 30a574e | src/lib/computeUnitWarnings.ts, tests/army-list/computeListHealthStats.test.ts |

## What Was Delivered

1. **UnitKeywordStatus interface + getUnitKeywords()** -- Cross-DB query joining rw_datasheets and rw_datasheet_keywords to determine Character/Epic Hero status by unit name. Case-insensitive. try/catch returns safe defaults when rules.db unavailable.

2. **useUnitKeywords hook** -- React Query wrapper with staleTime: Infinity (keyword data only changes on re-sync), enabled guard on unitName !== undefined.

3. **computeListHealthStats enhancement extension** -- Optional 4th parameter `enhancementTotal` (default 0) added to the existing function. Unit points renamed to `unitPoints`, `totalPoints = unitPoints + enhancementTotal`. All existing 3-arg callers compile unchanged.

4. **5 ENH-03 tests** -- All passing: enhancementTotal in totalPoints, pointsExceeded with combined total, at-limit boundary, backward compat (3-arg), explicit zero.

## Verification Results

- `pnpm build`: Zero TypeScript errors
- `pnpm test -- tests/army-list/computeListHealthStats.test.ts`: All 5 new tests pass
- Pre-existing test failures in migration-parity and useRulesSync are out of scope

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SyncFreshness type mismatch in tests**
- **Found during:** Task 2
- **Issue:** Plan specified "synced" as freshness value but SyncFreshness type only has "fresh" | "aging" | "stale" | "never"
- **Fix:** Used "fresh" instead of "synced" in all test cases
- **Files modified:** tests/army-list/computeListHealthStats.test.ts

**2. [Rule 3 - Blocking] Adapted test fixtures to worktree type shape**
- **Found during:** Task 2
- **Issue:** Worktree has pre-Phase 89 ArmyListUnitRow without ghost_unit_name, is_warlord, selected_model_count, leader_attached_to_id, tier_points fields
- **Fix:** Removed unavailable fields from makeUnit fixture to match actual type
- **Files modified:** tests/army-list/computeListHealthStats.test.ts

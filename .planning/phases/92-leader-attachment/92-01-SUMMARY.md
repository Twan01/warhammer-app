---
phase: 92-leader-attachment
plan: "01"
subsystem: army-lists
tags: [leader-attachment, pure-function, react-query, tdd]
dependency_graph:
  requires: []
  provides: [groupUnitsWithLeaders, useLeaderTargets, LEADER_TARGETS_KEY]
  affects: [army-list-unit-display, leader-attachment-sheet]
tech_stack:
  added: []
  patterns: [pure-reorder-function, react-query-hook-with-null-guard]
key_files:
  created:
    - src/lib/groupUnitsWithLeaders.ts
    - src/hooks/useLeaderTargets.ts
    - tests/army-lists/groupUnitsWithLeaders.test.tsx
  modified: []
decisions:
  - "Orphaned leaders (target not in array) are silently dropped from output rather than throwing"
  - "useLeaderTargets accepts pre-converted string factionId (caller responsibility per Phase 91 pitfall)"
metrics:
  duration_seconds: 164
  completed: "2026-05-21T06:29:40Z"
---

# Phase 92 Plan 01: Leader Grouping Utility + Hook Summary

Pure reorder function (groupUnitsWithLeaders) and React Query hook (useLeaderTargets) for leader-target visual grouping in army lists.

## Task Results

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 (RED) | Failing tests for groupUnitsWithLeaders | 399bcaf | tests/army-lists/groupUnitsWithLeaders.test.tsx |
| 1 (GREEN) | Implement groupUnitsWithLeaders | b11e4c1 | src/lib/groupUnitsWithLeaders.ts |
| 2 | useLeaderTargets hook + TS fixes | f0c7062 | src/hooks/useLeaderTargets.ts |

## TDD Gate Compliance

- RED gate: `test(92-01)` commit 399bcaf -- 7 tests, all failed (module not found)
- GREEN gate: `feat(92-01)` commit b11e4c1 -- all 7 tests pass
- No refactor gate needed (code was clean on first pass; minor TS unused-var fixes bundled with Task 2)

## What Was Built

### groupUnitsWithLeaders (src/lib/groupUnitsWithLeaders.ts)
- Pure function: `(units: ArmyListUnitRow[]) => GroupedUnit[]`
- Exports `GroupedUnit` interface with `unit` and `isIndentedLeader` fields
- Reorders flat array so attached leaders appear immediately after their target
- Orphaned leaders (target not in array) dropped from output
- Input array never mutated

### useLeaderTargets (src/hooks/useLeaderTargets.ts)
- React Query hook wrapping `getLeaderTargetsByFaction`
- Accepts `string | null` factionId with `enabled` guard
- Query key: `["leader-targets", factionId]`
- staleTime: 5 minutes (project default)

## Test Coverage

7 tests in `tests/army-lists/groupUnitsWithLeaders.test.tsx`:
1. No attachments -- units unchanged, all isIndentedLeader=false
2. Single leader-target pair reorders correctly
3. Multiple leader-target pairs grouped correctly
4. Orphaned leader (target missing) dropped from output
5. Empty array returns empty array
6. Ghost units (unit_id=null) with attachment grouped correctly
7. Input array immutability verified

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused variable TS errors**
- **Found during:** Task 2 (build verification)
- **Issue:** `presentIds` in groupUnitsWithLeaders.ts and `GroupedUnit` import in test file were unused, causing TS strict mode errors
- **Fix:** Removed unused `presentIds` set (orphan detection is implicit in the algorithm), removed unused type import
- **Files modified:** src/lib/groupUnitsWithLeaders.ts, tests/army-lists/groupUnitsWithLeaders.test.tsx
- **Commit:** f0c7062

## Known Stubs

None.

## Verification

- `pnpm test -- tests/army-lists/groupUnitsWithLeaders.test.tsx -x` -- 7/7 passing
- `pnpm build` (tsc --noEmit) -- clean, no errors

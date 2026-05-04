---
phase: 26-dashboard-redesign
plan: 00
subsystem: testing
tags: [vitest, tdd, dashboard, wave-0, stubs]

# Dependency graph
requires:
  - phase: 25-design-foundation
    provides: design tokens, PageHeader, StatCard, StatusBadge components
provides:
  - 13 it.skip stubs locking the computeRecentActivity pure-function contract (DASH-06)
  - 5 it.skip stubs locking the getRecentActivity SQL query contract (DASH-06)
  - 3 it.skip stubs locking the units field on ComputedDashboardStats (DASH-04)
affects: [26-01, 26-02, 26-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 stub pattern: it.skip + TODO Wave 1 import comments for pre-contract tests"
    - "vi.mock('@/db/client') + selectMock/executeMock for SQL query stubs"
    - "u() builder helper cloned from computeStats.test.ts for fixture consistency"

key-files:
  created:
    - tests/dashboard/computeRecentActivity.test.ts
    - tests/dashboard/recentActivityQuery.test.ts
  modified:
    - tests/dashboard/computeStats.test.ts

key-decisions:
  - "Wave 0 stubs use it.skip (not xit or xtest) so Wave 1 can grep for it.skip to find activation candidates"
  - "TODO Wave 1 import comments carry exact import paths and named exports so Wave 1 knows exactly what to uncomment"
  - "Pitfall 4 (session_date normalization to 23:59:59) and Pitfall 5 (no battle_logs.updated_at) documented as file-level JSDoc — Wave 1 cannot miss them"

patterns-established:
  - "Wave 0 stubs: all test bodies commented out; only it.skip shell with descriptive name kept active"
  - "SQL stub pattern: vi.mock + selectMock at top of file, beforeEach reset, all it.skip inside single describe"

requirements-completed: [DASH-04, DASH-06]

# Metrics
duration: 8min
completed: 2026-05-04
---

# Phase 26 Plan 00: Dashboard Redesign Wave 0 Test Stubs Summary

**21 it.skip Wave 0 stubs locking DASH-04 (units field) and DASH-06 (activity feed) contracts across 3 test files so Wave 1 has an exact activation checklist**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-04T20:14:10Z
- **Completed:** 2026-05-04T20:19:30Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created `computeRecentActivity.test.ts` with 13 it.skip stubs covering all DASH-06 pure-function behaviors: empty inputs, 4 event types, Pitfall 4 session date normalization, Pitfall 5 no battle updated_at, sort DESC, slice to limit
- Created `recentActivityQuery.test.ts` with 5 it.skip stubs covering the getRecentActivity SQL shape: parallel Promise.all, sessions JOIN units query, battles SELECT, LIMIT 20, return shape
- Extended `computeStats.test.ts` with 3 new it.skip stubs for the DASH-04 units field on ComputedDashboardStats (same-reference, length, empty path)
- All 395 pre-existing tests remain green; `pnpm test -- tests/dashboard/` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Create computeRecentActivity test stubs** - `e31152d` (test)
2. **Task 2: Create getRecentActivity SQL query test stubs** - `ac51afd` (test)
3. **Task 3: Extend computeStats.test.ts with units field stubs** - `0e9ea1a` (test)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `tests/dashboard/computeRecentActivity.test.ts` - 13 it.skip stubs for DASH-06 pure function (new file)
- `tests/dashboard/recentActivityQuery.test.ts` - 5 it.skip stubs for DASH-06 SQL query (new file)
- `tests/dashboard/computeStats.test.ts` - 3 it.skip stubs appended for DASH-04 units field

## Wave 1 Activation Checklist

When Wave 1 creates/modifies production code, flip these stubs from `it.skip` to `it`:

### After creating `src/features/dashboard/computeRecentActivity.ts`:
1. Uncomment the TODO import in `computeRecentActivity.test.ts`
2. Uncomment all 13 test bodies (remove `//` from each line)
3. Flip all 13 `it.skip(` to `it(`

Tests to activate:
- `returns empty array when units, sessions, and battles are all empty`
- `emits one unit_added event per unit using created_at timestamp`
- `event id is stable and unique across event types`
- `emits unit_updated only when updated_at !== created_at`
- `emits one session_logged event per session row with label 'Session: {unit_name}'`
- `normalizes session_date to YYYY-MM-DD 23:59:59 for chronological sort (Pitfall 4)`
- `emits one battle_logged event per battle row with label 'Battle vs {opponent_faction}: {result}'`
- `uses battle.created_at directly as timestamp (Pitfall 5: no updated_at)`
- `sorts all events by timestamp DESC (most recent first) across event types`
- `slices to default limit of 10 events`
- `respects custom limit parameter`
- `combines all 4 event types in a single sorted feed`

### After adding `getRecentActivity` to `src/db/queries/dashboard.ts`:
1. Uncomment the TODO import in `recentActivityQuery.test.ts`
2. Uncomment all 5 test bodies
3. Flip all 5 `it.skip(` to `it(`

Tests to activate:
- `issues two parallel SELECTs (sessions JOIN units, battle_logs)`
- `sessions query JOINs painting_sessions to units and selects session_date, id, unit_name, unit_id`
- `battles query selects id, created_at, opponent_faction, result with LIMIT 20`
- `returns { sessions, battles } object with rows from each query`
- `queries run in parallel via Promise.all (timing assertion)`

### After adding `units` field to `computeStats` in `src/features/dashboard/computeStats.ts`:
1. Uncomment all 3 test bodies in the `DASH-04 units field` describe block
2. Flip all 3 `it.skip(` to `it(`

Tests to activate:
- `exposes the full units array on the stats result for HobbyPipeline consumption`
- `units array is the same reference passed in (no copy/sort applied)`
- `empty input returns empty units array (DASH-08 path)`

## Decisions Made
- Wave 0 stubs use `it.skip` (not `xit` or `xtest`) — Wave 1 greps `it.skip` to find activation candidates; consistent with existing useJournalSessions Wave 0 pattern
- TODO Wave 1 import comments carry exact module paths and named exports so Wave 1 knows exactly what to uncomment with no ambiguity
- Pitfall 4 (session_date normalization) and Pitfall 5 (no battle updated_at) are file-level JSDoc so Wave 1 implementation cannot miss these edge cases
- `u()` builder helper cloned verbatim from `computeStats.test.ts` to keep fixture patterns consistent across dashboard test files

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wave 1 (plan 26-01) has a complete, unambiguous list of 21 test names to activate
- Wave 1 knows exact import paths for all new production modules
- Pitfall 4 and Pitfall 5 are prominently documented in Wave 0 stubs — Wave 1 implementation cannot miss them

## Self-Check: PASSED

- FOUND: tests/dashboard/computeRecentActivity.test.ts
- FOUND: tests/dashboard/recentActivityQuery.test.ts
- FOUND: tests/dashboard/computeStats.test.ts (modified)
- FOUND: .planning/phases/26-dashboard-redesign/26-00-SUMMARY.md
- FOUND commit e31152d (task 1)
- FOUND commit ac51afd (task 2)
- FOUND commit 0e9ea1a (task 3)
- pnpm test -- tests/dashboard/: 395 passed, 22 skipped, 0 failures

---
*Phase: 26-dashboard-redesign*
*Completed: 2026-05-04*

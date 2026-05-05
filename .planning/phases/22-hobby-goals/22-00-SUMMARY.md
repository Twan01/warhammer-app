---
phase: 22-hobby-goals
plan: "00"
subsystem: testing
tags: [vitest, react-testing-library, test-stubs, wave-0, tdd]

# Dependency graph
requires: []
provides:
  - "Wave 0 test contract: 33 it.skip stubs across 6 test files under tests/goals/"
  - "ANLY-01 test contract: SQL CRUD queries + Zod schema + GoalSheet form stubs"
  - "ANLY-02 test contract: computeGoalPeriod math + useGoalProgress hook stubs"
  - "ANLY-03 test contract: deriveGoalStatus ordering + GoalsPage section grouping stubs"
affects: [22-01, 22-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 test stub pattern: it.skip with TODO comment naming the plan that will fill each body"
    - "Mirrors battleLogQueries.test.ts vi.mock getDb pattern for query module stubs"

key-files:
  created:
    - tests/goals/goalQueries.test.ts
    - tests/goals/goalSchema.test.ts
    - tests/goals/computeGoalPeriod.test.ts
    - tests/goals/useGoals.test.tsx
    - tests/goals/GoalSheet.test.tsx
    - tests/goals/GoalsPage.test.tsx
  modified: []

key-decisions:
  - "All 6 stub files use it.skip (not it.todo) to match existing project pattern from battle-log and wishlist Wave 0 stubs"
  - "vi.mock('@/db/client') setup included in goalQueries.test.ts even though tests are skipped — ready for Plan 22-01 to uncomment imports"

patterns-established:
  - "Wave 0 pattern: TODO comments name the exact plan that activates each stub (Plan 22-01 or Plan 22-02)"

requirements-completed:
  - ANLY-01
  - ANLY-02
  - ANLY-03

# Metrics
duration: 4min
completed: 2026-05-05
---

# Phase 22 Plan 00: Hobby Goals Wave 0 Test Stubs Summary

**33 it.skip test stubs across 6 files establishing ANLY-01/02/03 behavioral contract before any production code is written**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-05T18:36:13Z
- **Completed:** 2026-05-05T18:40:00Z
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments
- Created tests/goals/ directory with 6 Wave 0 stub files
- Established test specification contract for all 3 phase requirements (ANLY-01, ANLY-02, ANLY-03)
- Full test suite passes with 569 tests passing, 0 failures (33 new stubs are skipped)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 6 Wave 0 test stub files for Hobby Goals** - `670e100` (test)

**Plan metadata:** _(docs commit below)_

## Files Created/Modified
- `tests/goals/goalQueries.test.ts` — 6 it.skip stubs: getGoals + createGoal + updateGoal + deleteGoal (ANLY-01) + getGoalProgress (ANLY-02)
- `tests/goals/goalSchema.test.ts` — 4 it.skip stubs: Zod schema validation for name, target_count, timeframe (ANLY-01)
- `tests/goals/computeGoalPeriod.test.ts` — 10 it.skip stubs: month/quarter period boundaries + currentPeriod (ANLY-02) + deriveGoalStatus ordering (ANLY-03)
- `tests/goals/useGoals.test.tsx` — 6 it.skip stubs: useGoals, useGoalProgress enable condition, mutation invalidations (ANLY-01/02)
- `tests/goals/GoalSheet.test.tsx` — 3 it.skip stubs: create mode render, submit, edit pre-fill (ANLY-01)
- `tests/goals/GoalsPage.test.tsx` — 4 it.skip stubs: Active/Completed/Missed sections + empty state (ANLY-03)

## Decisions Made
- Used `it.skip` (not `it.todo`) to match existing project pattern from battle-log and wishlist Wave 0 stubs
- Included `vi.mock('@/db/client')` setup in goalQueries.test.ts even though tests are skipped — Plan 22-01 only needs to uncomment the import line
- TODO comments in each file name the exact plan (22-01 or 22-02) that will fill each stub body

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wave 0 contract complete — Plans 22-01 and 22-02 can now implement production code and activate stubs
- Plan 22-01 scope: goalQueries.ts, goalSchema.ts, computeGoalPeriod.ts, migration 009, lib.rs update
- Plan 22-02 scope: useGoals.ts hook, GoalSheet, GoalCard, GoalsPage, router + sidebar wiring

---
*Phase: 22-hobby-goals*
*Completed: 2026-05-05*

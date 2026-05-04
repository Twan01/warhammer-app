---
phase: 19-analytics-core
plan: "00"
subsystem: testing
tags: [vitest, tdd, wave-0, analytics, stubs]

# Dependency graph
requires:
  - phase: 18-battle-log
    provides: Wave 0 stub pattern (it.skip + TODO comment blocks for missing modules)
provides:
  - 29 it.skip stubs across 3 test files covering ANLY-04, ANLY-05, ANLY-06, ANLY-07
  - Test contract for computeHobbyAnalytics pure function (velocity, streak, monthlyData)
  - Test contract for getAnalyticsData SQL query (NULL exclusion, UNION ALL, rolling window)
  - Test contract for HOBBY_ANALYTICS_KEY cache key
affects: [19-analytics-core plans 01+, 20-wishlist, 21-hobby-goals]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Wave 0 stub pattern: it.skip with empty body + TODO comment replacing top-level imports

key-files:
  created:
    - tests/analytics/computeHobbyAnalytics.test.ts
    - tests/analytics/analyticsQueries.test.ts
    - tests/analytics/useHobbyAnalytics.test.ts
  modified: []

key-decisions:
  - "Wave 0 stubs omit top-level imports of not-yet-existing modules — TODO comment blocks used so Plan 01 knows exact imports to restore when activating (mirrors Phase 18 pattern)"

patterns-established:
  - "Wave 0 stub pattern: it.skip + empty body + TODO import comment — Plan 01 flips by removing .skip and uncommenting import"

requirements-completed: [ANLY-04, ANLY-05, ANLY-06, ANLY-07]

# Metrics
duration: 8min
completed: 2026-05-04
---

# Phase 19 Plan 00: Analytics Core Wave 0 Stubs Summary

**29 it.skip stubs across 3 test files establishing the full ANLY-04..07 test contract, with Pitfalls 2/5/6 explicitly named — Plan 01 can activate in a single pass without writing new it() blocks**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-04T15:11:35Z
- **Completed:** 2026-05-04T15:13:30Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created tests/analytics/ directory with 3 stub files (18 + 9 + 2 = 29 it.skip stubs total)
- Every ANLY-04..07 requirement named in at least one describe/it block
- Pitfalls 2 (velocity Infinity), 5 (timezone safety), 6 (year-boundary label) explicitly named in stub text
- Full vitest suite: 359 passed + 31 skipped, 0 failed (no regressions)

## Stub Count per File

| File | Stubs | Requirements Covered |
|------|-------|---------------------|
| computeHobbyAnalytics.test.ts | 18 | ANLY-04 (6), ANLY-05 (6), ANLY-06 (6) |
| analyticsQueries.test.ts | 9 | ANLY-07 (7), ANLY-04/05 (2) |
| useHobbyAnalytics.test.ts | 2 | ANLY-04/05/06/07 (cache key) |
| **Total** | **29** | |

## Requirement Coverage Map

- **ANLY-04** (velocity): 6 stubs in computeHobbyAnalytics.test.ts + 2 in analyticsQueries + 1 in useHobbyAnalytics
- **ANLY-05** (streak): 6 stubs in computeHobbyAnalytics.test.ts + 2 in analyticsQueries + 1 in useHobbyAnalytics
- **ANLY-06** (monthlyData): 6 stubs in computeHobbyAnalytics.test.ts + 1 in analyticsQueries
- **ANLY-07** (NULL purchase_date exclusion): 5 stubs in analyticsQueries (2 explicitly naming ANLY-07)

## Pitfall Coverage

- **Pitfall 2** (velocity division by zero / single-day floor): Named in `does NOT return 'Infinity'` stub
- **Pitfall 5** (timezone safety via dates.ts): Named in `uses dates.ts (todayISO + parseLocalDate) — never raw new Date().toISOString() (Pitfall 5: timezone safety)` stub
- **Pitfall 6** (year-boundary label): Named in `month labels use Jan '25 style suffix for months belonging to a year before the current year (Pitfall 6)` stub

## Task Commits

Each task was committed atomically:

1. **Task 1: computeHobbyAnalytics.test.ts (ANLY-04, ANLY-05, ANLY-06)** - `154b093` (test)
2. **Task 2: analyticsQueries.test.ts (ANLY-07)** - `a5106ab` (test)
3. **Task 3: useHobbyAnalytics.test.ts (HOBBY_ANALYTICS_KEY)** - `c4169bc` (test)

## Files Created/Modified

- `tests/analytics/computeHobbyAnalytics.test.ts` - 18 it.skip stubs for velocity/streak/monthlyData pure function
- `tests/analytics/analyticsQueries.test.ts` - 9 it.skip stubs for getAnalyticsData SQL contract
- `tests/analytics/useHobbyAnalytics.test.ts` - 2 it.skip stubs for HOBBY_ANALYTICS_KEY cache contract

## Plan 01 Activation Checklist

Activate stubs in this order (each depends on the prior to confirm approach):

1. **computeHobbyAnalytics.test.ts** (pure function — no mocks, easiest to activate first)
   - Uncomment the `import { expect, beforeEach, afterEach, vi } from "vitest"` and `import { computeHobbyAnalytics }` lines
   - Remove `.skip` from all 18 stubs
   - Add assertions using `todayISO()` / `parseLocalDate()` from dates.ts for streak tests

2. **analyticsQueries.test.ts** (uses vi.mock — activate after analytics.ts query module exists)
   - Replace the TODO comment block with the active mock setup (vi.fn, vi.mock, import, beforeEach)
   - Remove `.skip` from all 9 stubs
   - Assert SQL strings contain expected keywords (UNION ALL, WHERE purchase_date IS NOT NULL, strftime)

3. **useHobbyAnalytics.test.ts** (single import + equality — activate last, simplest)
   - Uncomment `import { expect } from "vitest"` and `import { HOBBY_ANALYTICS_KEY }`
   - Remove `.skip` from both stubs
   - Add `expect(HOBBY_ANALYTICS_KEY).toEqual(["hobby-analytics"])` assertions

## Decisions Made

- Wave 0 stubs omit top-level imports entirely (modules don't exist yet) — TODO comment blocks used so Plan 01 knows exact imports to restore when activating; pattern mirrors Phase 18

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript error in `tests/enrichment/UnitDetailSheet.enrichment.test.tsx` (TS6133: 'beforeEach' declared but never read) — out of scope, not introduced by this plan, logged for reference.

## Next Phase Readiness

- Plan 01 can immediately create `src/features/dashboard/computeHobbyAnalytics.ts`, `src/db/queries/analytics.ts`, and `src/hooks/useHobbyAnalytics.ts` then flip stubs to active
- All ANLY-04..07 contracts pre-defined — implementation team has precise behavioral specification
- No blockers

---
*Phase: 19-analytics-core*
*Completed: 2026-05-04*

---
phase: 33-data-intelligence
plan: 02
subsystem: ui
tags: [spending, metrics, pure-function, react-query, react-testing-library, tdd]

# Dependency graph
requires:
  - phase: 33-data-intelligence
    provides: Wave 0 test stubs for DATA-03/04 in SpendingPage.test.tsx
provides:
  - computeSpendingStats extended with 3 new fields (costPerCompletedModelPence, paintedValuePence, unpaintedValuePence)
  - SpendingPage with two new metric cards between hero card and Monthly Trend
  - Full test coverage for DATA-03/04 in both unit and component tests
affects: [spending, computeSpendingStats consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure function extension pattern — extend SpendingStats interface + Pick type + computation before return statement
    - Test data distinctness — use non-overlapping pence values across mock fields to avoid getByText ambiguity

key-files:
  created: []
  modified:
    - src/features/spending/computeSpendingStats.ts
    - src/features/spending/SpendingPage.tsx
    - tests/spending/computeSpendingStats.test.ts
    - tests/spending/SpendingPage.test.tsx

key-decisions:
  - "costPerCompletedModelPence divides unitTotalPence (all units total) by completedCount — answers 'on average how much am I spending per completed model across my whole collection' not 'what does a completed model cost'"
  - "Test mock data must use distinct pence values across costPerCompletedModelPence, paintedValuePence, and unpaintedValuePence fields to avoid getByText('£XX.XX') ambiguity"
  - "Loading skeleton extended with grid-cols-2 h-28 pair between hero skeleton and chart skeleton to match populated layout"

patterns-established:
  - "Pattern 1: TDD for pure functions — RED commit with failing tests before GREEN implementation commit"
  - "Pattern 2: Use distinct test fixture values for formatCurrency output to avoid multiple-element getByText errors"

requirements-completed: [DATA-03, DATA-04]

# Metrics
duration: 25min
completed: 2026-05-06
---

# Phase 33 Plan 02: Spending Intelligence Metrics Summary

**costPerCompletedModelPence + painted/unpainted value split added to computeSpendingStats pure function and rendered as two metric cards on SpendingPage between hero and Monthly Trend**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-06T11:00:00Z
- **Completed:** 2026-05-06T11:25:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Extended `SpendingStats` interface with `costPerCompletedModelPence` (null when 0 Completed), `paintedValuePence`, and `unpaintedValuePence`
- Extended `computeSpendingStats` Pick type to include `status_painting` — no SQL changes needed since `SELECT * FROM units` already returns the field
- Added two metric cards to `SpendingPage` between the hero card and Monthly Trend: "Cost Per Completed Model" (with dash fallback for null) and "Painted vs Unpainted Value" (two figures with labels)
- Loading skeleton extended with grid-cols-2 section matching the populated layout
- Filled in 4 Wave 0 test stubs in `SpendingPage.test.tsx` with full implementations

## Task Commits

Each task was committed atomically:

1. **RED — Failing tests for DATA-03/04** - `fecee4b` (test)
2. **GREEN — computeSpendingStats extended** - `5f62b80` (feat)
3. **Task 2: SpendingPage metric cards + test stubs filled** - `70e786d` (feat)

_Note: Task 1 used TDD — RED commit then GREEN implementation commit_

## Files Created/Modified

- `src/features/spending/computeSpendingStats.ts` — SpendingStats interface + computeSpendingStats extended with 3 new fields and status_painting in Pick type
- `src/features/spending/SpendingPage.tsx` — Two metric cards inserted after hero card, loading skeleton updated
- `tests/spending/computeSpendingStats.test.ts` — 7 new test cases in DATA-03/04 describe block
- `tests/spending/SpendingPage.test.tsx` — 4 Wave 0 stubs replaced with real implementations

## Decisions Made

- costPerCompletedModelPence divides `unitTotalPence` (all units, not just completed) by `completedCount` — this answers "on average how much am I spending per completed model across my whole collection" per CONTEXT.md intent
- Test fixtures must use distinct pence values across all three new fields when mock data is passed to SpendingPage, to avoid getByText ambiguity with formatCurrency output. Initial values (2500/2500 and 3000/3000) caused two failing tests that were fixed by switching to distinct values (4000/3000/5000 and 1200/4500/7500)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed duplicate currency values in SpendingPage test fixtures**
- **Found during:** Task 2 (SpendingPage metric cards)
- **Issue:** Initial test mock data used `costPerCompletedModelPence: 2500` + `paintedValuePence: 2500`, causing both the Cost Per Completed Model card and the painted value to render `£25.00` — RTL `getByText` throws on multiple matches
- **Fix:** Changed to distinct values (4000/3000/5000 and 1200/4500/7500) that produce unique formatted strings
- **Files modified:** tests/spending/SpendingPage.test.tsx
- **Verification:** All 4 new DATA-03/04 tests pass with exit code 0
- **Committed in:** 70e786d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in test fixture data)
**Impact on plan:** Minor fix, no scope creep. Tests now correctly verify distinct renders.

## Issues Encountered

None beyond the test fixture collision described above.

## Next Phase Readiness

- DATA-03 and DATA-04 requirements are complete
- SpendingPage now surfaces two meaningful intelligence metrics
- computeSpendingStats is fully tested including edge cases (null price, no Completed, rounding, invariant)
- Phase 33 Plan 03 (DATA-05/06 recipe linking and unit link) can proceed independently

---
*Phase: 33-data-intelligence*
*Completed: 2026-05-06*

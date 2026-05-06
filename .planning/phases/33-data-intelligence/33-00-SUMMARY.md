---
phase: 33-data-intelligence
plan: "00"
subsystem: testing
tags: [vitest, test-stubs, nyquist, tdd, wave-0]

# Dependency graph
requires:
  - phase: 31-focus-projects-panels
    provides: CurrentFocusCard v2 with photo wiring (DATA-06 depends on it)
  - phase: 32-army-readiness
    provides: Phase 32 complete; Phase 33 can now execute
provides:
  - Wave 0 test stub infrastructure for all DATA requirements (DATA-02 through DATA-06)
  - tests/dashboard/useLogSessionWithStatus.test.ts — DATA-02 cache invalidation stubs
  - tests/painting/recipeDetailSheet.test.ts — DATA-05 unit link navigation stubs
  - Extended tests/dashboard/CurrentFocusCard.test.ts with DATA-06 recipe display stubs
  - Extended tests/spending/SpendingPage.test.tsx with DATA-03/04 spending metrics stubs
affects:
  - 33-01 (LogSessionSheet status update — DATA-02 implementation)
  - 33-02 (RecipeDetailSheet unit link — DATA-05 implementation)
  - 33-03 (CurrentFocusCard recipe display + SpendingPage metrics — DATA-06/03/04)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 test stubs: it.todo() placeholders declare expected behaviors before components exist"
    - "Stub files use only `import { describe, it } from 'vitest'` — no component imports that don't exist yet"

key-files:
  created:
    - tests/dashboard/useLogSessionWithStatus.test.ts
    - tests/painting/recipeDetailSheet.test.ts
  modified:
    - tests/dashboard/CurrentFocusCard.test.ts
    - tests/spending/SpendingPage.test.tsx

key-decisions:
  - "Stub files intentionally omit component imports — components do not exist yet; Plan 01-03 executors add imports when implementing"
  - "Pre-existing timing failure in recentActivityQuery.test.ts is out-of-scope and not fixed (scope boundary rule)"

patterns-established:
  - "Wave 0 stub pattern: pure describe/it.todo without any component or hook imports when target code doesn't exist yet"

requirements-completed: [DATA-02, DATA-03, DATA-04, DATA-05, DATA-06]

# Metrics
duration: 3min
completed: "2026-05-06"
---

# Phase 33 Plan 00: Data Intelligence Wave 0 Test Stubs Summary

**Four test files scaffolded with it.todo() stubs covering all DATA-02 through DATA-06 behaviors — two new files created, two existing files extended**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-06T08:28:01Z
- **Completed:** 2026-05-06T08:30:46Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- Created `tests/dashboard/useLogSessionWithStatus.test.ts` with 14 todo stubs covering DATA-02: cache invalidation after session + status submit, partial failure handling, and 8 specific cache key invalidations
- Created `tests/painting/recipeDetailSheet.test.ts` with 5 todo stubs covering DATA-05: linked unit Button render and no-linked-unit fallback
- Extended `tests/dashboard/CurrentFocusCard.test.ts` with 5 DATA-06 stubs for recipe name display, null/undefined handling, and +N more suffix
- Extended `tests/spending/SpendingPage.test.tsx` with 4 DATA-03/04 stubs for spending intelligence metric cards

## Task Commits

1. **Task 1: Wave 0 test stubs for DATA-02, DATA-03/04, DATA-05, DATA-06** - `34ea3cc` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `tests/dashboard/useLogSessionWithStatus.test.ts` - DATA-02 cache invalidation behavior stubs (14 todos)
- `tests/painting/recipeDetailSheet.test.ts` - DATA-05 unit link navigation stubs (5 todos)
- `tests/dashboard/CurrentFocusCard.test.ts` - Extended with DATA-06 recipe display stubs (5 new todos)
- `tests/spending/SpendingPage.test.tsx` - Extended with DATA-03/04 spending metrics stubs (4 new todos)

## Decisions Made

- Stub files intentionally omit component imports — components do not exist yet; Plan 01-03 executors add real imports when implementing. This follows the pattern established in Phase 31 (31-00 decision).
- Pre-existing timing failure in `recentActivityQuery.test.ts` (timing assertion expects <25ms, occasionally gets 30ms) is out-of-scope and deferred per scope boundary rules.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

One pre-existing flaky test in `tests/dashboard/recentActivityQuery.test.ts` produced a timing assertion failure (`expected 30 to be less than 25`). This is not caused by this plan's changes and is logged to deferred items. The four target test files all ran cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 test infrastructure is in place for all DATA requirements
- Plans 33-01, 33-02, and 33-03 can now reference these stub files and fill in implementations
- `pnpm test -- tests/dashboard/useLogSessionWithStatus.test.ts` runs cleanly (14 todos skipped)
- `pnpm test -- tests/painting/recipeDetailSheet.test.ts` runs cleanly (5 todos skipped)
- `pnpm test -- tests/dashboard/CurrentFocusCard.test.ts` runs cleanly (Phase 31 + DATA-06 todos all skipped)
- `pnpm test -- tests/spending/SpendingPage.test.tsx` runs cleanly (Phase 14 existing tests pass, 4 new todos skipped)

---
*Phase: 33-data-intelligence*
*Completed: 2026-05-06*

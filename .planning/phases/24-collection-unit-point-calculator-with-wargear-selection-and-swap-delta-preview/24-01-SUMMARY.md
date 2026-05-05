---
phase: 24-collection-unit-point-calculator-with-wargear-selection-and-swap-delta-preview
plan: "01"
subsystem: testing
tags: [vitest, tdd, nyquist, wave-0, unit-points, loadouts, wargear, delta-preview]

# Dependency graph
requires: []
provides:
  - "Wave 0 test stubs for TIER-01, TIER-02, TIER-03 (unit_point_tiers CRUD)"
  - "Wave 0 test stubs for LOAD-01, LOAD-02, LOAD-03 (unit_loadouts CRUD + wargear)"
  - "Wave 0 test stub for DELTA-01 (computeDelta pure function)"
affects:
  - 24-02 (fills TODO(24-02) stubs with implementation)
  - 24-03
  - 24-04

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 stub pattern: describe.skip + it.skip with TODO(24-0N) comments pointing to implementing plan"

key-files:
  created:
    - tests/collection/unitPointTierQueries.test.ts
    - tests/collection/unitLoadoutQueries.test.ts
    - tests/army-list/deltaPreview.test.ts
  modified: []

key-decisions:
  - "Wave 0 stubs use describe.skip at the top level so all nested it.skip blocks are collected as skipped (not errored) by Vitest"
  - "TODO(24-02) annotations in every stub body make the implementing plan explicit and grep-able"

patterns-established:
  - "Wave 0 stub pattern: import vitest primitives, describe.skip wrapper, it.skip per behavior, TODO(24-0N) annotation naming the implementing plan"

requirements-completed:
  - TIER-01
  - TIER-02
  - TIER-03
  - LOAD-01
  - LOAD-02
  - LOAD-03
  - DELTA-01

# Metrics
duration: 3min
completed: "2026-05-05"
---

# Phase 24 Plan 01: Test Stubs Summary

**16 Wave 0 it.skip stubs across 3 files establishing the full behavioral contract for unit point tiers, loadouts, wargear, and delta preview before any production code is written**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-05T18:14:03Z
- **Completed:** 2026-05-05T18:17:15Z
- **Tasks:** 2
- **Files modified:** 3 (all created)

## Accomplishments
- Created 5 it.skip stubs in unitPointTierQueries.test.ts covering TIER-01 (upsert new, upsert replace), TIER-02 (get sorted, get empty), TIER-03 (delete)
- Created 7 it.skip stubs in unitLoadoutQueries.test.ts covering LOAD-01 (get with wargear, get empty), LOAD-02 (activate with deactivate-all), LOAD-03 (create, delete, add wargear, remove wargear)
- Created 4 it.skip stubs in deltaPreview.test.ts covering DELTA-01 (positive delta, negative delta, zero, null candidate)
- Full test suite passes at 628 tests + 18 skipped (exit 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create test stubs for unitPointTierQueries and unitLoadoutQueries** - `a15b98c` (test)
2. **Task 2: Create test stubs for deltaPreview pure function** - `6ace15a` (test)

**Plan metadata:** _(final docs commit — see below)_

## Files Created/Modified
- `tests/collection/unitPointTierQueries.test.ts` - Wave 0 stubs for TIER-01, TIER-02, TIER-03 (5 it.skip)
- `tests/collection/unitLoadoutQueries.test.ts` - Wave 0 stubs for LOAD-01, LOAD-02, LOAD-03 (7 it.skip)
- `tests/army-list/deltaPreview.test.ts` - Wave 0 stubs for DELTA-01 (4 it.skip)

## Decisions Made
- Used `describe.skip` at the outer level rather than skipping each `it` individually — this is the established Wave 0 pattern from Phase 10, keeps the file scannable and prevents any accidental execution before implementation
- TODO(24-02) comment in every stub body makes the implementing plan explicit and grep-able across the codebase

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 requirement contracts (TIER-01..03, LOAD-01..03, DELTA-01) are encoded as skipped tests
- Plan 24-02 can now implement production code + un-skip each stub to turn it GREEN
- Plans 24-03 and 24-04 have clear behavioral targets from these stubs

---
*Phase: 24-collection-unit-point-calculator-with-wargear-selection-and-swap-delta-preview*
*Completed: 2026-05-05*

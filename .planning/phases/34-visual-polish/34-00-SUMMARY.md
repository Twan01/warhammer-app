---
phase: 34-visual-polish
plan: 00
subsystem: testing
tags: [vitest, react-testing-library, dashboard, FactionSummaryCard, VIS-01, VIS-02]

# Dependency graph
requires:
  - phase: 33-data-intelligence
    provides: completed DashboardPage tests and FactionSummaryCard component
provides:
  - VIS-01 test stubs for FactionSummaryCard visual changes (top band, width, Star removal, active glow, hover shadow)
  - VIS-02 test stub for DashboardPage hero gradient wrapper
affects: [34-visual-polish plan-01]

# Tech tracking
tech-stack:
  added: []
  patterns: [Wave 0 stub pattern — async findBy queries for TanStack Router + renderWithRouter helper]

key-files:
  created:
    - tests/dashboard/FactionSummaryCard.test.tsx
  modified:
    - tests/dashboard/DashboardPage.test.tsx

key-decisions:
  - "FactionSummaryCard tests use renderWithRouter with full TanStack Router tree + async findByRole/findByText — avoids useNavigate mock conflict"
  - "All 6 VIS-01 stubs intentionally fail; correct failure messages confirm assertions target the right behavior"

patterns-established:
  - "Wave 0 stub pattern: async tests with findBy queries so TanStack Router has time to hydrate before assertions"

requirements-completed: [VIS-01, VIS-02]

# Metrics
duration: 15min
completed: 2026-05-06
---

# Phase 34 Plan 00: Visual Polish Wave 0 Test Stubs Summary

**6 VIS-01 stubs for FactionSummaryCard (top band, min-w-[220px], Star removal, active glow, hover shadow) + 1 VIS-02 stub for DashboardPage hero radial-gradient wrapper**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-06T08:45:00Z
- **Completed:** 2026-05-06T09:00:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `tests/dashboard/FactionSummaryCard.test.tsx` with 6 VIS-01 test stubs covering all planned visual changes
- Added 1 VIS-02 test to `tests/dashboard/DashboardPage.test.tsx` asserting the hero radial-gradient wrapper
- All 8 pre-existing DashboardPage tests continue to pass unchanged
- All 6 VIS-01 stubs fail for the correct reasons (current component lacks each target feature)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FactionSummaryCard test stubs for VIS-01** - `26fd9fd` (test)
2. **Task 2: Add VIS-02 hero gradient assertion to DashboardPage test** - `afaa5e3` (test)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `tests/dashboard/FactionSummaryCard.test.tsx` - 6 VIS-01 test stubs using renderWithRouter helper with async findBy queries
- `tests/dashboard/DashboardPage.test.tsx` - +20 lines: new VIS-02 test asserting `[style*='radial-gradient']` and `col-span-full`

## Decisions Made

- FactionSummaryCard tests use a `renderWithRouter` helper with a real TanStack Router tree rather than mocking `useNavigate` — mocking the router hook conflicts with `RouterProvider` being present and causes empty DOM renders. Async `findByRole`/`findByText` waits for router hydration.
- `vi.mock('@tanstack/react-router')` was removed after discovering it caused `<div />` empty renders when combined with `RouterProvider`. This matches the pattern already used in `DashboardPage.test.tsx`.

## Deviations from Plan

None — plan executed exactly as written, with one minor approach adjustment (async `findBy` queries and no `useNavigate` mock) that is consistent with existing dashboard test patterns.

## Issues Encountered

Initial version of tests used `vi.mock('@tanstack/react-router', ...)` to mock `useNavigate`, which produced empty `<body><div /></body>` DOM because TanStack Router's `RouterProvider` does not render children synchronously. Fixed by removing the router mock and using async `findBy` queries to wait for router hydration — the same pattern already used by `DashboardPage.test.tsx`.

## Next Phase Readiness

- Plan 34-01 executor has 7 automated verification targets: 6 for VIS-01 (FactionSummaryCard changes) and 1 for VIS-02 (DashboardPage hero gradient)
- No blockers — all stubs compile and run

---
*Phase: 34-visual-polish*
*Completed: 2026-05-06*

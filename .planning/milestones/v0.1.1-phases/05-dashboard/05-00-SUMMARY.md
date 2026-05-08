---
phase: 05-dashboard
plan: "00"
subsystem: testing
tags: [vitest, typescript, pure-functions, dashboard, aggregation]

# Dependency graph
requires:
  - phase: 02-data-layer-entity-crud
    provides: Unit and Faction TypeScript interfaces (src/types/unit.ts, src/types/faction.ts)
  - phase: 04-painting-module
    provides: pure-function module pattern (kanbanUtils), test fixture builder pattern (u() helper)
provides:
  - computeStats(units, factions): ComputedDashboardStats — pure aggregation function for all dashboard metrics
  - formatRelativeTime(sqliteDatetime): string — manual 5-case relative time formatter
  - STATUS_ABBR: Record<PaintingStatus, string> — short label map for list rows
  - 22 passing tests for computeStats (DASH-01..06, DASH-08)
  - 15 passing tests for formatRelativeTime (all 5 time ranges + SQLite normalization)
  - Wave-0 DashboardPage stub (2 it.skip stubs for plan 05-02)
affects:
  - 05-01 (DashboardQuery hook — consumes computeStats and ComputedDashboardStats type)
  - 05-02 (DashboardPage assembly — consumes computeStats, formatRelativeTime, STATUS_ABBR)
  - 05-03 (empty state — DASH-08 hasUnits already implemented in computeStats)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixture builder pattern: u(over) and f(over) helpers with spread defaults for test data construction"
    - "vi.useFakeTimers + vi.setSystemTime for deterministic time-dependent tests"
    - "Wave-0 stub pattern: it.skip stubs with VALIDATION.md -t filter names for deferred component tests"

key-files:
  created:
    - src/features/dashboard/computeStats.ts
    - src/features/dashboard/relativeTime.ts
    - src/features/dashboard/statusAbbr.ts
    - tests/dashboard/computeStats.test.ts
    - tests/dashboard/relativeTime.test.ts
    - tests/dashboard/DashboardPage.test.tsx

key-decisions:
  - "05-00: computeStats returns factionStats for all factions (even with zero units) to avoid NaN on divide-by-zero — guarded with fUnits.length > 0 check"
  - "05-00: SQLite datetime normalization in formatRelativeTime: replace space with T and append Z to force UTC parsing (Pitfall 5)"
  - "05-00: computeStats empty-path (units.length === 0) produces zero factionStats entries with paintedPct=0 even when factions exist"

patterns-established:
  - "Dashboard aggregation: all stat derivations live in computeStats.ts — DashboardPage consumes result verbatim with no inline math"
  - "Relative time: manual 5-case formatter (no external library) — rules locked by UI-SPEC"

requirements-completed:
  - DASH-01
  - DASH-02
  - DASH-03
  - DASH-04
  - DASH-05
  - DASH-06
  - DASH-08

# Metrics
duration: 5min
completed: 2026-05-01
---

# Phase 5 Plan 00: Dashboard Wave-0 Foundation Summary

**Pure aggregation layer for the dashboard: computeStats with 22 tests (DASH-01..08), formatRelativeTime with 15 tests (5 time ranges + SQLite normalization), STATUS_ABBR map, and Wave-0 DashboardPage stub**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-01T08:54:11Z
- **Completed:** 2026-05-01T08:58:51Z
- **Tasks:** 3 completed
- **Files modified:** 6 created

## Accomplishments

- Created three pure TypeScript modules under `src/features/dashboard/` with exact signatures from the plan interfaces block — no React, no DB imports
- Covered all 7 DASH requirement groups (DASH-01 through DASH-06 and DASH-08) with 22 passing unit tests in `computeStats.test.ts`
- Covered all 5 relative time ranges plus SQLite space-separator normalization with 15 passing tests in `relativeTime.test.ts`
- Established Wave-0 DashboardPage stub with 2 `it.skip` entries matched to plan 05-02 `-t` filter strings

## Task Commits

1. **Task 1: Create three pure modules (computeStats, relativeTime, statusAbbr)** - `a4ad10d` (feat)
2. **Task 2: Write computeStats unit tests (DASH-01..06, DASH-08)** - `06deba3` (test)
3. **Task 3: Write relativeTime tests + DashboardPage Wave-0 stub** - `a99ed42` (test)

## Files Created/Modified

- `src/features/dashboard/computeStats.ts` — Pure aggregation: ComputedDashboardStats, FactionStat interfaces + computeStats() function
- `src/features/dashboard/relativeTime.ts` — formatRelativeTime() with 5-range logic and SQLite UTC normalization
- `src/features/dashboard/statusAbbr.ts` — STATUS_ABBR Record<PaintingStatus, string> with 11 entries
- `tests/dashboard/computeStats.test.ts` — 22 tests: DASH-08, DASH-01, DASH-03, DASH-04, DASH-05, DASH-06, DASH-02
- `tests/dashboard/relativeTime.test.ts` — 15 tests: minutes, hours, days, weeks, months, SQLite normalization
- `tests/dashboard/DashboardPage.test.tsx` — Wave-0 stub: 2 it.skip awaiting plan 05-02

## Decisions Made

- `computeStats` empty-path when `units.length === 0` still maps factions to factionStats entries with `paintedPct=0` to avoid NaN (divide-by-zero guard)
- `formatRelativeTime` applies `.replace(" ", "T") + "Z"` normalization to force UTC parsing of SQLite `datetime('now')` output (Pitfall 5)
- All three modules are pure — zero React, TanStack Query, or DB imports — enabling unit testing without mocking infrastructure

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

One pre-existing test failure in `tests/painting/KanbanBoard.test.tsx > PROJ-02` was observed. This test was failing due to unstaged changes in `src/features/painting-projects/KanbanBoard.tsx` that existed before this plan started (visible in the git status at conversation start). This plan did not modify KanbanBoard.tsx and did not cause the regression. Logged as out-of-scope pre-existing issue.

## Next Phase Readiness

- Plans 05-01 and 05-02 can consume `computeStats`, `formatRelativeTime`, and `STATUS_ABBR` directly via `@/features/dashboard/*` imports
- `ComputedDashboardStats` and `FactionStat` interfaces are exported and ready for the DashboardQuery hook (plan 05-01)
- `DashboardPage.test.tsx` stub is ready for plan 05-02 to fill in the `it.skip` bodies

---
*Phase: 05-dashboard*
*Completed: 2026-05-01*

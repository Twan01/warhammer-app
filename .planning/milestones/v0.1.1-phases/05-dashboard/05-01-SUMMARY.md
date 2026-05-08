---
phase: 05-dashboard
plan: 01
subsystem: database
tags: [tanstack-query, sqlite, react-query, dashboard, tauri-plugin-sql]

# Dependency graph
requires:
  - phase: 05-dashboard/05-00
    provides: computeStats pure function + ComputedDashboardStats type
  - phase: 02-data-layer-entity-crud/02-02
    provides: useUnits mutations with ["dashboard-stats"] invalidation pre-wired (DATA-09)

provides:
  - getDashboardStats() query: parallel SELECT units + factions via Promise.all
  - DashboardStats interface: raw { units: Unit[]; factions: Faction[] }
  - DASHBOARD_STATS_KEY = ["dashboard-stats"] as const
  - useDashboardStats() hook returning UseQueryResult<ComputedDashboardStats, Error>
  - Cache-key contract test (DASH-07 regression protection)

affects:
  - 05-02-dashboard-ui (consumes useDashboardStats directly)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parallel DB fetch: Promise.all([db.select(units), db.select(factions)]) — minimizes dashboard query latency"
    - "Query key as exported const: DASHBOARD_STATS_KEY = [...] as const — enables typed invalidation and contract testing"
    - "TDD RED→GREEN: test stub committed first, implementation committed once tests pass"

key-files:
  created:
    - src/db/queries/dashboard.ts
    - src/hooks/useDashboardStats.ts
    - tests/dashboard/useDashboardStats.test.ts
  modified: []

key-decisions:
  - "05-01: DASHBOARD_STATS_KEY wires to pre-existing useUnits invalidation without any changes to useUnits.ts (DATA-09 forward-compat decision 02-02 paid off)"
  - "05-01: getDashboardStats fetches raw rows only — no SQL aggregation; all math stays in computeStats (pure, testable)"

patterns-established:
  - "Cache-key contract test: export query key as const, test literal equality — catches renames before they break invalidation chains"

requirements-completed: [DASH-07]

# Metrics
duration: 5min
completed: 2026-05-01
---

# Phase 05 Plan 01: Dashboard Data Layer Summary

**getDashboardStats parallel query + useDashboardStats TanStack hook with DASH-07 cache-key contract test wiring ["dashboard-stats"] to existing useUnits invalidations**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-01T11:01:24Z
- **Completed:** 2026-05-01T11:06:00Z
- **Tasks:** 1 (TDD: 2 commits — RED test, GREEN implementation)
- **Files modified:** 3

## Accomplishments

- Created `getDashboardStats()` query that fetches units and factions in parallel via `Promise.all` with no SQL aggregation — mirrors established query module pattern
- Created `useDashboardStats()` TanStack Query hook exporting `DASHBOARD_STATS_KEY = ["dashboard-stats"] as const`; queryFn pipes raw rows through `computeStats()`
- Verified (read-only) that all 3 useUnits mutations (lines 33, 46, 58) still invalidate `["dashboard-stats"]` — DATA-09 forward-compat from decision 02-02 activates automatically
- Cache-key contract test ensures DASH-07 freshness guarantee is regression-protected: if `DASHBOARD_STATS_KEY` is renamed, the test fails before production breakage

## Task Commits

Each task was committed atomically using TDD flow:

1. **RED: Cache-key contract test** - `0419f0d` (test)
2. **GREEN: getDashboardStats + useDashboardStats implementation** - `f7cf850` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD task split into 2 commits — test (RED) then implementation (GREEN)_

## Files Created/Modified

- `src/db/queries/dashboard.ts` — getDashboardStats(): Promise<DashboardStats>; DashboardStats interface; parallel SELECT via Promise.all
- `src/hooks/useDashboardStats.ts` — DASHBOARD_STATS_KEY constant; useDashboardStats() hook returning UseQueryResult<ComputedDashboardStats, Error>
- `tests/dashboard/useDashboardStats.test.ts` — 2 contract tests asserting DASHBOARD_STATS_KEY equals ["dashboard-stats"] literal (DASH-07)

## Decisions Made

- No changes to `useUnits.ts` — the 3 invalidation lines added in plan 02-02 are already present at lines 33, 46, and 58. Zero wiring cost.
- `getDashboardStats` issues plain `SELECT * FROM units` and `SELECT * FROM factions` (no ORDER BY needed — computeStats sorts in JS for active projects and recentlyUpdated).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 05-02 (DashboardPage UI) can import `useDashboardStats` and receive `ComputedDashboardStats` directly — no further data-layer work needed
- Cache contract is enforced by automated test; future renames will be caught immediately
- All 110 tests pass; 2 DashboardPage stubs remain skipped (to be filled by 05-02)

### Type signatures for 05-02 consumption

```typescript
// src/db/queries/dashboard.ts
export interface DashboardStats { units: Unit[]; factions: Faction[]; }
export async function getDashboardStats(): Promise<DashboardStats>;

// src/hooks/useDashboardStats.ts
export const DASHBOARD_STATS_KEY: readonly ["dashboard-stats"];
export function useDashboardStats(): UseQueryResult<ComputedDashboardStats, Error>;
```

---
*Phase: 05-dashboard*
*Completed: 2026-05-01*

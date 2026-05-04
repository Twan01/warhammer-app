---
phase: 26-dashboard-redesign
plan: 01
subsystem: dashboard
tags: [react-query, sqlite, pure-functions, tdd, typescript]

# Dependency graph
requires:
  - phase: 26-00
    provides: 21 Wave 0 it.skip test stubs for DASH-04 and DASH-06 contracts

provides:
  - ComputedDashboardStats.units field (same-reference pass-through, no copy)
  - computeRecentActivity() pure function merging unit/session/battle events into ActivityEvent[] sorted DESC
  - getNextActionHint() lookup exhaustive over all 11 PaintingStatus values
  - getRecentActivity() SQL query: 2 parallel SELECTs via Promise.all, LIMIT 20 each
  - useRecentActivity() React Query hook (query key ["recent-activity"], enabled guard)
  - ["recent-activity"] invalidation in useCreatePaintingSession + 3 battle log mutations

affects: [26-02, 26-03, 26-04, 26-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ActivityEvent[] feed: stable id prefixes (unit-added-N, session-logged-N, battle-logged-N) for React reconciliation"
    - "Session date normalization: YYYY-MM-DD appended with 23:59:59 for correct chronological sort vs datetime strings (Pitfall 4)"
    - "enabled: units !== undefined guard on useRecentActivity — no query fires until DashboardPage has data"

key-files:
  created:
    - src/features/dashboard/computeRecentActivity.ts
    - src/features/dashboard/getNextActionHint.ts
    - src/hooks/useRecentActivity.ts
  modified:
    - src/features/dashboard/computeStats.ts
    - src/db/queries/dashboard.ts
    - src/hooks/useJournalSessions.ts
    - src/hooks/useBattleLogs.ts
    - tests/dashboard/computeStats.test.ts
    - tests/dashboard/computeRecentActivity.test.ts
    - tests/dashboard/recentActivityQuery.test.ts

key-decisions:
  - "units field on ComputedDashboardStats passes same array reference (no copy/sort) — Wave 2 UI can use it directly as the ActivityEvent source without extra memoization"
  - "session_date normalized to 23:59:59 end-of-day: sessions appear after same-day battles in DESC sort, consistent with treating a session as an end-of-day activity"
  - "useRecentActivity enabled guard: units !== undefined (not !units) — empty array is valid and must not suppress the query"
  - "Invalidation added only to useCreatePaintingSession (not useDeletePaintingSession) — dashboard unit_added/unit_updated events refresh via dashboard-stats invalidation on unit mutations, no duplicate wiring needed"

patterns-established:
  - "ActivityEvent id: '{type}-{id}' prefix pattern ensures stable React keys across event types"
  - "Pitfall 4 normalization documented as file-level JSDoc in computeRecentActivity.ts for future maintainers"

requirements-completed: [DASH-03, DASH-04, DASH-06]

# Metrics
duration: 10min
completed: 2026-05-04
---

# Phase 26 Plan 01: Dashboard Data Layer Summary

**React Query data layer for dashboard: units field on ComputedDashboardStats, ActivityEvent[] feed via computeRecentActivity, getRecentActivity SQL, useRecentActivity hook, and invalidation wiring across 4 mutations — all 21 Wave 0 stubs green**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-04T20:23:13Z
- **Completed:** 2026-05-04T20:33:36Z
- **Tasks:** 3
- **Files modified:** 10 (3 created, 7 modified)

## Accomplishments
- Extended ComputedDashboardStats with `units: Unit[]` field (same reference, no copy) enabling Wave 2 HobbyPipeline consumption
- Created `computeRecentActivity()` pure function merging 4 event types (unit_added, unit_updated, session_logged, battle_logged) with Pitfall 4 session normalization and DESC timestamp sort
- Created `getNextActionHint()` with exhaustive Record<PaintingStatus, string> lookup across all 11 statuses
- Added `getRecentActivity()` SQL with 2 parallel SELECTs (painting_sessions JOIN units, battle_logs) via Promise.all
- Shipped `useRecentActivity` hook with `["recent-activity"]` query key and `enabled: units !== undefined` gate
- Wired `["recent-activity"]` invalidation into useCreatePaintingSession + useCreateBattleLog + useUpdateBattleLog + useDeleteBattleLog
- Flipped all 21 Wave 0 it.skip stubs to it() — all 21 pass green (415 total tests passing, 0 failed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add units field to ComputedDashboardStats + flip 3 stubs** - `1bf4844` (feat)
2. **Task 2: Create computeRecentActivity + getNextActionHint + flip 13 stubs** - `81e80d1` (feat)
3. **Task 3: Add getRecentActivity SQL + useRecentActivity hook + invalidation wiring + flip 5 stubs** - `d8206a0` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/features/dashboard/computeStats.ts` - Added `units: Unit[]` to interface and both return branches
- `src/features/dashboard/computeRecentActivity.ts` - New: pure function merging unit/session/battle events; session normalization; DESC sort; slice to limit
- `src/features/dashboard/getNextActionHint.ts` - New: Record<PaintingStatus, string> lookup for 11 statuses
- `src/db/queries/dashboard.ts` - Appended getRecentActivity() with RecentActivityResult interface; 2 parallel SELECTs LIMIT 20
- `src/hooks/useRecentActivity.ts` - New: React Query hook, queryKey ["recent-activity"], enabled guard
- `src/hooks/useJournalSessions.ts` - Added ["recent-activity"] invalidation in useCreatePaintingSession.onSuccess
- `src/hooks/useBattleLogs.ts` - Added ["recent-activity"] invalidation to all 3 battle log mutations
- `tests/dashboard/computeStats.test.ts` - Flipped 3 DASH-04 it.skip stubs to it(), uncommented assertions
- `tests/dashboard/computeRecentActivity.test.ts` - Flipped 13 it.skip stubs, uncommented assertions, activated import
- `tests/dashboard/recentActivityQuery.test.ts` - Flipped 5 it.skip stubs, uncommented assertions, activated import

## Decisions Made
- `units: Unit[]` passes same array reference (no copy/sort) — Wave 2 can use it directly as ActivityEvent source without extra memoization
- Session date normalized to `${session_date} 23:59:59` for end-of-day treatment, ensuring sessions appear after same-day battles in DESC sort
- `enabled: units !== undefined` (not `!units`) — empty array is valid and must not suppress the query
- Invalidation wired only to useCreatePaintingSession; useDeletePaintingSession excluded — unit event refresh already flows through dashboard-stats invalidation on unit mutations

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None. The test file for computeRecentActivity was reverted by an automated process after the first Edit attempt; resolved by using Write tool for a complete file rewrite.

## Wave 2 Readiness Checklist

All data layer contracts available for Wave 2 UI components:

- [x] `ComputedDashboardStats.units: Unit[]` — same reference, no sort
- [x] `computeRecentActivity(units, sessions, battles, limit?)` → `ActivityEvent[]`
- [x] `ActivityEvent.id` — stable string key for React reconciliation
- [x] `ActivityEvent.type` — union "unit_added" | "unit_updated" | "session_logged" | "battle_logged"
- [x] `getNextActionHint(status: PaintingStatus)` → string
- [x] `useRecentActivity(units: Unit[] | undefined)` → `UseQueryResult<ActivityEvent[]>`
- [x] `RECENT_ACTIVITY_KEY` exported for cache key access
- [x] Auto-invalidation on session create and all battle log mutations

## Self-Check: PASSED

All 8 files confirmed present on disk. All 3 task commits confirmed in git log:
- `1bf4844` feat(26-01): add units field to ComputedDashboardStats
- `81e80d1` feat(26-01): create computeRecentActivity + getNextActionHint pure functions
- `d8206a0` feat(26-01): add getRecentActivity SQL + useRecentActivity hook + invalidation wiring

---
*Phase: 26-dashboard-redesign*
*Completed: 2026-05-04*

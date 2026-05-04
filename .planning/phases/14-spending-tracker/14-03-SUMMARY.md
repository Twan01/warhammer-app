---
phase: 14-spending-tracker
plan: "03"
subsystem: ui
tags: [react, tanstack-query, sqlite, lucide-react, vitest]

# Dependency graph
requires:
  - phase: 14-spending-tracker/14-01
    provides: purchase_price_pence columns on units + paints, formatCurrency utility
  - phase: 14-spending-tracker/14-02
    provides: 6-hook spending-stats invalidation (useUnits + usePaints mutations)
provides:
  - getSpendingStats() SQL query (parallel SELECT units + factions + COALESCE SUM paints)
  - computeSpendingStats() pure aggregation function (FactionSpend[] + totalPence + paintsPence)
  - useSpendingStats() TanStack Query hook + SPENDING_STATS_KEY = ["spending-stats"] constant
  - SpendingPage component (hero card + breakdown table, loading/error branches)
  - /spending route registered in TanStack Router routeTree
  - Spending nav entry with Wallet icon between Paints and Army Lists in AppSidebar
affects:
  - 14-spending-tracker/14-04 (manual smoke-test gate — Spending page now exists to test)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - query-pure-fn-hook triad pattern (mirrors dashboard.ts / computeStats.ts / useDashboardStats.ts verbatim)
    - SPENDING_STATS_KEY cache-key contract — single constant ensures 6-hook invalidation chain coherence

key-files:
  created:
    - src/db/queries/spending.ts
    - src/features/spending/computeSpendingStats.ts
    - src/hooks/useSpendingStats.ts
    - src/features/spending/SpendingPage.tsx
    - src/app/spending/page.tsx
  modified:
    - src/app/router.tsx
    - src/components/common/AppSidebar.tsx
    - tests/spending/computeSpendingStats.test.ts
    - tests/spending/useSpendingStats.test.ts
    - tests/spending/SpendingPage.test.tsx
    - tests/theming/AppSidebar.test.tsx

key-decisions:
  - "SPENDING_STATS_KEY = ['spending-stats'] as const installed in useSpendingStats.ts — exact same literal the 6 mutation hooks invalidate (Pitfall 2 from Plan 14-02)"
  - "COALESCE(SUM(purchase_price_pence), 0) in SQL paint query guards against NULL on empty paints table (Pitfall 5)"
  - "SpendingPage hero card uses ring-2 ring-faction-accent — only faction-themed element per UI-SPEC"
  - "AppSidebar test EXTENDED (not replaced) — new describe block added inside existing top-level describe to share beforeEach localStorage.clear()"

patterns-established:
  - "query-pure-fn-hook triad: spending.ts (SQL) / computeSpendingStats.ts (pure math) / useSpendingStats.ts (TanStack Query) — mirrors dashboard triad exactly"
  - "Thin re-export wrapper: src/app/spending/page.tsx mirrors src/app/dashboard/page.tsx pattern"

requirements-completed: [SPEND-03, SPEND-04]

# Metrics
duration: 7min
completed: 2026-05-04
---

# Phase 14 Plan 03: SpendingPage — end-to-end Spending page with SQL query, pure aggregation, TanStack hook, hero card + faction breakdown table, route + sidebar nav

**Spending page wired end-to-end: SQL query module (COALESCE SUM), pure computeSpendingStats function, SPENDING_STATS_KEY contract hook, SpendingPage (hero + breakdown table), /spending route, Wallet sidebar nav — 13 Wave-0 stubs flipped, 279 tests passing**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-04T07:24:28Z
- **Completed:** 2026-05-04T07:32:05Z
- **Tasks:** 3
- **Files modified:** 11 (5 created, 6 modified)

## Accomplishments
- Created the full query-pure-fn-hook triad: `getSpendingStats()` with COALESCE SUM guard, `computeSpendingStats()` pure function, `useSpendingStats()` with `SPENDING_STATS_KEY = ["spending-stats"] as const`
- Built `SpendingPage` with hero card (`ring-2 ring-faction-accent`), faction breakdown table (all factions always shown at £0.00), separate Paints row, loading skeleton with `aria-label="Loading spending data"`, inline error message
- Registered `/spending` route in TanStack Router and added `Spending` nav entry (Wallet icon) between Paints and Army Lists in AppSidebar
- Flipped all 13 Wave-0 stub bodies to passing assertions (6 computeSpendingStats + 2 useSpendingStats + 5 SpendingPage) and EXTENDED AppSidebar test with 2 new SPEND-03 assertions — 279 passing, 0 skipped, 0 failed

## Task Commits

Each task was committed atomically:

1. **Task 1: Create spending query + pure aggregation + useSpendingStats hook + flip 8 test stubs** - `8340467` (feat)
2. **Task 2: Build SpendingPage component + thin route wrapper + flip 5 SpendingPage test stubs** - `e135951` (feat)
3. **Task 3: Register /spending route + add Spending sidebar nav entry + extend AppSidebar test** - `c2513f9` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `src/db/queries/spending.ts` - getSpendingStats() with parallel Promise.all; COALESCE(SUM(...), 0) for paint pence (Pitfall 5)
- `src/features/spending/computeSpendingStats.ts` - pure aggregation: FactionSpend[] per faction + orphan handling + totalPence = units + paints
- `src/hooks/useSpendingStats.ts` - TanStack Query hook; SPENDING_STATS_KEY = ["spending-stats"] as const contract
- `src/features/spending/SpendingPage.tsx` - hero card (ring-2 ring-faction-accent) + Breakdown table + 3-branch render (loading/error/data)
- `src/app/spending/page.tsx` - thin re-export wrapper mirroring dashboard/page.tsx
- `src/app/router.tsx` - spendingRoute registered between armyListsRoute and settingsRoute
- `src/components/common/AppSidebar.tsx` - Wallet imported from lucide-react; Spending nav entry after Paints, before Army Lists
- `tests/spending/computeSpendingStats.test.ts` - 6 it.skip stubs → real passing assertions with u()/f() builder fixtures
- `tests/spending/useSpendingStats.test.ts` - 2 it.skip stubs → real passing assertions (cache-key contract)
- `tests/spending/SpendingPage.test.tsx` - 5 it.skip stubs → real passing assertions (vi.mock + QueryClientProvider pattern)
- `tests/theming/AppSidebar.test.tsx` - EXTENDED: new "Spending nav entry (SPEND-03)" describe block; existing UI-01 tests untouched

## Decisions Made
- SPENDING_STATS_KEY installed as `["spending-stats"] as const` — exact match for the 6 mutation hook invalidations added in Plan 14-02; cache-key contract test guards against future renames
- COALESCE(SUM(purchase_price_pence), 0) in SQL query prevents NULL return when paints table is empty (Pitfall 5)
- AppSidebar test extended via nested describe inside existing top-level describe — shares the `beforeEach(() => localStorage.clear())` at the parent scope without replacing existing UI-01 tests

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- SPEND-03 closed: /spending route renders hero card with Total Hobby Spend + formatCurrency
- SPEND-04 closed: per-faction breakdown table (all factions, £0.00 for zero) + separate Paints row
- SPENDING_STATS_KEY contract verified by test — invalidation chain complete
- Phase 14 is feature-complete; Plan 14-04 manual smoke-test is the only remaining gate before Phase 14 ships

---
*Phase: 14-spending-tracker*
*Completed: 2026-05-04*

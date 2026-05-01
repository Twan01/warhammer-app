---
phase: 05-dashboard
verified: 2026-05-01T18:48:00Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 11/11
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 5: Dashboard Verification Report

**Phase Goal:** The dashboard answers "what do I own, what's painted, and what's ready to play" in a single view — all stat cards and faction summaries are live-computed from existing data with no new tables
**Verified:** 2026-05-01T18:48:00Z
**Status:** passed
**Re-verification:** Yes — independent re-verification of all artifacts against actual codebase

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Top stat row shows correct counts for total models, fully-painted, battle-ready points, active projects — dashboard refreshes after unit mutations | VERIFIED | `DashboardPage.tsx` line 182-185 renders 4 `<StatCard>` with live values; `useUnits.ts` lines 33, 46, 58 all invalidate `["dashboard-stats"]`; `DASHBOARD_STATS_KEY` contract test passes |
| 2 | Each faction has a summary card showing points owned/painted, painted %, model count | VERIFIED | `FactionSummaryCard.tsx` renders `{stat.modelCount} models`, `{stat.paintedPct}% painted`, `{stat.pointsOwned} pts owned / {stat.pointsPainted} pts painted`; `computeStats.ts` aggregates per-faction with divide-by-zero guard |
| 3 | Painting, assembly, and basing completion percentages are each visible and correctly calculated | VERIFIED | `DashboardPage.tsx` lines 194-196 render three `<StatCard>` with `${stats.paintingPct}%`, `${stats.assemblyPct}%`, `${stats.basingPct}%`; `computeStats.ts` uses `Math.round` with unit-length guards |
| 4 | Active projects list and recently-updated list show correct units, clicking opens UnitDetailSheet | VERIFIED | `DashboardPage.tsx` maps `stats.activeProjects` and `stats.recentlyUpdated` through `<DashboardListRow>` with `onClick={handleRowClick}`; `handleRowClick` calls `setSelectedUnitId`; `<UnitDetailSheet>` mounted as sibling with `open={selectedUnitId !== null}` |
| 5 | Empty state (pointing to Collection) appears when no units have been added | VERIFIED | `DashboardPage.tsx` line 148 branches on `!stats.hasUnits`; `DashboardEmptyState.tsx` renders "Your collection is empty" + "Go to Collection" button navigating to `/collection`; DashboardPage test asserts both strings and absence of section labels |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/dashboard/computeStats.ts` | Pure aggregation — `computeStats(units, factions)` | VERIFIED | 117 lines; exports `computeStats`, `ComputedDashboardStats`, `FactionStat`; no React/DB imports; zero-length guard on line 36; `is_active_project === 1` check on line 64 |
| `src/features/dashboard/relativeTime.ts` | `formatRelativeTime(sqliteDatetime)` | VERIFIED | 22 lines; SQLite space-to-T normalization + Z append on line 11; 5 time-range branches covering m/h/d/w/mo |
| `src/features/dashboard/statusAbbr.ts` | `STATUS_ABBR: Record<PaintingStatus, string>` | VERIFIED | 19 lines; all 11 `PAINTING_STATUS_ORDER` keys mapped to abbreviations |
| `src/db/queries/dashboard.ts` | `getDashboardStats()` parallel SELECTs, no SQL aggregation | VERIFIED | 27 lines; `Promise.all` with two `SELECT * FROM` queries; exports `DashboardStats` interface |
| `src/hooks/useDashboardStats.ts` | `useDashboardStats()` + `DASHBOARD_STATS_KEY` | VERIFIED | 27 lines; `DASHBOARD_STATS_KEY = ["dashboard-stats"] as const`; `queryFn` calls `getDashboardStats` then `computeStats` |
| `src/features/dashboard/StatCard.tsx` | Shared stat card (value + label) | VERIFIED | 29 lines; `text-3xl font-semibold` value; `text-sm text-muted-foreground` label |
| `src/features/dashboard/DashboardListRow.tsx` | Clickable row with faction badge + STATUS_ABBR + optional time | VERIFIED | 49 lines; imports `STATUS_ABBR` and `formatRelativeTime`; `min-h-[44px]`; faction badge with inline `backgroundColor` |
| `src/features/dashboard/FactionSummaryCard.tsx` | Card with color border + click-through to collection filter | VERIFIED | 58 lines; `border-l-4`; `borderLeftColor: stat.faction.color_theme`; `useCollectionFilters.setState` + `navigate({ to: "/collection" })` |
| `src/features/dashboard/DashboardEmptyState.tsx` | Empty state with CTA to Collection | VERIFIED | 21 lines; "Your collection is empty"; "Go to Collection"; `PackageSearch h-12 w-12` |
| `src/features/dashboard/DashboardPage.tsx` | Top-level page container — all 4 sections + loading/error/empty branches | VERIFIED | 274 lines; loading (Skeletons), error ("Failed to load dashboard. Try refreshing the app."), empty (`!stats.hasUnits`), populated; 3 sibling Sheet/Dialogs |
| `src/app/dashboard/page.tsx` | Route entry delegating to DashboardPage (no PlaceholderPage) | VERIFIED | 5 lines; imports real `DashboardPage`; no `PlaceholderPage` reference |
| `src/app/router.tsx` | `/` path wired to `DashboardPage` | VERIFIED | Line 26-30: `createRoute({ path: "/", component: DashboardPage })`; no PlaceholderPage at root |
| `tests/dashboard/computeStats.test.ts` | Unit tests covering DASH-01..06, DASH-08 | VERIFIED | 22 passing tests across 7 describe blocks; no `it.skip`; all DASH-* describe labels present |
| `tests/dashboard/relativeTime.test.ts` | Unit tests for `formatRelativeTime` | VERIFIED | Passes; `vi.useFakeTimers` + `vi.setSystemTime`; 5 range blocks + SQLite normalization block |
| `tests/dashboard/useDashboardStats.test.ts` | Cache-key contract test (DASH-07) | VERIFIED | 2 tests assert `DASHBOARD_STATS_KEY` literal equality and tuple length |
| `tests/dashboard/DashboardPage.test.tsx` | Integration tests — all sections, empty state, error state | VERIFIED | 3 real tests (all filled, no `it.skip`); mocks `@/db/queries/dashboard`; `screen.findByText` async assertions |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `tests/dashboard/computeStats.test.ts` | `src/features/dashboard/computeStats.ts` | `import { computeStats }` | WIRED | Line 10; all 22 tests pass |
| `tests/dashboard/relativeTime.test.ts` | `src/features/dashboard/relativeTime.ts` | `import { formatRelativeTime }` | WIRED | Line 7; fake timers used |
| `src/features/dashboard/computeStats.ts` | `src/types/unit.ts` | `import type { Unit }` | WIRED | Line 9 |
| `src/features/dashboard/computeStats.ts` | `src/types/faction.ts` | `import type { Faction }` | WIRED | Line 10 |
| `src/db/queries/dashboard.ts` | `src/db/client.ts` | `getDb()` singleton | WIRED | Line 10; called inside `getDashboardStats` |
| `src/hooks/useDashboardStats.ts` | `src/db/queries/dashboard.ts` | `import { getDashboardStats }` | WIRED | Line 14; called in `queryFn` |
| `src/hooks/useDashboardStats.ts` | `src/features/dashboard/computeStats.ts` | `import { computeStats }` | WIRED | Line 15; called as `computeStats(units, factions)` in `queryFn` |
| `src/hooks/useUnits.ts` | `["dashboard-stats"]` invalidation | `qc.invalidateQueries` on 3 mutations | WIRED | Lines 33, 46, 58 — all 3 mutations (create/update/delete) invalidate the key |
| `src/features/dashboard/DashboardPage.tsx` | `src/hooks/useDashboardStats.ts` | `useDashboardStats()` | WIRED | Line 15 import; called on line 26 |
| `src/features/dashboard/DashboardPage.tsx` | `src/features/dashboard/StatCard.tsx` | `<StatCard>` rendered 7x | WIRED | Line 20 import; 7 usages in JSX (4 top row + 3 progress) |
| `src/features/dashboard/DashboardPage.tsx` | `src/features/dashboard/FactionSummaryCard.tsx` | `stats.factionStats.map → <FactionSummaryCard>` | WIRED | Line 22 import; mapped on line 206 |
| `src/features/dashboard/DashboardPage.tsx` | `src/features/dashboard/DashboardListRow.tsx` | `activeProjects.map / recentlyUpdated.map → <DashboardListRow>` | WIRED | Line 21 import; mapped in both list sections |
| `src/features/dashboard/DashboardPage.tsx` | `src/features/dashboard/DashboardEmptyState.tsx` | `!stats.hasUnits` branch | WIRED | Line 23 import; rendered on line 153 |
| `src/features/dashboard/DashboardPage.tsx` | `src/features/units/UnitDetailSheet.tsx` | `<UnitDetailSheet>` sibling with `open={selectedUnitId !== null}` | WIRED | Line 16 import; mounted as sibling in populated and empty branches |
| `src/features/dashboard/DashboardListRow.tsx` | `src/features/dashboard/relativeTime.ts` | `formatRelativeTime(unit.updated_at)` | WIRED | Line 12 import; called when `showTime` is true |
| `src/features/dashboard/DashboardListRow.tsx` | `src/features/dashboard/statusAbbr.ts` | `STATUS_ABBR[unit.status_painting]` | WIRED | Line 11 import; used on line 40 |
| `src/features/dashboard/FactionSummaryCard.tsx` | `src/features/units/collectionFilters.ts` | `useCollectionFilters.setState(...)` | WIRED | Line 15 import; called in `handleClick` setting `factions: [stat.faction.id]` |
| `src/features/dashboard/FactionSummaryCard.tsx` | `@tanstack/react-router` | `useNavigate()` + `navigate({ to: "/collection" })` | WIRED | Line 13 import; called in `handleClick` |
| `src/app/dashboard/page.tsx` | `src/features/dashboard/DashboardPage.tsx` | `import { DashboardPage as DashboardPageContent }` | WIRED | Line 1; delegated on line 4 |
| `src/app/router.tsx` | `src/app/dashboard/page.tsx` | `component: DashboardPage` at `path: "/"` | WIRED | Lines 9, 29 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| DASH-01 | 05-00, 05-02 | Top row stat cards: total models owned, fully-painted, battle-ready points, active projects count | SATISFIED | `computeStats` implements all 4 aggregations with `=== "Completed"` and `=== 1` guards; `DashboardPage.tsx` renders 4 `<StatCard>`; `computeStats.test.ts` covers all 4 in DASH-01 describe block |
| DASH-02 | 05-00, 05-02 | Faction summary cards — one per faction, points owned/painted, painted %, model count | SATISFIED | `computeStats.factionStats` aggregates per-faction; `FactionSummaryCard.tsx` renders all 4 data points + `border-l-4` color accent; click sets `useCollectionFilters.setState` + navigates to `/collection` |
| DASH-03 | 05-00, 05-02 | Painting completion percentage (overall) | SATISFIED | `computeStats.paintingPct = Math.round(sum(painting_percentage) / units.length)`; displayed as `${stats.paintingPct}%` on "Painting Progress" StatCard |
| DASH-04 | 05-00, 05-02 | Assembly completion % and basing completion % | SATISFIED | `computeStats.assemblyPct` + `basingPct` computed with `=== 1` guards and `Math.round`; displayed on "Assembly Progress" and "Basing Progress" StatCards |
| DASH-05 | 05-00, 05-02 | Current active painting projects list (links to unit detail) | SATISFIED | `computeStats.activeProjects` = top-5, `is_active_project === 1`, sorted by `updated_at DESC`; `<DashboardListRow onClick={handleRowClick}>` opens `UnitDetailSheet` |
| DASH-06 | 05-00, 05-02 | Recently updated units list (last 5 by updated_at) | SATISFIED | `computeStats.recentlyUpdated` = top-5 all units sorted `updated_at DESC`; `<DashboardListRow showTime>` calls `formatRelativeTime` |
| DASH-07 | 05-01 | All dashboard data from existing queries — no new tables; cache via TanStack Query invalidation | SATISFIED | `getDashboardStats` issues only `SELECT * FROM units` and `SELECT * FROM factions` (no new tables, no SQL aggregation); `useUnits.ts` all 3 mutations invalidate `["dashboard-stats"]`; `DASHBOARD_STATS_KEY` literal contract test passes |
| DASH-08 | 05-00, 05-02 | Empty state when no factions/units exist, pointing to Collection page | SATISFIED | `computeStats` returns `hasUnits: false` when `units.length === 0`; `DashboardPage.tsx` branches on `!stats.hasUnits`; `DashboardEmptyState.tsx` renders "Your collection is empty" + "Go to Collection" button; DashboardPage test asserts empty state and absence of section headings |

All 8 Phase 5 requirement IDs accounted for. No orphaned requirements.

### Anti-Patterns Found

No blockers or warnings found.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `DashboardPage.tsx` | 37 | `return []` inside `useMemo` | Info | Intentional empty-array guard for pre-data state in `allDisplayedUnits` — not a stub |

### Human Verification Required

The following items require a live `pnpm tauri dev` session to fully verify. All were approved by the user (Antoine Andre) during the plan 05-03 human-verify checkpoint on 2026-05-01.

**1. DASH-07 cache freshness end-to-end**
- Test: Update a unit's `status_painting` to "Completed" in `/collection`, navigate back to `/`
- Expected: "Fully Painted" counter increments without manual refresh
- Why human: Requires live SQLite + TanStack Query `invalidateQueries` interaction; cannot be asserted in vitest

**2. DASH-02 faction click-through with filter pre-applied**
- Test: Click a `FactionSummaryCard`, observe `/collection` opens with that faction's filter active
- Expected: Only units for that faction visible; all other filters cleared
- Why human: Zustand setState + router navigation cross-component interaction; no automated assertion covers end-to-end

**3. DASH-02 / POLISH-05 faction color accents**
- Test: Observe FactionSummaryCard left-border colors and DashboardListRow badge background colors
- Expected: Colors match `faction.color_theme` hex values from DB
- Why human: Visual/CSS inline-style inspection; cannot assert computed styles in vitest/jsdom

**4. Loading skeleton timing**
- Test: Hard-refresh the app; observe skeletons before data loads
- Expected: `h-24` stat card skeletons, `h-20 w-[180px]` faction skeletons, `h-11` list row skeletons visible
- Why human: Timing-dependent visual check; not testable in vitest

### Test Suite Results

Verified by running `pnpm test --reporter=verbose`:

- `tests/dashboard/computeStats.test.ts`: 22 passing tests (DASH-01 through DASH-08, 7 describe blocks)
- `tests/dashboard/relativeTime.test.ts`: passing (6 describe blocks including SQLite normalization)
- `tests/dashboard/useDashboardStats.test.ts`: 2 passing tests (DASH-07 cache-key contract)
- `tests/dashboard/DashboardPage.test.tsx`: 3 passing tests (all sections, empty state, error state)
- **Total suite: 113 tests passed, 0 failed, 0 skipped** (14 test files)
- No prior-phase regressions

### Gaps Summary

No gaps. All 8 DASH-* requirements are satisfied by real, substantive, wired implementations. The test suite is fully green at 113/113. Human-verify checkpoint was approved on 2026-05-01.

---

_Verified: 2026-05-01T18:48:00Z_
_Verifier: Claude (gsd-verifier) — independent re-verification against actual codebase_

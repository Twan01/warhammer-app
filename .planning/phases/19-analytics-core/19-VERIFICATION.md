---
phase: 19-analytics-core
verified: 2026-05-04T14:00:00Z
status: passed
score: 14/14 must-haves verified
---

# Phase 19: Analytics Core Verification Report

**Phase Goal:** The Dashboard gains two auto-calculated hobby health metrics (velocity and painting streak) and the Spending page gains a monthly spend trend chart — all driven by existing journal session and purchase data
**Verified:** 2026-05-04
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dashboard displays a HOBBY HEALTH section between PROGRESS and BY FACTION | VERIFIED | `DashboardPage.tsx` lines 143–152 (loading branch) and 251–277 (populated branch) — section exists in both branches, textually after Progress and before By Faction |
| 2 | HOBBY HEALTH renders 2 StatCards: Hobby Velocity and Painting Streak | VERIFIED | `DashboardPage.tsx` lines 264–273: `StatCard value={analytics?.velocityString ?? "0.0"} label="Hobby Velocity · units/month"` and `StatCard value={analytics?.streakString ?? "0 days"} label="Painting Streak"` |
| 3 | Both HOBBY HEALTH StatCards show fallback "0.0" / "0 days" when no journal sessions exist | VERIFIED | `?? "0.0"` and `?? "0 days"` optional-chain fallbacks on lines 265 and 270 |
| 4 | Both HOBBY HEALTH StatCards use `animate={false}` | VERIFIED | `animate={false}` present on both StatCards at lines 267 and 272 |
| 5 | SpendingPage displays Monthly Trend between hero card and Breakdown in the !isEmpty branch | VERIFIED | `SpendingPage.tsx` lines 90–98: section inserted after `</Card>` (line 88) and before `<section>` Breakdown (line 100) |
| 6 | Monthly Trend renders a Recharts BarChart inside shadcn ChartContainer with 12 bars | VERIFIED | `SpendTrendChart.tsx` uses `ChartContainer` + `BarChart`; `computeHobbyAnalytics` always returns exactly 12 entries; test "always returns exactly 12 entries" passes |
| 7 | Y-axis ticks and tooltip formatted via `formatCurrency` | VERIFIED | `SpendTrendChart.tsx` line 61: `tickFormatter={(value: number) => formatCurrency(value)}` and line 69: `formatter={(value) => formatCurrency(Number(value))}` |
| 8 | When all 12 bars are zero, muted note appears | VERIFIED | `SpendTrendChart.tsx` lines 80–84: `allZero && <p>Add purchase dates to units and paints to see trends</p>` |
| 9 | Bar fill uses `var(--color-pence)` stable across faction theme changes | VERIFIED | `SpendTrendChart.tsx` line 75: `fill="var(--color-pence)"` with chartConfig mapping to `hsl(var(--chart-1))` — not `faction-accent` |
| 10 | Logging/deleting a painting session invalidates `['hobby-analytics']` | VERIFIED | `useJournalSessions.ts` lines 41 and 76: `qc.invalidateQueries({ queryKey: ["hobby-analytics"] })` in `useCreatePaintingSession.onSuccess` and `useDeletePaintingSession.onSettled` |
| 11 | Creating/updating/deleting a unit invalidates `['hobby-analytics']` | VERIFIED | `useUnits.ts` lines 36, 52, 67: 3 occurrences for create/update/delete |
| 12 | Creating/updating/deleting a paint invalidates `['hobby-analytics']` | VERIFIED | `usePaints.ts` lines 50, 65, 79: 3 occurrences for create/update/delete |
| 13 | NULL purchase_date rows excluded from spend chart SQL (ANLY-07) | VERIFIED | `analytics.ts` lines 39 and 43: `WHERE purchase_date IS NOT NULL AND purchase_price_pence IS NOT NULL` for BOTH units and paints sources; SQL test asserts both filters |
| 14 | All 29 Wave-0 stubs flipped to active and passing | VERIFIED | Zero `it.skip` occurrences across all 3 test files; 18+9+2=29 active `it()` blocks confirmed |

**Score:** 14/14 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/queries/analytics.ts` | `getAnalyticsData`, `RawAnalyticsData` | VERIFIED | Exports both; UNION ALL with NULL purchase_date filter; Promise.all parallel SELECTs |
| `src/features/dashboard/computeHobbyAnalytics.ts` | `computeHobbyAnalytics`, `HobbyAnalytics` | VERIFIED | Pure function; `Math.max(monthsDiff, 1)` Pitfall 2 floor; `parseLocalDate(todayISO())` Pitfall 5; 12-entry loop Pitfall 3; year-suffix label Pitfall 6 |
| `src/hooks/useHobbyAnalytics.ts` | `HOBBY_ANALYTICS_KEY`, `useHobbyAnalytics` | VERIFIED | `["hobby-analytics"] as const`; wraps `getAnalyticsData` + `computeHobbyAnalytics` |
| `src/components/ui/chart.tsx` | `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` | VERIFIED | shadcn-managed file exists; exports confirmed at lines 366–368 |
| `src/features/spending/SpendTrendChart.tsx` | Recharts BarChart, formatCurrency, zero-state note | VERIFIED | 87 lines; all required literals present |
| `src/features/dashboard/DashboardPage.tsx` | HOBBY HEALTH section in loading + populated branches | VERIFIED | "Hobby Health" appears twice (lines 146 and 253) |
| `src/features/spending/SpendingPage.tsx` | Monthly Trend section in !isEmpty branch | VERIFIED | "Monthly Trend" heading at line 92 |
| `src/hooks/useJournalSessions.ts` | 2× `hobby-analytics` invalidations | VERIFIED | Lines 41, 76 |
| `src/hooks/useUnits.ts` | 3× `hobby-analytics` invalidations | VERIFIED | Lines 36, 52, 67 |
| `src/hooks/usePaints.ts` | 3× `hobby-analytics` invalidations | VERIFIED | Lines 50, 65, 79 |
| `package.json` | `pnpm.overrides`, `recharts`, `react-is` | VERIFIED | `"react-is": "^19.2.5"` in dependencies; `"recharts": "3.8.0"` in dependencies; `pnpm.overrides` block with `"react-is": "^19.0.0"` |
| `tests/analytics/computeHobbyAnalytics.test.ts` | 18 active tests, 0 skips | VERIFIED | 18 `it(` occurrences, 0 `it.skip(` |
| `tests/analytics/analyticsQueries.test.ts` | 9 active tests, 0 skips | VERIFIED | 9 `it(` occurrences, 0 `it.skip(` |
| `tests/analytics/useHobbyAnalytics.test.ts` | 2 active tests, 0 skips | VERIFIED | 2 `it(` occurrences, 0 `it.skip(`; `expect(HOBBY_ANALYTICS_KEY).toEqual(["hobby-analytics"])` present |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useHobbyAnalytics.ts` | `src/db/queries/analytics.ts` | `import { getAnalyticsData }` | WIRED | Line 14: `from "@/db/queries/analytics"` |
| `src/hooks/useHobbyAnalytics.ts` | `src/features/dashboard/computeHobbyAnalytics.ts` | `import { computeHobbyAnalytics }` | WIRED | Lines 15–18: `from "@/features/dashboard/computeHobbyAnalytics"` |
| `src/features/dashboard/computeHobbyAnalytics.ts` | `src/lib/dates.ts` | `import { todayISO, parseLocalDate }` | WIRED | Line 17: `from "@/lib/dates"` |
| `src/features/dashboard/DashboardPage.tsx` | `useHobbyAnalytics()` | TanStack Query hook call | WIRED | Line 16 import + line 37 call: `useHobbyAnalytics()` |
| `src/features/spending/SpendingPage.tsx` | `useHobbyAnalytics()` | TanStack Query hook call | WIRED | Line 25 import + line 31 call |
| `src/features/spending/SpendingPage.tsx` | `src/features/spending/SpendTrendChart.tsx` | `import + <SpendTrendChart` | WIRED | Line 26 import; line 96 usage: `<SpendTrendChart data={analytics?.monthlyData ?? []} />` |
| `src/features/spending/SpendTrendChart.tsx` | `src/components/ui/chart.tsx` | `import { ChartContainer, ChartTooltip, ChartTooltipContent }` | WIRED | Lines 28–33: `from "@/components/ui/chart"` |
| `src/features/spending/SpendTrendChart.tsx` | `src/lib/formatCurrency.ts` | `import { formatCurrency }` | WIRED | Line 33: `from "@/lib/formatCurrency"` |
| `useJournalSessions.ts` → `['hobby-analytics']` | cache invalidation | `qc.invalidateQueries` | WIRED | 2 sites — lines 41, 76 |
| `useUnits.ts` → `['hobby-analytics']` | cache invalidation | `qc.invalidateQueries` on all 3 mutations | WIRED | 3 sites — lines 36, 52, 67 |
| `usePaints.ts` → `['hobby-analytics']` | cache invalidation | `qc.invalidateQueries` on all 3 mutations | WIRED | 3 sites — lines 50, 65, 79 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ANLY-04 | 19-00, 19-01, 19-02, 19-03 | Dashboard shows hobby velocity — average units worked on per month | SATISFIED | `computeHobbyAnalytics.ts` `computeVelocityString()`; `DashboardPage.tsx` Hobby Velocity StatCard; 6 passing tests |
| ANLY-05 | 19-00, 19-01, 19-02, 19-03 | Dashboard shows current painting streak — consecutive calendar days | SATISFIED | `computeHobbyAnalytics.ts` `computeStreakString()`; `DashboardPage.tsx` Painting Streak StatCard; 6 passing tests |
| ANLY-06 | 19-00, 19-01, 19-02, 19-03 | Spending page shows monthly spend trend chart combining unit and paint purchases | SATISFIED | `SpendTrendChart.tsx` 12-bar chart; `SpendingPage.tsx` Monthly Trend section; 6 passing monthlyData tests; human smoke test step 6 passed |
| ANLY-07 | 19-00, 19-01, 19-02, 19-03 | Spend trend chart uses purchase_date for both units and paints; NULL excluded | SATISFIED | `analytics.ts` SQL: `WHERE purchase_date IS NOT NULL AND purchase_price_pence IS NOT NULL` for both units and paints; 2 dedicated SQL contract tests; human smoke test step 9 passed |

All 4 requirements claimed in PLAN frontmatter are satisfied. No orphaned requirements found in REQUIREMENTS.md for Phase 19.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `tests/analytics/computeHobbyAnalytics.test.ts` | 24–28 | `beforeEach` and `afterEach` called inside an `it()` body rather than at `describe` scope | Warning | The timer setup for the "returns velocityString='1.0'" test is a no-op — `beforeEach`/`afterEach` invoked inside `it()` are called as regular functions during that single test's execution rather than as lifecycle hooks. However, the velocity calculation for this test does not rely on the system clock (velocity only uses input date strings via `parseLocalDate`, not `todayISO()`), so the test passes correctly despite the misplacement. The ANLY-05 streak tests have their own properly-scoped `beforeEach`/`afterEach` at describe level (lines 90–94) which do work correctly. No behavioural defect results from this. |

---

## Human Verification Required

The phase already completed a human smoke-test in Plan 03. The user approved all 12 steps on 2026-05-04T13:41:33Z. No further human verification is required.

Items verified by human:
1. Dashboard HOBBY HEALTH section visible between PROGRESS and BY FACTION
2. Empty fallback state (0.0 velocity, 0 days streak)
3. Session logging triggers reactive Dashboard update (cache invalidation working)
4. Streak with consecutive days
5. Velocity with multiple units
6. SpendingPage Monthly Trend chart visible with data
7. Bar color stable across faction theme changes
8. Zero-state muted note verbatim
9. NULL purchase_date excluded — no 1970 epoch bar
10. Year-boundary label disambiguation (Pitfall 6)
11. Spend chart loading skeleton independent of hero card (Pitfall 7)
12. Cross-page regression — no console errors, no Recharts peer-dep warnings

---

## Summary

Phase 19 goal is fully achieved. All four requirements (ANLY-04..07) are satisfied:

- The data layer is complete and correct: `getAnalyticsData` queries sessions and monthly spend with proper NULL filtering for ANLY-07; `computeHobbyAnalytics` produces velocity (1-decimal, Pitfall 2 floor), streak (timezone-safe via `dates.ts`, Pitfall 5), and 12-entry monthly data (JS-padded, year-suffix labels, Pitfalls 3 and 6).
- The hook layer is correct: `HOBBY_ANALYTICS_KEY = ["hobby-analytics"] as const` with 2-test contract coverage.
- The UI layer is complete: HOBBY HEALTH section on Dashboard (both loading and populated branches) and Monthly Trend chart on SpendingPage (!isEmpty branch only).
- Cache invalidation covers all 8 relevant mutations across 3 hook files.
- 29 active tests pass (0 skips). The one anti-pattern found (misplaced `beforeEach`/`afterEach` in a single test) does not affect correctness because the test in question does not rely on the timer mock.
- Production build succeeds (pnpm build verified by Plan 02).
- Human smoke test approved all 12 steps.

---

_Verified: 2026-05-04_
_Verifier: Claude (gsd-verifier)_

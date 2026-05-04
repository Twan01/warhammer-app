---
phase: 19-analytics-core
plan: "01"
subsystem: analytics
tags: [recharts, shadcn, react-query, sqlite, pure-function, tdd]
dependency_graph:
  requires: ["19-00"]
  provides: ["analytics-data-layer", "hobby-analytics-hook", "recharts-chart-component"]
  affects: ["19-02"]
tech_stack:
  added:
    - recharts@3.8.0 (via shadcn add chart)
    - react-is@19.2.5 (explicit dep + pnpm.overrides for React 19 compat)
    - src/components/ui/chart.tsx (shadcn managed)
  patterns:
    - Promise.all parallel SELECTs in query module (mirrors spending.ts)
    - Pure aggregation function (mirrors computeSpendingStats.ts)
    - Single-key React Query hook (mirrors useSpendingStats.ts)
    - TDD — RED then GREEN for all 27 implementation tests
key_files:
  created:
    - src/components/ui/chart.tsx
    - src/db/queries/analytics.ts
    - src/features/dashboard/computeHobbyAnalytics.ts
    - src/hooks/useHobbyAnalytics.ts
  modified:
    - package.json (pnpm.overrides + recharts + react-is dependencies)
    - pnpm-lock.yaml
    - tests/analytics/computeHobbyAnalytics.test.ts (18 stubs flipped)
    - tests/analytics/analyticsQueries.test.ts (9 stubs flipped)
    - tests/analytics/useHobbyAnalytics.test.ts (2 stubs flipped)
decisions:
  - "recharts 3.8.0 installed (not 2.15.x from research — newer stable version, same API surface)"
  - "computeHobbyAnalytics placed in src/features/dashboard/ to mirror computeStats.ts (resolved RESEARCH open question 1)"
  - "buildLabel uses year === currentYear check for suffix — months in prior years get apostrophe suffix, current year gets plain abbreviation"
  - "TypeScript tsc --noEmit reports 1 pre-existing error in tests/enrichment/UnitDetailSheet.enrichment.test.tsx — not caused by this plan, deferred per scope boundary rule"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-04"
  tasks_completed: 3
  files_created: 4
  files_modified: 5
---

# Phase 19 Plan 01: Analytics Data Layer Summary

Recharts installed via shadcn chart with React 19 compatibility override. Full analytics data layer built — query module, pure aggregation function, React Query hook. All 29 Wave-0 stubs flipped to active and passing.

## What Was Built

### Task 1: Recharts Install (chore — commit c12e33f)

Added `pnpm.overrides` block to `package.json` with `react-is: ^19.0.0`, then ran `pnpm install` + `pnpm add react-is` + `npx shadcn@latest add chart`. recharts 3.8.0 and react-is 19.2.5 installed. `src/components/ui/chart.tsx` created by shadcn CLI with ChartContainer, ChartTooltip, ChartTooltipContent exports.

### Task 2: Query Module + Pure Function + 27 Tests (feat — commit 540d073)

**`src/db/queries/analytics.ts`** — `getAnalyticsData()` uses Promise.all parallel SELECTs:
- Sessions: `SELECT DISTINCT unit_id, session_date FROM painting_sessions ORDER BY session_date ASC`
- Monthly spend: UNION ALL of units + paints where BOTH `purchase_date IS NOT NULL AND purchase_price_pence IS NOT NULL`, windowed to last 12 months

**`src/features/dashboard/computeHobbyAnalytics.ts`** — pure function returning `HobbyAnalytics`:
- `velocityString`: distinct unit_ids / `Math.max(monthsDiff, 1)` with `toFixed(1)` — Pitfall 2 floor prevents Infinity
- `streakString`: walks backwards from `parseLocalDate(todayISO())` — Pitfall 5 timezone-safe
- `monthlyData`: 12-entry array built in JS from a full month loop, SQL gaps filled with pence=0 — Pitfall 3
- Prior-year month labels use "Jan '25" apostrophe suffix — Pitfall 6

### Task 3: Hook + 2 Cache-Key Tests (feat — commit 5d53aff)

**`src/hooks/useHobbyAnalytics.ts`** — `HOBBY_ANALYTICS_KEY = ["hobby-analytics"] as const` + `useHobbyAnalytics()` wrapping `getAnalyticsData()` + `computeHobbyAnalytics()`. Mirrors `useSpendingStats.ts` exactly.

## Public API Surface

### `src/db/queries/analytics.ts`
- `export interface RawAnalyticsData` — `{ sessions, monthlySpend }`
- `export async function getAnalyticsData(): Promise<RawAnalyticsData>`

### `src/features/dashboard/computeHobbyAnalytics.ts`
- `export interface HobbyAnalytics` — `{ velocityString, streakString, monthlyData }`
- `export function computeHobbyAnalytics(sessions, rawMonthlySpend): HobbyAnalytics`

### `src/hooks/useHobbyAnalytics.ts`
- `export const HOBBY_ANALYTICS_KEY = ["hobby-analytics"] as const`
- `export function useHobbyAnalytics(): UseQueryResult<HobbyAnalytics, Error>`

### `src/components/ui/chart.tsx` (shadcn managed)
- `export function ChartContainer`
- `export const ChartTooltip`
- `export function ChartTooltipContent`
- (also exports ChartLegend, ChartLegendContent, ChartStyle — shadcn additions)

## Test Results

| File | Tests | Status |
|------|-------|--------|
| tests/analytics/computeHobbyAnalytics.test.ts | 18 | All passed |
| tests/analytics/analyticsQueries.test.ts | 9 | All passed |
| tests/analytics/useHobbyAnalytics.test.ts | 2 | All passed |
| **Total analytics** | **29** | **29/29 GREEN** |
| Full suite | 388 | 388 passed, 2 skipped (pre-existing journal stubs) |

## Recharts Version

recharts@3.8.0 (newer than research estimate of 2.15.x — same shadcn ChartContainer API, no migration needed)

## Pitfall Implementations

| Pitfall | Implementation | Verified by |
|---------|---------------|-------------|
| Pitfall 2 — velocity Infinity | `Math.max(monthsDiff, 1)` floor | Test: "does NOT return Infinity when all sessions same date" |
| Pitfall 3 — monthly gaps | 12-entry JS loop + `?? 0` merge | Test: "fills missing months with pence=0" + "always returns 12 entries" |
| Pitfall 5 — streak timezone | `parseLocalDate(todayISO())` from `@/lib/dates` | Literal-string check + behavioural test with 30-day streak |
| Pitfall 6 — year-boundary labels | `buildLabel()` adds `'YY` suffix for prior-year months | Test: "month labels use Jan '25 style suffix" + "oldest-first ordering" |

## Note for Plan 02

Every export above is consumable. Specifically:
- `useHobbyAnalytics()` → provides `data.velocityString`, `data.streakString`, `data.monthlyData` for Dashboard HOBBY HEALTH and SpendingPage Monthly Trend chart
- `HOBBY_ANALYTICS_KEY` → Plan 02 must pass this to `queryClient.invalidateQueries()` in useJournalSessions, useUnits, usePaints mutations
- `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` from `@/components/ui/chart` → import these in SpendTrendChart component

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/components/ui/chart.tsx` exists
- [x] `src/db/queries/analytics.ts` exists
- [x] `src/features/dashboard/computeHobbyAnalytics.ts` exists
- [x] `src/hooks/useHobbyAnalytics.ts` exists
- [x] `package.json` contains `"pnpm":` and `"react-is": "^19.0.0"` override
- [x] All 3 per-task commits exist (c12e33f, 540d073, 5d53aff)
- [x] Full suite: 388 passed, 0 failed

## Self-Check: PASSED

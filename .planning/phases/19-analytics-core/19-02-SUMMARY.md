---
phase: 19-analytics-core
plan: "02"
subsystem: analytics-ui
tags: [analytics, dashboard, spending, recharts, shadcn-chart, cache-invalidation]
dependency_graph:
  requires: [19-01]
  provides: [SpendTrendChart, HOBBY-HEALTH-dashboard, Monthly-Trend-spending, hobby-analytics-invalidation-chain]
  affects: [DashboardPage, SpendingPage, useJournalSessions, useUnits, usePaints]
tech_stack:
  added: []
  patterns: [shadcn-ChartContainer, recharts-BarChart, independent-chart-skeleton, cache-invalidation-chain]
key_files:
  created:
    - src/features/spending/SpendTrendChart.tsx
  modified:
    - src/features/dashboard/DashboardPage.tsx
    - src/features/spending/SpendingPage.tsx
    - src/hooks/useJournalSessions.ts
    - src/hooks/useUnits.ts
    - src/hooks/usePaints.ts
decisions:
  - "SpendTrendChart uses hsl(var(--chart-1)) via chartConfig — stable across faction theme changes (anti-pattern: faction-accent on chart bars)"
  - "Monthly Trend skeleton is independent of hero card — analyticsLoading gates only the chart slot (Pitfall 7 pattern)"
  - "8 mutations now invalidate hobby-analytics using literal ['hobby-analytics'] array — matches existing project pattern (no HOBBY_ANALYTICS_KEY import)"
  - "HOBBY HEALTH section uses grid-cols-2 (distinct from Progress grid-cols-3)"
  - "animate={false} on both HOBBY HEALTH StatCards — values are strings not integers"
metrics:
  duration: "7m 28s"
  completed_date: "2026-05-04"
  tasks_completed: 4
  tasks_total: 4
  files_created: 1
  files_modified: 5
---

# Phase 19 Plan 02: Analytics UI Layer Summary

Wave 2 wires the Plan 01 data layer into the UI — SpendTrendChart component created, HOBBY HEALTH section inserted on Dashboard between PROGRESS and BY FACTION, Monthly Trend section inserted on SpendingPage between hero card and Breakdown, and all 8 relevant mutations patched to invalidate ['hobby-analytics'].

## What Was Built

**SpendTrendChart** (`src/features/spending/SpendTrendChart.tsx`) — Recharts BarChart wrapped in shadcn ChartContainer with 12 bars (rolling 12 months), Y-axis + tooltip using `formatCurrency`, bar fill via `var(--color-pence)` from chartConfig using `hsl(var(--chart-1))`, CartesianGrid `vertical={false}`, radius `[3,3,0,0]`, and a zero-state muted note when all 12 bars are zero.

**DashboardPage HOBBY HEALTH section** — Inserted in both loading-skeleton branch and populated branch between PROGRESS and BY FACTION. Loading branch shows 2 × `h-24` skeletons. Populated branch shows Velocity StatCard (`animate={false}`, fallback `"0.0"`) and Painting Streak StatCard (`animate={false}`, fallback `"0 days"`) in a `grid-cols-2` layout.

**SpendingPage Monthly Trend section** — Inserted in the `!isEmpty` branch between hero card and Breakdown. Uses independent `analyticsLoading` state with a `h-60` Skeleton (Pitfall 7 compliant — does not block hero card). Passes `analytics?.monthlyData ?? []` to `SpendTrendChart`.

**Cache invalidation chain** — 8 mutations now invalidate `['hobby-analytics']`:
- `useJournalSessions`: `useCreatePaintingSession.onSuccess` + `useDeletePaintingSession.onSettled` (2 sites)
- `useUnits`: `useCreateUnit`, `useUpdateUnit`, `useDeleteUnit` all `onSuccess` (3 sites)
- `usePaints`: `useCreatePaint`, `useUpdatePaint`, `useDeletePaint` all `onSuccess` (3 sites)

## Verification

- `pnpm tsc --noEmit` exits 0 (1 pre-existing unrelated error in test file)
- `pnpm vitest run` exits 0 — 388 passed, 2 skipped (all pre-existing)
- `pnpm build` exits 0 — 2742 modules transformed, recharts + chart.tsx bundled correctly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unused `beforeEach` import in UnitDetailSheet.enrichment.test.tsx**
- **Found during:** Task 4 (`pnpm build` step)
- **Issue:** Pre-existing `noUnusedLocals` TypeScript error blocked `pnpm build` (tsc runs as part of build script). The `beforeEach` import was declared but never used.
- **Fix:** Removed `beforeEach` from the vitest import on line 14 of `tests/enrichment/UnitDetailSheet.enrichment.test.tsx`
- **Files modified:** `tests/enrichment/UnitDetailSheet.enrichment.test.tsx`
- **Commit:** `0bd9874`

## HOBBY HEALTH Placement Confirmation

**Loading branch:** HOBBY HEALTH skeleton (lines 146+) appears AFTER Progress skeleton (line 131) and BEFORE By Faction skeleton (line 157) — confirmed by grep line numbers.

**Populated branch:** HOBBY HEALTH section (line 254) appears AFTER Progress section (line 239) and BEFORE Faction section (line 282) — confirmed by grep line numbers.

## Monthly Trend Placement Confirmation

Monthly Trend section (line 90-99) appears AFTER hero `</Card>` (line 88) and BEFORE `<section>` containing `<h2>Breakdown</h2>` (line 101) in the `!isEmpty` branch — confirmed by grep line numbers.

## Invalidation Chain Summary

| File | Mutation | Invalidates |
|------|----------|-------------|
| useJournalSessions.ts | useCreatePaintingSession.onSuccess | PAINTING_SESSIONS_KEY + hobby-analytics |
| useJournalSessions.ts | useDeletePaintingSession.onSettled | PAINTING_SESSIONS_KEY + hobby-analytics |
| useUnits.ts | useCreateUnit.onSuccess | UNITS_KEY + dashboard-stats + spending-stats + **hobby-analytics** |
| useUnits.ts | useUpdateUnit.onSuccess | UNITS_KEY + UNIT_KEY + dashboard-stats + spending-stats + **hobby-analytics** |
| useUnits.ts | useDeleteUnit.onSuccess | UNITS_KEY + dashboard-stats + spending-stats + **hobby-analytics** |
| usePaints.ts | useCreatePaint.onSuccess | PAINTS_KEY + PAINTS_WITH_RECIPES_KEY + spending-stats + **hobby-analytics** |
| usePaints.ts | useUpdatePaint.onSuccess | PAINTS_KEY + PAINT_KEY + PAINTS_WITH_RECIPES_KEY + spending-stats + **hobby-analytics** |
| usePaints.ts | useDeletePaint.onSuccess | PAINTS_KEY + PAINTS_WITH_RECIPES_KEY + spending-stats + **hobby-analytics** |

## Note for Plan 03 Manual Smoke Test

Open Dashboard — verify HOBBY HEALTH section between PROGRESS and BY FACTION (2 cards: Hobby Velocity + Painting Streak).

Open SpendingPage with spend data — verify Monthly Trend section between hero card and Breakdown (12-bar chart).

Log a painting session — verify Dashboard velocity/streak refresh.

Edit a unit purchase_date — verify SpendingPage chart refreshes.

Edit a paint purchase_date — verify SpendingPage chart refreshes.

Open SpendingPage with no data (empty state) — verify Monthly Trend section does NOT appear (correct, isEmpty branch).

## Self-Check: PASSED

- `src/features/spending/SpendTrendChart.tsx` — EXISTS
- `src/features/dashboard/DashboardPage.tsx` contains `Hobby Health` × 2 — CONFIRMED
- `src/features/spending/SpendingPage.tsx` contains `Monthly Trend` — CONFIRMED
- `src/hooks/useJournalSessions.ts` contains `hobby-analytics` × 2 — CONFIRMED
- `src/hooks/useUnits.ts` contains `hobby-analytics` × 3 — CONFIRMED
- `src/hooks/usePaints.ts` contains `hobby-analytics` × 3 — CONFIRMED
- Commits d44d232, 9ae6989, 7040440, 0bd9874 — all present in git log

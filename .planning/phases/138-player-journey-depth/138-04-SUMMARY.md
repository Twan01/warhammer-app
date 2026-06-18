---
phase: 138-player-journey-depth
plan: "04"
subsystem: dashboard
tags: [goals, dashboard, widget, tdd, play-05]
dependency_graph:
  requires: []
  provides: [GoalProgressCard, dashboard-hobby-goals-section]
  affects: [src/features/dashboard/DashboardPage.tsx]
tech_stack:
  added: []
  patterns: [react-query-hook-reuse, goalcard-progress-bar-idiom, tanstack-router-link]
key_files:
  created:
    - src/features/dashboard/GoalProgressCard.tsx
    - tests/dashboard/GoalProgressCard.test.tsx
    - tests/dashboard/goalProgressInvalidation.test.ts
  modified:
    - src/features/dashboard/DashboardPage.tsx
    - tests/performance/lazyRoutes.test.ts
decisions:
  - "Reused useGoals() + useGoalProgress() directly — no new query or derivation (D-09)"
  - "GoalCard progress-bar idiom adapted inline — not imported — to keep the dashboard widget compact (no edit/delete/status badge)"
  - "Insert Hobby Goals after By Faction in left column per UI-SPEC Surface 4"
  - "Filter to active+completed goals (exclude missed) to keep the card optimistic"
metrics:
  duration: "14m"
  completed_date: "2026-06-18"
  tasks: 2
  files: 5
---

# Phase 138 Plan 04: GoalProgressCard Dashboard Widget Summary

**One-liner:** Compact GoalProgressCard widget reusing useGoals+useGoalProgress with per-goal progress bars on the dashboard left column, and regression test locking session->goal-progress invalidation.

## What Was Built

- `GoalProgressCard` component in `src/features/dashboard/GoalProgressCard.tsx` — consumes the existing `useGoals()` + `useGoalProgress()` hooks (D-09 constraint respected). Renders one progress bar row per visible goal (active + completed; missed goals hidden). Empty state shows "No active goals." and a TanStack Router Link to `/goals` with "Set a hobby goal →" text.
- Dashboard "Hobby Goals" section added to `DashboardPage.tsx` left column, after the "By Faction" section, using the standard `text-sm font-semibold uppercase tracking-widest text-muted-foreground` section header pattern.
- `GoalProgressCard.test.tsx` — widget render tests (populated: 2 goals, count/target labels, period labels; empty state: exact copy + link).
- `goalProgressInvalidation.test.ts` — structural regression lock asserting `useCreatePaintingSession` and `useDeletePaintingSession` both contain `queryKey: ["goal-progress"]` invalidation.

## TDD Gate Compliance

- RED: `test(138-04)` commit — GoalProgressCard tests failed (component didn't exist); invalidation regression test passed immediately (locked existing behavior).
- GREEN: `feat(138-04)` commit — both GoalProgressCard tests pass; invalidation lock unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale lazy route count in lazyRoutes.test.ts**
- **Found during:** Task 2 test run
- **Issue:** `tests/performance/lazyRoutes.test.ts` expected 17 lazy imports but router.tsx had 18 (Phase 138-01 added `/unit-database/compare` route, count never updated). Test was failing before this plan.
- **Fix:** Updated count assertion from 17 to 18 (first test). The named-export adapter pattern count remains 17 because `UnitComparePage` uses a multi-line lazy format that doesn't match the single-line filter.
- **Files modified:** `tests/performance/lazyRoutes.test.ts`
- **Commit:** 974aaaae

## Known Stubs

None — GoalProgressCard reads live data from `useGoals()` + `useGoalProgress()`. Empty state is intentional behavior, not a stub.

## Threat Flags

None — GoalProgressCard reads the user's own local goal data already shown on /goals; no new data surface introduced.

## Self-Check

- [x] `src/features/dashboard/GoalProgressCard.tsx` exists
- [x] `src/features/dashboard/DashboardPage.tsx` contains `GoalProgressCard`
- [x] `tests/dashboard/GoalProgressCard.test.tsx` exists
- [x] `tests/dashboard/goalProgressInvalidation.test.ts` exists
- [x] Commits addee424 (test RED) and 974aaaae (feat GREEN) exist
- [x] `pnpm build` clean
- [x] All 3 target test files pass

## Self-Check: PASSED

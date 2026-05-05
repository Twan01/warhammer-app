---
phase: 22-hobby-goals
plan: "02"
subsystem: goals-ui
tags: [react-query, hooks, ui-components, routing, sidebar, testing]
dependency_graph:
  requires: [22-01]
  provides: [goals-feature-complete]
  affects: [sidebar-nav, router, useJournalSessions]
tech_stack:
  added: []
  patterns: [sibling-portal-architecture, buildDefaultValues-no-zod-default, currentPeriod-at-submit-time]
key_files:
  created:
    - src/hooks/useGoals.ts
    - src/features/goals/GoalCard.tsx
    - src/features/goals/GoalSheet.tsx
    - src/features/goals/GoalDeleteDialog.tsx
    - src/features/goals/GoalEmptyState.tsx
    - src/features/goals/GoalsPage.tsx
    - src/app/goals/page.tsx
    - tests/goals/useGoals.test.tsx
    - tests/goals/GoalSheet.test.tsx
    - tests/goals/GoalsPage.test.tsx
  modified:
    - src/hooks/useJournalSessions.ts
    - src/app/router.tsx
    - src/components/common/AppSidebar.tsx
decisions:
  - useGoalProgress enabled when goals !== undefined (not !!goals or goals?.length) — empty array triggers fetch, matches Pitfall 5
  - GoalSheet uses buildDefaultValues function (not zod .default()) — consistent with project Zod pitfall rule
  - period derived at submit time via currentPeriod(data.timeframe) — not stored pre-computed, Pitfall 3
  - GoalsPage uses getAllByText for Completed/Missed in tests — status badge and section header both render these strings
  - Goals sidebar entry added to COMMAND_NAV (not a separate nav group) — consistent with plan spec
metrics:
  duration_seconds: 707
  completed_date: "2026-05-05"
  tasks_completed: 3
  files_created: 10
  files_modified: 3
---

# Phase 22 Plan 02: Hobby Goals — UI, Hooks, Routing, and Tests Summary

**One-liner:** Complete Hobby Goals feature: React Query hooks with goal-progress invalidation, 5 UI components (GoalCard/GoalSheet/GoalDeleteDialog/GoalEmptyState/GoalsPage), /goals route, sidebar Target icon entry, 13 tests activated.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | useGoals hooks + useJournalSessions patch | 1d85ccf | src/hooks/useGoals.ts, src/hooks/useJournalSessions.ts, tests/goals/useGoals.test.tsx |
| 2 | Goal UI components (GoalCard, GoalSheet, GoalDeleteDialog, GoalEmptyState) | 46d4fd4 | src/features/goals/GoalCard.tsx, GoalSheet.tsx, GoalDeleteDialog.tsx, GoalEmptyState.tsx, tests/goals/GoalSheet.test.tsx |
| 3 | GoalsPage + routing + sidebar + page tests | 87becea | src/features/goals/GoalsPage.tsx, src/app/goals/page.tsx, src/app/router.tsx, src/components/common/AppSidebar.tsx, tests/goals/GoalsPage.test.tsx |

## What Was Built

### Hooks (src/hooks/useGoals.ts)
- `GOALS_KEY`, `GOAL_PROGRESS_KEY` constants
- `useGoals()` — queries all hobby goals
- `useGoalProgress()` — enabled when `goals !== undefined` (empty array is valid)
- `useCreateGoal()`, `useUpdateGoal()`, `useDeleteGoal()` — mutations with toast.error on failure

### useJournalSessions patch
- Added `qc.invalidateQueries({ queryKey: ["goal-progress"] })` to `useCreatePaintingSession.onSuccess` so painting sessions refresh goal progress automatically

### UI Components
- **GoalCard**: Status-based progress bar (bg-faction-accent / bg-battle-gold / bg-muted-foreground/30), pct clamped with Math.min(100), CheckCircle2/XCircle status badges
- **GoalSheet**: Create/edit form with `buildDefaultValues`, `currentPeriod(data.timeframe)` at submit time, no zod `.default()`
- **GoalDeleteDialog**: Confirmation dialog with `onConfirm` callback
- **GoalEmptyState**: Icon-pill with Target icon, "No goals set yet", "Set Goal" CTA

### GoalsPage
- Sibling-portal architecture (GoalSheet + GoalDeleteDialog at root)
- `useMemo` grouping into Active / Completed / Missed sections
- Loading skeleton (3x h-32 cards), error message, empty state

### Routing + Sidebar
- `/goals` route registered in router.tsx after paintingProjectsRoute
- `Target` icon + Goals entry added to COMMAND_NAV in AppSidebar

## Test Results

- 13 goals tests activated: 6 useGoals + 3 GoalSheet + 4 GoalsPage
- Full suite: 610 passing, 2 pre-existing skips (useJournalSessions Wave 0 stubs from a separate phase)
- `pnpm build` exits 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GoalsPage test uses getAllByText for Completed/Missed**
- **Found during:** Task 3 — GoalsPage test run
- **Issue:** `getByText("Completed")` and `getByText("Missed")` threw "multiple elements found" because GoalCard status badges also render these strings alongside the section headers
- **Fix:** Used `getAllByText(...)` and asserted `length >= 1` for Completed and Missed tests
- **Files modified:** tests/goals/GoalsPage.test.tsx
- **Commit:** 87becea

## Self-Check

**Files exist:**
- src/hooks/useGoals.ts: FOUND
- src/features/goals/GoalCard.tsx: FOUND
- src/features/goals/GoalSheet.tsx: FOUND
- src/features/goals/GoalDeleteDialog.tsx: FOUND
- src/features/goals/GoalEmptyState.tsx: FOUND
- src/features/goals/GoalsPage.tsx: FOUND
- src/app/goals/page.tsx: FOUND

**Commits exist:**
- 1d85ccf: feat(22-02): add useGoals hooks + goal-progress invalidation in useJournalSessions
- 46d4fd4: feat(22-02): add Goal UI components (GoalCard, GoalSheet, GoalDeleteDialog, GoalEmptyState)
- 87becea: feat(22-02): add GoalsPage, /goals route, sidebar entry, 4 page tests passing

## Self-Check: PASSED

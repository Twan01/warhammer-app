---
phase: 32-army-readiness-card
plan: 01
subsystem: dashboard
tags: [army-readiness, dashboard, react-query, localStorage, tdd]
dependency_graph:
  requires: [src/db/queries/dashboard.ts, src/hooks/useUnits.ts, src/features/dashboard/DashboardPage.tsx]
  provides: [ArmyReadinessCard, useArmyReadiness, useArmyReadinessTarget, getArmyReadinessByFaction]
  affects: [dashboard, army-readiness cache]
tech_stack:
  added: []
  patterns: [React Query, localStorage persistence, TDD red-green, INNER JOIN aggregation]
key_files:
  created:
    - src/db/queries/dashboard.ts (FactionReadiness interface + getArmyReadinessByFaction function)
    - src/hooks/useArmyReadiness.ts
    - src/features/dashboard/ArmyReadinessCard.tsx
    - tests/dashboard/armyReadinessQuery.test.ts
    - tests/dashboard/ArmyReadinessCard.test.tsx
  modified:
    - src/features/dashboard/DashboardPage.tsx
    - src/hooks/useUnits.ts
    - tests/foundation/useUnits.test.ts
    - tests/dashboard/DashboardPage.test.tsx
    - tests/dashboard/DashboardPageDS08.test.tsx
decisions:
  - "INNER JOIN (not LEFT JOIN) in getArmyReadinessByFaction — factions with 0 units excluded from readiness card to keep it clean"
  - "useArmyReadinessTarget localStorage key: 'army-readiness:target'; ARMY_READINESS_TARGETS validates reads so corrupt values fall back to 2000"
  - "FactionRow progress bar capped at 100% via Math.min(100, ...) even when points_painted > target; text still shows actual number"
  - "ArmyReadinessCard added below RecentActivityFeed in flex-col gap-6 wrapper in populated and loading states"
  - "DashboardPage.test.tsx and DashboardPageDS08.test.tsx mocks updated to include getArmyReadinessByFaction (returns []) to avoid mock gap errors"
metrics:
  duration_seconds: 821
  completed_date: "2026-05-06"
  tasks_completed: 3
  files_created: 5
  files_modified: 5
requirements: [PANEL-04, PANEL-05]
requirements_completed: [PANEL-04, PANEL-05]
---

# Phase 32 Plan 01: Army Readiness Card Summary

**One-liner:** Per-faction battle-ready points card with localStorage-persisted target selector (500/1000/1500/2000 pts), faction-colored progress bars, and gold text when target is met.

## Tasks Completed

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Data layer — query function, hooks, and unit tests | Done | b282e62 (feat), b011dc8 (test RED) |
| 2 | ArmyReadinessCard component with tests | Done | 65cb822 (feat), 73a95ef (test RED) |
| 3 | DashboardPage wiring + cache invalidation + integration tests | Done | 5ce204e |

## What Was Built

### Data Layer (Task 1)

`getArmyReadinessByFaction` in `src/db/queries/dashboard.ts`:
- INNER JOIN to exclude factions with 0 units
- `COALESCE(u.points, 0)` for null-safe point aggregation
- `status_painting = 'Completed'` (canonical value, not 'Complete')
- `ORDER BY f.name ASC` for stable ordering
- Returns `FactionReadiness[]` with faction_id, faction_name, color_theme, points_owned, points_painted

`src/hooks/useArmyReadiness.ts`:
- `ARMY_READINESS_KEY = ["army-readiness"]` — React Query cache key
- `ARMY_READINESS_TARGETS = [500, 1000, 1500, 2000]` — valid threshold values
- `useArmyReadiness()` — React Query hook
- `useArmyReadinessTarget()` — localStorage hook with 2000 default, validation, and effect-based persistence

### Component (Task 2)

`src/features/dashboard/ArmyReadinessCard.tsx`:
- Section header "Army Readiness" with `text-sm font-semibold uppercase tracking-widest text-muted-foreground`
- 4 target buttons with `variant={target === t ? "default" : "ghost"}` conditional
- Per-faction `FactionRow` with progress bar using `backgroundColor: row.color_theme` inline style, capped at 100%
- Points text format: `{points_painted} / {target} pts ready, {points_owned} pts owned`
- `text-battle-gold` when `points_painted >= target`
- Empty state with `Shield` icon + "Add units to see army readiness"
- Loading state with `Skeleton` placeholders

### Wiring (Task 3)

`src/features/dashboard/DashboardPage.tsx`:
- Import `ArmyReadinessCard` from `./ArmyReadinessCard`
- Populated state: `<RecentActivityFeed>` and `<ArmyReadinessCard>` wrapped in `<div className="flex flex-col gap-6">`
- Loading skeleton right column updated to match with two `Skeleton` elements

`src/hooks/useUnits.ts`:
- `useCreateUnit`, `useUpdateUnit`, `useDeleteUnit` each invalidate `["army-readiness"]` on success

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DashboardPage.test.tsx and DashboardPageDS08.test.tsx mock gap**
- **Found during:** Task 3 verification
- **Issue:** Both test files mock `@/db/queries/dashboard` with only `getDashboardStats`. Adding `getArmyReadinessByFaction` to the module caused Vitest to throw "No getArmyReadinessByFaction export is defined on the mock" when `ArmyReadinessCard` was rendered as part of `DashboardPage`.
- **Fix:** Added `getArmyReadinessByFaction: vi.fn().mockResolvedValue([])` and `getRecentActivity: vi.fn().mockResolvedValue({ sessions: [], battles: [] })` to both mocks.
- **Files modified:** `tests/dashboard/DashboardPage.test.tsx`, `tests/dashboard/DashboardPageDS08.test.tsx`
- **Commit:** 5ce204e

**2. [Rule 1 - Bug] Unused React import in ArmyReadinessCard.test.tsx**
- **Found during:** Task 3 — `pnpm build` TypeScript check
- **Issue:** `import React from "react"` was unused (React 19 JSX transform doesn't require it). TypeScript strict mode (`noUnusedLocals`) flagged it as error TS6133.
- **Fix:** Removed the unused import.
- **Files modified:** `tests/dashboard/ArmyReadinessCard.test.tsx`
- **Commit:** 5ce204e

## Test Results

- Full suite: 684 passed, 0 failed (flaky timing test in `recentActivityQuery.test.ts` passes on its own and in repeated runs — pre-existing issue)
- `pnpm build`: TypeScript + Vite build pass, 0 type errors

## Self-Check

Files exist:
- `src/db/queries/dashboard.ts` — FOUND (contains getArmyReadinessByFaction)
- `src/hooks/useArmyReadiness.ts` — FOUND
- `src/features/dashboard/ArmyReadinessCard.tsx` — FOUND
- `tests/dashboard/armyReadinessQuery.test.ts` — FOUND
- `tests/dashboard/ArmyReadinessCard.test.tsx` — FOUND

Commits verified:
- b011dc8 — test(32-01): add failing tests for army readiness data layer
- b282e62 — feat(32-01): add getArmyReadinessByFaction query + useArmyReadiness hooks
- 73a95ef — test(32-01): add failing tests for ArmyReadinessCard component
- 65cb822 — feat(32-01): implement ArmyReadinessCard component
- 5ce204e — feat(32-01): wire ArmyReadinessCard into dashboard + cache invalidation

## Self-Check: PASSED

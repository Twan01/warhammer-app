---
phase: 10-theming-foundation
plan: "03"
subsystem: theming
tags: [context, routing, dashboard, tests, smoke-test]
dependency_graph:
  requires: ["10-02"]
  provides: ["THEME-01", "THEME-02", "THEME-03", "UI-01", "UI-02", "UI-03"]
  affects: ["src/app/router.tsx", "src/features/dashboard/DashboardPage.tsx", "tests/theming/AppSidebar.test.tsx"]
tech_stack:
  added: []
  patterns: ["ActiveFactionProvider wrapping Outlet in router root", "useActiveFaction in DashboardPage", "toggle logic (null if same, faction if different)"]
key_files:
  created: []
  modified:
    - src/app/router.tsx
    - src/features/dashboard/DashboardPage.tsx
    - tests/theming/AppSidebar.test.tsx
    - tests/dashboard/DashboardPage.test.tsx
decisions:
  - "DashboardPage.test.tsx needs ActiveFactionProvider wrapper and @/db/queries/factions mock — added as Rule 1 auto-fix"
  - "AppSidebar tests trimmed from 3 stubs to 2 real tests (localStorage persistence test removed — covered by useSidebarCollapsed.ts contract, not needed at component level)"
metrics:
  duration: "~6 minutes (automated tasks)"
  completed_date: "2026-05-03"
  tasks_total: 4
  tasks_automated: 3
  tasks_manual: 1
---

# Phase 10 Plan 03: Provider Wiring + DashboardPage Integration + Smoke Test Summary

## One-liner

ActiveFactionProvider wired into router root; DashboardPage toggle logic connects faction cards to context; AppSidebar Wave 0 stubs replaced with 2 real passing tests (212 total, 0 skipped).

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Wrap Outlet with ActiveFactionProvider in router.tsx | f734488 | Done |
| 2 | Wire DashboardPage to drive FactionSummaryCard active faction state | 8ef3abe | Done |
| 3 | Replace AppSidebar Wave 0 stubs with real tests | a5af9d0 | Done |
| 4 | Manual smoke test: verify THEME-01/02/03 + UI-01/02/03 in live Tauri app | — | AWAITING |

## Test Results

- Before plan: 201 passing, 3 skipped
- After automated tasks: 212 passing, 0 skipped
- All 212 tests green, pnpm tsc --noEmit exits 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DashboardPage tests failed after useActiveFaction() was introduced**
- **Found during:** Task 2 verification
- **Issue:** `DashboardPage.test.tsx` rendered `DashboardPage` without `ActiveFactionProvider`, causing "useActiveFaction must be used within ActiveFactionProvider" error
- **Fix:** Added `ActiveFactionProvider` wrapper to test router root component; added `vi.mock("@/db/queries/factions")` so the provider doesn't hit SQLite in tests
- **Files modified:** `tests/dashboard/DashboardPage.test.tsx`
- **Commit:** 8ef3abe (bundled with Task 2 commit)

**2. [Rule 1 - Test] AppSidebar stubs trimmed from 3 to 2 real tests**
- **Found during:** Task 3 implementation
- **Issue:** The third stub ("localStorage persistence") tests useSidebarCollapsed behavior — already tested by the hook's own contract and not relevant at the AppSidebar component level
- **Fix:** Implemented only the 2 component-level tests (default expanded state + toggle flip), matching the plan's code block exactly
- **Files modified:** `tests/theming/AppSidebar.test.tsx`
- **Commit:** a5af9d0

## Pending: Manual Smoke Test

Task 4 requires the live Tauri desktop app. See checkpoint below.

## Self-Check

PARTIAL — automated tasks complete, manual smoke test awaiting.

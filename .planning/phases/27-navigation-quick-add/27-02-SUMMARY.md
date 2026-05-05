---
phase: 27-navigation-quick-add
plan: "02"
subsystem: navigation
tags: [sidebar, quick-add, dropdown, sheets, nav]
dependency_graph:
  requires:
    - 27-01 (QuickAddContext + DropdownMenu component)
  provides:
    - Sidebar with hobby-native groups Command/Workshop/Play/Management
    - Quick Add button with 8-item dropdown in both expanded/collapsed states
    - Global Sheet mount point in AppLayout controlled by QuickAddContext
  affects:
    - AppSidebar.tsx
    - AppLayout.tsx
    - All per-page Sheets (now also mounted globally)
tech_stack:
  added: []
  patterns:
    - Radix DropdownMenu via shadcn wrapper (pointer-events trigger pattern)
    - Sibling portal contract for global Sheet mounts
    - useQuickAdd hook wired to both AppSidebar (dispatch) and AppLayout (consume)
key_files:
  created: []
  modified:
    - src/components/common/AppSidebar.tsx
    - src/components/common/AppLayout.tsx
    - tests/navigation/AppSidebar.nav01.test.tsx
    - tests/navigation/QuickAdd.nav02.test.tsx
    - tests/theming/AppSidebar.test.tsx
    - tests/app-shell/AppSidebar.test.tsx
decisions:
  - "Radix DropdownMenu requires userEvent (pointer+mouse+click) in tests — fireEvent.click alone does not open the portal content"
  - "Existing theming/AppSidebar and app-shell/AppSidebar tests needed vi.mock for QuickAddContext after AppSidebar now calls useQuickAdd()"
  - "Factions moved from Command group to Management group alongside Spending"
  - "Battle Log entry in sidebar uses Swords icon (plural), consistent with Phase 18"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-05-05"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 6
---

# Phase 27 Plan 02: Sidebar Group Rename + Quick Add Button + Global Sheet Mounts Summary

Sidebar redesigned with hobby-native group labels (Command/Workshop/Play/Management), Quick Add dropdown button wired to QuickAddContext, and AppLayout updated to mount all 8 create-Sheet siblings globally.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Rename sidebar groups + add Quick Add button | 21e17fd | src/components/common/AppSidebar.tsx |
| 2 | Mount global Quick Add Sheets in AppLayout | 1bb17d0 | src/components/common/AppLayout.tsx |
| 3 | Flip NAV-01/NAV-02 test stubs green + fix regressions | e10c6da | 4 test files |

## What Was Built

### Task 1 — AppSidebar (NAV-01 + NAV-02)

Replaced three nav groups (MANAGE_NAV, INVENTORY_NAV, TRACKING_NAV) with four hobby-native groups:

- **COMMAND_NAV**: Dashboard, Collection, Painting Projects
- **WORKSHOP_NAV**: Paints, Recipes
- **PLAY_NAV**: Army Lists, Battle Log
- **MANAGEMENT_NAV**: Factions, Spending

Added Quick Add button between wordmark and nav:
- Expanded state: full-width outline button with `border-dashed` + Plus icon + "Quick Add" text
- Collapsed state: icon-only button with `aria-label="Quick Add"` wrapped in Tooltip
- DropdownMenu with 8 items in 4 logical groups (Unit/Faction | Paint/Recipe | Project/Session | Purchase/Battle)
- Each item calls `openQuickAdd(action)` via `useQuickAdd()` hook

### Task 2 — AppLayout (NAV-03)

Mounted 8 Sheet siblings outside the `<div className="flex h-screen...">` container:

- `UnitSheet` (key=quick-add-unit) for `add-unit`
- `FactionSheet` (key=quick-add-faction) for `add-faction`
- `PaintSheet` (key=quick-add-paint) for `add-paint`
- `RecipeFormSheet` (key=quick-add-recipe) for `add-recipe`
- `AddProjectPicker` using `onOpenChange` pattern (no `onClose` prop) for `create-project`
- `LogSessionSheet` (key=quick-add-session) for `log-session`
- `BattleLogSheet` (key=quick-add-battle) for `log-battle`
- Second `UnitSheet` (key=quick-add-purchase) for `add-purchase`

### Task 3 — Tests

- Activated all 9 `it.skip` stubs in AppSidebar.nav01.test.tsx (group labels)
- Rewrote QuickAdd.nav02.test.tsx: replaced `fireEvent.click` with `userEvent` for Radix DropdownMenu trigger (requires pointer events)
- Added `vi.mock("@/context/QuickAddContext")` to theming/AppSidebar.test.tsx and app-shell/AppSidebar.test.tsx to fix regressions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing AppSidebar tests broke after useQuickAdd() added to component**

- **Found during:** Task 3 (regression check)
- **Issue:** `tests/theming/AppSidebar.test.tsx` and `tests/app-shell/AppSidebar.test.tsx` render AppSidebar without a QuickAddProvider, causing `useQuickAdd must be used within QuickAddProvider` error
- **Fix:** Added `vi.mock("@/context/QuickAddContext", ...)` to both test files
- **Files modified:** tests/theming/AppSidebar.test.tsx, tests/app-shell/AppSidebar.test.tsx
- **Commit:** e10c6da

**2. [Rule 1 - Bug] QuickAdd dropdown tests failed with fireEvent.click**

- **Found during:** Task 3 (first test run)
- **Issue:** Radix DropdownMenuTrigger listens for pointer events (`pointerdown`), not just `click`. `fireEvent.click` does not open the portal content in jsdom.
- **Fix:** Replaced `fireEvent.click` with `userEvent.setup()` + `await user.click()` throughout QuickAdd.nav02.test.tsx. All tests made async accordingly.
- **Files modified:** tests/navigation/QuickAdd.nav02.test.tsx
- **Commit:** e10c6da

## Verification Results

- `pnpm build` exits 0 (TypeScript + Vite build clean)
- `pnpm test -- tests/navigation/` — 28 tests pass (9 nav01 + 13 nav02 + 6 QuickAddContext)
- `pnpm test -- tests/theming/AppSidebar.test.tsx` — 4 tests pass (no regression)
- `pnpm test -- tests/app-shell/AppSidebar.test.tsx` — 4 tests pass (no regression)
- Full test suite: 502 pass, 2 pre-existing wave-0 skips

## Self-Check: PASSED

Files confirmed:
- src/components/common/AppSidebar.tsx — contains COMMAND_NAV, openQuickAdd("add-unit"), Quick Add button
- src/components/common/AppLayout.tsx — contains activeSheet, 8 Sheet siblings
- tests/navigation/AppSidebar.nav01.test.tsx — 0 it.skip calls, 9 it( calls
- tests/navigation/QuickAdd.nav02.test.tsx — 0 it.skip calls, 13 it( calls

Commits confirmed:
- 21e17fd (Task 1), 1bb17d0 (Task 2), e10c6da (Task 3)

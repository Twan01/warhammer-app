---
phase: 08-army-list-builder
plan: "04"
subsystem: army-lists
tags: [army-lists, page-assembly, routing, navigation, unit-delete, testing]
dependency_graph:
  requires: [08-00, 08-01, 08-02, 08-03]
  provides: [ArmyListsPage, ArmyListsEmptyState, /army-lists route, sidebar nav, enhanced UnitDeleteDialog]
  affects: [src/app/router.tsx, src/components/common/AppSidebar.tsx, src/features/units/UnitDeleteDialog.tsx]
tech_stack:
  added: []
  patterns: [sibling portal architecture, N parallel hooks for per-card totals, useQuery inline in dialog, TDD RED/GREEN cycle]
key_files:
  created:
    - src/features/army-lists/ArmyListsEmptyState.tsx
    - src/features/army-lists/ArmyListsPage.tsx
    - src/app/army-lists/page.tsx
  modified:
    - src/app/router.tsx
    - src/components/common/AppSidebar.tsx
    - src/features/units/UnitDeleteDialog.tsx
    - tests/army-list/ArmyListsPage.test.tsx
    - tests/army-list/UnitDeleteDialog.test.tsx
decisions:
  - "Loading skeleton test required async waitFor wrapper because RouterProvider renders asynchronously before route component mounts — synchronous querySelectorAll returned 0 elements without it"
  - "ArmyListsPage uses N parallel useArmyListWithUnits hooks via ArmyListCardWrapper — acceptable at personal-use scale (max ~10 lists expected)"
  - "UnitDeleteDialog warning body uses template literal matching UI-SPEC §Copywriting Contract exactly: double-quoted unit name, pluralized 'list/lists', comma-separated names"
metrics:
  duration: "8 minutes"
  completed_date: "2026-05-02"
  tasks_completed: 2
  files_changed: 8
---

# Phase 8 Plan 04: Army Lists Page Wire-Up and UnitDeleteDialog Enhancement Summary

**One-liner:** ArmyListsPage assembled with 4 sibling portals composing all plan 01-03 components, /army-lists route registered, sidebar nav added, UnitDeleteDialog enhanced with army-list membership pre-check (ARMY-05 closed), 5 stub tests now passing (178 total).

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | ArmyListsPage wire-up + route + sidebar nav | 197f22e | ArmyListsEmptyState.tsx, ArmyListsPage.tsx, src/app/army-lists/page.tsx, router.tsx, AppSidebar.tsx, ArmyListsPage.test.tsx |
| 2 | Enhance UnitDeleteDialog with ARMY-05 pre-check | 8b6d5d5 | UnitDeleteDialog.tsx, UnitDeleteDialog.test.tsx |

## What Was Built

### Task 1: ArmyListsPage Assembly (ARMY-06, ARMY-07)

**ArmyListsEmptyState** — centered Swords icon, "Build your first army list" heading, muted body copy, "New List" CTA button. Mirrors PaintsEmptyState structure exactly.

**ArmyListsPage** — root page component owning all portal state. Implements Pattern 2 sibling portal architecture: 4 portals at page root (`<ArmyListDetailSheet>`, `<ArmyListSheet>`, `<ArmyListDeleteDialog>`, `<UnitPickerDialog>`), never nested. Per-card unit totals loaded via N parallel `useArmyListWithUnits` hooks in `ArmyListCardWrapper`. Handles loading (3 Skeleton cards), error ("Failed to load army lists. Try refreshing the app."), empty state (ArmyListsEmptyState), and populated state (responsive grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).

**Route + Nav** — `armyListsRoute` registered at `/army-lists` in router.tsx. `ClipboardList` icon added to AppSidebar MAIN_NAV as 7th entry after Paints.

**Tests** — 3 real assertions replacing `describe.skip` stub from plan 00: empty state (findByText "Build your first army list"), loading state (waitFor + querySelectorAll(".animate-pulse") >= 3), populated state (findByText "List A", getByText "List B", getByRole heading "Army Lists").

### Task 2: UnitDeleteDialog Enhancement (ARMY-05)

Enhanced `UnitDeleteDialog` with a `useQuery` call to `getArmyListsByUnitId(unit.id)` when `open && unit !== null`. Two conditional rendering branches:
- **Normal path** (0 lists): unchanged "Delete unit?" title + "Delete" button (regression-safe)
- **Warning path** (N > 0 lists): "This unit is in active army lists" title + body naming each list + "Delete Anyway" destructive button + "Keep Unit" outline button

Warning body template per UI-SPEC §Copywriting Contract: `"${unit.name}" is in ${N} army list${s}: ${names}. Deleting it will also remove it from those lists.`

**Tests** — 2 real assertions replacing `describe.skip` stub: normal state (findByText "Delete unit?", getByRole "Delete"), warning state (findByText "This unit is in active army lists", getByText regex matching both list names).

## Verification

- `pnpm tsc --noEmit`: exits 0
- `pnpm test -- --run`: 178 passing, 0 failing, 0 skipped (25 test files)
- `pnpm test -- --run tests/army-list`: all 7 tests across 3 files passing

## Requirements Closed

- **ARMY-05**: UnitDeleteDialog army-list membership pre-check — CLOSED
- **ARMY-06**: ArmyListsEmptyState "Build your first army list" CTA — CLOSED
- **ARMY-07**: /army-lists route + sidebar nav entry — CLOSED

## Sibling Portal Architecture (4 portals at page root)

```
ArmyListsPage
  ├── <ArmyListDetailSheet />   (list detail view)
  ├── <ArmyListSheet />         (create/edit form)
  ├── <ArmyListDeleteDialog />  (list delete confirm)
  └── <UnitPickerDialog />      (unit add command palette)
```

All 4 portals are siblings — none is nested inside another (Pitfall 1 preserved).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Loading skeleton test required async waitFor wrapper**
- **Found during:** Task 1 (loading state test, GREEN phase)
- **Issue:** `container.querySelectorAll(".animate-pulse")` returned 0 elements synchronously. `RouterProvider` renders asynchronously — the route component isn't mounted on the first synchronous tick.
- **Fix:** Wrapped the querySelectorAll assertion in `await waitFor(() => { ... })`. Also added `waitFor` to imports. The test spec behavior was preserved; only the assertion timing changed.
- **Files modified:** tests/army-list/ArmyListsPage.test.tsx
- **Commit:** 197f22e

## Self-Check: PASSED

Files exist:
- FOUND: src/features/army-lists/ArmyListsEmptyState.tsx
- FOUND: src/features/army-lists/ArmyListsPage.tsx
- FOUND: src/app/army-lists/page.tsx
- FOUND: src/app/router.tsx (modified)
- FOUND: src/components/common/AppSidebar.tsx (modified)
- FOUND: src/features/units/UnitDeleteDialog.tsx (modified)
- FOUND: tests/army-list/ArmyListsPage.test.tsx (modified)
- FOUND: tests/army-list/UnitDeleteDialog.test.tsx (modified)

Commits exist:
- FOUND: 197f22e (feat(08-04): ArmyListsPage wire-up)
- FOUND: 8b6d5d5 (feat(08-04): enhance UnitDeleteDialog)

---
phase: 90-loadout-builder
plan: 02
subsystem: army-lists
tags: [loadout-builder, sheet-component, tier-selector, wargear-display, tests]
dependency_graph:
  requires: [90-01 (query functions, hooks, row refactor)]
  provides: [LoadoutBuilderSheet component, sibling portal wiring, full test suite]
  affects: [ArmyListsPage.tsx]
tech_stack:
  added: []
  patterns: [sibling portal Sheet, grouped wargear display, tier selector with Default item]
key_files:
  created:
    - src/features/army-lists/LoadoutBuilderSheet.tsx
  modified:
    - src/features/army-lists/ArmyListsPage.tsx
    - tests/army-lists/LoadoutBuilderSheet.test.tsx
decisions:
  - "Delta badge only shown when a tier is already selected (not on initial render)"
  - "factionIdStr derived from unit.faction_id with listFactionId fallback for ghost units"
  - "resolveUnitPoints mocked in tests to avoid cascading Tooltip/hook dependencies"
metrics:
  duration: "~7 minutes"
  completed: "2026-05-20"
  tasks: 3
  files_changed: 3
---

# Phase 90 Plan 02: LoadoutBuilderSheet Component + Wiring Summary

LoadoutBuilderSheet with tier selector (DL-01) and wargear display (DL-02), wired as sibling portal from ArmyListsPage with 9 passing tests.

## What Was Built

### Task 1: LoadoutBuilderSheet Component (70e05ba)
- Created `src/features/army-lists/LoadoutBuilderSheet.tsx` (261 lines) as a right-side Sheet
- Section 1: Model Count tier selector using `useTiersByUnitName` + `useSetSelectedModelCount`/`useClearSelectedModelCount` with `__default__` first item
- Section 2: Wargear options grouped by `group_name` via `groupByGroupName` helper, with Default/Exclusive badges (SQLite boolean `=== 1` comparison)
- Ghost unit support: shows "Planned" badge when `unit.unit_id === null`
- Points override warning when `unit.points_override !== null` (Pitfall 6)
- `factionIdStr` always derived as `string | null` for synced table queries (Pitfall 1)
- `PointsSourceChip` reused in `SheetDescription` for points display

### Task 2: ArmyListsPage Sibling Portal Wiring (94abe38)
- Added `loadoutUnitId` state and derived `loadoutUnit` from `useArmyListWithUnits` cache
- Wired `openLoadout` callback to `ArmyListDetailSheet.onConfigureUnit` (replacing no-op from Plan 01)
- Rendered `LoadoutBuilderSheet` as sibling portal after `UnitPickerDialog`
- `closeDetail` handler now also resets `loadoutUnitId` to null

### Task 3: Full Test Suite (72b739e)
- Implemented all 9 test stubs from Plan 01 scaffold
- Tests cover: tier rendering, tier selection mutation, Default clear mutation, wargear grouping, Default badge, Exclusive badge, empty wargear state, ghost unit Planned badge, points override warning
- All 9 tests pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed "Default" text collision in test**
- **Found during:** Task 3
- **Issue:** `screen.getByText("Default")` matched multiple elements (SelectTrigger value + wargear Default badges)
- **Fix:** Changed to `screen.getAllByText("Default")` with `length >= 1` assertion
- **Files modified:** tests/army-lists/LoadoutBuilderSheet.test.tsx
- **Commit:** 72b739e

## Verification

- `pnpm build` passes with no type errors (verified after Task 1 and Task 2)
- `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx` -- 9/9 tests pass

## Self-Check: PASSED

All 3 key files verified present. All 3 task commits verified in git log.

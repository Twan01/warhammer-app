---
phase: 90-loadout-builder
plan: 01
subsystem: army-lists
tags: [data-layer, hooks, ui-refactor, loadout-builder]
dependency_graph:
  requires: [Phase 89 schema + data layer]
  provides: [getLoadoutOptionsForUnit, getTiersByUnitName, useLoadoutOptionsForUnit, useTiersByUnitName, Configure trigger, onConfigureUnit callback]
  affects: [ArmyListUnitRow, ArmyListDetailSheet, ArmyListsPage]
tech_stack:
  added: []
  patterns: [TEXT-based synced table lookup, sibling portal callback threading]
key_files:
  created:
    - src/hooks/useLoadoutOptions.ts
    - tests/army-lists/LoadoutBuilderSheet.test.tsx
  modified:
    - src/db/queries/bsdataExtended.ts
    - src/db/queries/syncedUnitPoints.ts
    - src/features/army-lists/ArmyListUnitRow.tsx
    - src/features/army-lists/ArmyListDetailSheet.tsx
    - src/features/army-lists/ArmyListsPage.tsx
    - tests/army-list/armyListHookInvalidations.test.ts
decisions:
  - "Configure trigger shows active tier label (N models + Npts) or 'Configure' when none selected"
  - "No-op onConfigureUnit wired in ArmyListsPage as placeholder for Plan 02 LoadoutBuilderSheet"
metrics:
  duration: "~7 minutes"
  completed: "2026-05-20"
  tasks: 3
  files_changed: 8
---

# Phase 90 Plan 01: Data Layer + Row Refactor Summary

Query functions and hooks for unit-level wargear/tier lookup; ArmyListUnitRow refactored from inline tier selector to Configure trigger with onConfigureUnit callback threading.

## What Was Built

### Task 1: Query Functions + Hooks (05eea73)
- Added `getLoadoutOptionsForUnit(unitName, factionId)` to `bsdataExtended.ts` -- queries `synced_loadout_options` by unit name and TEXT faction_id
- Added `getTiersByUnitName(unitName, factionId)` to `syncedUnitPoints.ts` -- queries `synced_unit_point_tiers` for ghost unit support (D-10)
- Created `src/hooks/useLoadoutOptions.ts` with `useLoadoutOptionsForUnit` and `useTiersByUnitName` hooks, both with `enabled: unitName !== undefined` guard and 5-minute staleTime

### Task 2: ArmyListUnitRow + ArmyListDetailSheet Refactor (2b3e986)
- Removed the entire inline tier selector (Phase 24 lines 269-312): `pendingTierId` state, `candidatePoints` memo, delta badge, Confirm button, `useUpdateUnit` and `useUnitPointTiers` hooks
- Added compact Configure trigger button with Settings2 icon showing tier label (`N models + Npts` or `Configure`)
- Added `onConfigure: () => void` to `ArmyListUnitRowProps`
- Added `onConfigureUnit: (armyListUnitId: number) => void` to `ArmyListDetailSheetProps`
- Wired no-op `onConfigureUnit` in ArmyListsPage (Plan 02 will replace with LoadoutBuilderSheet state)

### Task 3: Test Scaffold (ad5ef12)
- Created `tests/army-lists/LoadoutBuilderSheet.test.tsx` with vi.mock blocks for `useArmyLists` and `useLoadoutOptions`
- `makeUnit()` factory function with all ArmyListUnitRow fields
- `mockTiers` and `mockWargearOptions` test data arrays
- 9 test stubs covering DL-01, DL-02, ghost units, and points override

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing type error in armyListHookInvalidations.test.ts**
- **Found during:** Task 1 (pnpm build verification)
- **Issue:** Parameter `c` had implicit `any` type on line 69
- **Fix:** Added explicit type annotation `(c: [{ queryKey: unknown }])`
- **Files modified:** tests/army-list/armyListHookInvalidations.test.ts
- **Commit:** 05eea73

**2. [Rule 3 - Blocking] Added no-op onConfigureUnit to ArmyListsPage**
- **Found during:** Task 2
- **Issue:** Plan said ArmyListsPage type error was "expected and resolved in Plan 02" but this would break `pnpm build`
- **Fix:** Added no-op callback `onConfigureUnit={() => {}}` with comment indicating Plan 02 will wire it
- **Files modified:** src/features/army-lists/ArmyListsPage.tsx
- **Commit:** 2b3e986

## Verification

- `pnpm build` passes with no type errors
- `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx` -- 9/9 tests pass (stubs)

## Self-Check: PASSED

All 6 key files verified present. All 3 task commits verified in git log.

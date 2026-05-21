---
phase: 93-datasheet-browser-ghost-units
plan: 01
subsystem: army-lists
tags: [datasheet-browser, ghost-units, dialog, command-palette]
dependency_graph:
  requires: [89-schema-data-layer, 90-loadout-builder]
  provides: [DatasheetBrowserDialog, browse-datasheets-trigger]
  affects: [ArmyListsPage, ArmyListDetailSheet]
tech_stack:
  added: []
  patterns: [sibling-portal-dialog, role-grouped-command-palette, ghost-unit-add-via-name]
key_files:
  created:
    - src/features/army-lists/DatasheetBrowserDialog.tsx
    - tests/army-lists/DatasheetBrowserDialog.test.tsx
  modified:
    - src/features/army-lists/ArmyListsPage.tsx
    - src/features/army-lists/ArmyListDetailSheet.tsx
decisions:
  - DatasheetBrowserDialog uses Dialog + Command palette with multiple CommandGroup per role
  - Role Badge shown per item alongside points display for quick visual scanning
  - Ghost unit name passed as ds.name (canonical string) not ds.id per D-10
metrics:
  duration: 7m
  completed: 2026-05-21
---

# Phase 93 Plan 01: Datasheet Browser Dialog Summary

**One-liner:** Dialog component with Command palette for browsing faction datasheets and adding ghost/planned units via canonical name to army lists.

## What Was Built

### Task 1: DatasheetBrowserDialog component (e397287)
- Created `DatasheetBrowserDialog.tsx` with Dialog + Command palette architecture cloned from UnitPickerDialog
- Groups datasheets by role field (Character, Battleline, Other) using multiple CommandGroup elements
- Each item shows: datasheet name, role Badge (variant="secondary"), and points with "pts" suffix
- Resolves Wahapedia faction via useFactions + useWahapediaFactionId chain (D-03)
- Adds ghost units via useAddGhostUnitToList with `ghost_unit_name: ds.name` (D-10 critical)
- CommandItem value uses `${ds.name}-${ds.id}` template literal to avoid collision (Pitfall 5)
- Dialog stays open after each add for multi-add UX (D-04)
- Shows "Set a faction on this list to browse datasheets." when no Wahapedia mapping exists
- 4 tests: grouped rendering, ghost unit add with ds.name, empty state, dialog stays open

### Task 2: Sibling portal wiring (95b6fe7)
- Added `datasheetBrowserOpen` state to ArmyListsPage
- Rendered DatasheetBrowserDialog as sibling portal after LoadoutBuilderSheet
- Added `onBrowseDatasheets` callback prop to ArmyListDetailSheet
- Added "Browse Datasheets" button with BookOpen icon in the Units header (flex row with gap-2 alongside existing "Add Unit")
- `closeDetail` handler resets `datasheetBrowserOpen` to false (same pattern as unitPickerOpen)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `pnpm test -- tests/army-lists/DatasheetBrowserDialog.test.tsx`: 4/4 passed
- `npx tsc --noEmit`: Zero errors from modified files (one pre-existing error in tests/army-lists/ArmyListUnitRow.test.tsx unrelated to this plan)

## Known Stubs

None.

## Self-Check: PASSED

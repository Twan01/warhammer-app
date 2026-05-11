---
phase: 54-army-lists-2-0-detachment-selection
plan: "01"
subsystem: army-lists
tags: [detachment, combobox, stale-data, rules-hub, tdd]
dependency_graph:
  requires:
    - useDetachmentsByFaction (useRulesExtended.ts)
    - useClearArmyListDetachment (useArmyLists.ts)
    - useWahapediaFactionId (useDatasheet.ts)
    - useRulesSyncMeta (useDatasheet.ts)
  provides:
    - DetachmentPicker component (faction-scoped Combobox)
    - StaleDataBanner component (amber warning for >30-day stale rules)
    - ArmyListDetailSheet wired with both components
  affects:
    - src/features/army-lists/ArmyListDetailSheet.tsx
tech_stack:
  added: []
  patterns:
    - Popover+Command Combobox pattern (matches PaintCombobox.tsx)
    - Pure presentational banner component with inline stale check
    - useClearArmyListDetachment for NULL passthrough (COALESCE bypass)
key_files:
  created:
    - src/features/army-lists/DetachmentPicker.tsx
    - src/features/army-lists/StaleDataBanner.tsx
    - tests/army-list/DetachmentPicker.test.tsx
    - tests/army-list/StaleDataBanner.test.tsx
  modified:
    - src/features/army-lists/ArmyListDetailSheet.tsx
    - tests/army-list/ArmyListsPage.test.tsx
decisions:
  - "useWahapediaFactionId placed after faction useMemo to avoid temporal dead zone reference"
  - "StaleDataBanner uses inline ageDays > 30 check (not getSyncFreshness which uses 14-day threshold)"
  - "ArmyListsPage.test.tsx required mock additions for clearArmyListDetachment, datasheets, and rulesExtended"
metrics:
  duration_minutes: 13
  completed_date: "2026-05-11"
  tasks_completed: 2
  files_changed: 6
---

# Phase 54 Plan 01: DetachmentPicker and StaleDataBanner Summary

**One-liner:** DetachmentPicker Combobox scoped to Wahapedia faction + StaleDataBanner amber warning for rules data older than 30 days, both wired into ArmyListDetailSheet.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create DetachmentPicker and StaleDataBanner with TDD tests | 3bf8f59 |
| 2 | Wire both components into ArmyListDetailSheet | b9f063a |

## What Was Built

**DetachmentPicker** (`src/features/army-lists/DetachmentPicker.tsx`):
- Searchable Combobox using Popover+Command pattern (matches PaintCombobox.tsx)
- Populates from `useDetachmentsByFaction(factionWahapediaId)` — passes `undefined` when disabled to skip query
- Disabled state shows "Select a faction first" with disabled button
- Clear button (X icon, `aria-label="Clear detachment"`) stops propagation and calls `onClear`
- Trigger shows `valueName` when value set, "Select detachment..." placeholder when null

**StaleDataBanner** (`src/features/army-lists/StaleDataBanner.tsx`):
- Pure presentational component — no hooks, accepts `lastSyncAt: string | null | undefined`
- Renders amber alert div with AlertTriangle icon when data is null or age > 30 days strictly
- Returns `null` when data is fresh (30 days or fewer)
- Does NOT use `getSyncFreshness` (14-day threshold) — uses own inline 30-day check

**ArmyListDetailSheet** wiring:
- Added `useClearArmyListDetachment`, `useRulesSyncMeta`, `useWahapediaFactionId` hooks
- `useWahapediaFactionId(faction?.name)` placed after `faction` useMemo to avoid temporal dead zone
- `handleDetachmentSelect`: calls `updateArmyList.mutate({ id, detachment_id, detachment_name })`
- `handleDetachmentClear`: calls `clearDetachment.mutate(list.id)` — NOT updateArmyList (COALESCE blocks NULL)
- JSX block inserted between `<ArmyListSummaryBar />` and Units toolbar

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ArmyListsPage.test.tsx missing mocks for newly imported query modules**
- **Found during:** Task 2 verification (pnpm test)
- **Issue:** Adding `useClearArmyListDetachment`, `useRulesSyncMeta`, `useWahapediaFactionId` to `ArmyListDetailSheet` caused 3 test failures in `ArmyListsPage.test.tsx` — the existing mock for `@/db/queries/armyLists` was missing `clearArmyListDetachment` and `getArmyListReadiness`, and no mocks existed for `@/db/queries/datasheets` or `@/db/queries/rulesExtended`
- **Fix:** Added `clearArmyListDetachment` and `getArmyListReadiness` to armyLists mock; added new mocks for `datasheets` and `rulesExtended` query modules
- **Files modified:** `tests/army-list/ArmyListsPage.test.tsx`
- **Commit:** b9f063a

**2. [Rule 1 - Bug] Unused TypeScript imports in test file**
- **Found during:** Task 2 build verification
- **Issue:** `UseQueryResult` import and `onClear` destructuring in `DetachmentPicker.test.tsx` triggered `noUnusedLocals` TypeScript errors
- **Fix:** Removed unused import and changed destructuring to plain `renderPicker()`
- **Files modified:** `tests/army-list/DetachmentPicker.test.tsx`
- **Commit:** b9f063a

## Self-Check: PASSED

Files verified present:
- `src/features/army-lists/DetachmentPicker.tsx` — FOUND
- `src/features/army-lists/StaleDataBanner.tsx` — FOUND
- `tests/army-list/DetachmentPicker.test.tsx` — FOUND
- `tests/army-list/StaleDataBanner.test.tsx` — FOUND

Commits verified:
- `3bf8f59` — feat(54-01): create DetachmentPicker and StaleDataBanner components
- `b9f063a` — feat(54-01): wire DetachmentPicker and StaleDataBanner into ArmyListDetailSheet

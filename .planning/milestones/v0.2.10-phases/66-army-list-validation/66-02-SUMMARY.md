---
phase: 66-army-list-validation
plan: "02"
subsystem: army-list-data-layer
tags: [migration, queries, hooks, tactical-role, points-limit]
dependency_graph:
  requires: [66-01]
  provides: [tactical_role column, clearArmyListPointsLimit query+hook, getArmyListWithUnits tactical_role]
  affects: [army-list-builder UI, health panel]
tech_stack:
  added: []
  patterns: [NULL-clearing query pattern, full-replacement UPDATE]
key_files:
  created:
    - src-tauri/migrations/025_tactical_role.sql
  modified:
    - src-tauri/src/lib.rs
    - src/db/queries/armyLists.ts
    - src/hooks/useArmyLists.ts
decisions:
  - "clearArmyListPointsLimit follows clearArmyListDetachment pattern for COALESCE NULL-clearing"
  - "tactical_role added to getArmyListWithUnits SELECT between notes and created_at"
metrics:
  duration: 160s
  completed: 2026-05-13T12:49:44Z
---

# Phase 66 Plan 02: Data Layer Extensions for Tactical Role and Points Limit Clearing Summary

Migration 025 adds tactical_role TEXT column to army_list_units; queries extended with tactical_role SELECT and clearArmyListPointsLimit; hooks wired with useClearArmyListPointsLimit.

## What Was Done

### Task 1: Migration 025 + lib.rs registration + query extensions (ee1211a)
- Created `src-tauri/migrations/025_tactical_role.sql` with ALTER TABLE army_list_units ADD COLUMN tactical_role TEXT DEFAULT NULL
- Registered migration 025 in `src-tauri/src/lib.rs` (version 25, description "tactical_role")
- Extended `getArmyListWithUnits` SELECT to include `alu.tactical_role` in the column list
- Added `clearArmyListPointsLimit` function following the `clearArmyListDetachment` NULL-clearing pattern
- Note: `updateArmyListUnit` already had `tactical_role=$4` from Plan 66-01's type+query extension

### Task 2: Hook extensions (2a41e1b)
- Added `clearArmyListPointsLimit` to imports from `@/db/queries/armyLists`
- Created `useClearArmyListPointsLimit` hook following `useClearArmyListDetachment` pattern
- Invalidates ARMY_LISTS_KEY, ARMY_LIST_KEY(id), ARMY_LIST_UNITS_KEY(id), and ["dashboard-stats"]
- Verified `useUpdateArmyListUnit` already spreads `tactical_role` via `({ list_id: _list_id, ...rest })` destructuring

## Deviations from Plan

None - plan executed exactly as written. The updateArmyListUnit SQL was already extended by Plan 66-01, so Task 1 action #4 was a no-op (already present).

## Verification

- `pnpm build` passed after Task 1 and Task 2
- Migration file exists at `src-tauri/migrations/025_tactical_role.sql`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | ee1211a | feat(66-02): migration 025 tactical_role + query extensions |
| 2 | 2a41e1b | feat(66-02): useClearArmyListPointsLimit hook + verify tactical_role spread |

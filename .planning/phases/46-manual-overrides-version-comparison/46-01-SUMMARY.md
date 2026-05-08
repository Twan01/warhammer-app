---
phase: 46-manual-overrides-version-comparison
plan: "01"
subsystem: data-layer
tags: [unit-overrides, sqlite-migration, react-query, army-lists, sync-diff, tdd]
dependency_graph:
  requires:
    - 45-01 (rules_snapshot table, capturePreSyncSnapshot, RulesSnapshotRow)
    - 016_rules_snapshot.sql migration
    - src/db/queries/strategyNotes.ts (select-then-upsert pattern)
    - src/hooks/useStrategyNote.ts (hook pattern)
  provides:
    - unit_overrides table in hobbyforge.db
    - UnitOverride type + UpsertUnitOverrideInput type
    - getUnitOverride / upsertUnitOverride / deleteUnitOverride query functions
    - useUnitOverride / useUpsertUnitOverride / useDeleteUnitOverride hooks
    - computeSyncDiff pure function + SyncDiff interface
    - Extended 3-level COALESCE in army list queries
  affects:
    - src/db/queries/armyLists.ts (COALESCE chain extended)
    - src-tauri/src/lib.rs (migration 017 registered)
    - Plan 46-02 (wires these into PlaybookTab UI)
tech_stack:
  added:
    - 017_unit_overrides.sql migration (version 17 in hobbyforge.db get_migrations())
  patterns:
    - select-then-upsert pattern (matching strategyNotes.ts)
    - Per-unit query key factory: UNIT_OVERRIDE_KEY = (unitId) => ["unit-override", unitId]
    - Army list cache invalidation symmetry: useUpsert and useDelete both invalidate ["army-list"]
    - Pure function with Map-based O(n) set comparison for diff
key_files:
  created:
    - src-tauri/migrations/017_unit_overrides.sql
    - src/types/unitOverride.ts
    - src/db/queries/unitOverrides.ts
    - src/hooks/useUnitOverride.ts
    - src/lib/computeSyncDiff.ts
    - tests/collection/unitOverrideQueries.test.ts
    - tests/datasheet/computeSyncDiff.test.ts
  modified:
    - src/db/queries/armyLists.ts (LEFT JOIN unit_overrides + 3-level COALESCE in getArmyListWithUnits + getArmyListReadiness)
    - src-tauri/src/lib.rs (migration 017 registered)
    - tests/foundation/armyListQueries.test.ts (assertion updated for new COALESCE)
decisions:
  - "select-then-upsert used for upsertUnitOverride even though unit_overrides.unit_id has UNIQUE — matches established codebase convention from strategyNotes.ts"
  - "Army list effective_points now uses 3-level COALESCE: alu.points_override > uo.points > u.points, so per-army-list overrides take priority over global unit overrides"
  - "computeSyncDiff returns empty diff (not error) when snapshotData is null — first-time sync has no baseline"
  - "Rule 1 auto-fix: updated tests/foundation/armyListQueries.test.ts to assert new LEFT JOIN + 3-level COALESCE pattern"
metrics:
  duration_seconds: 473
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_created: 7
  files_modified: 3
---

# Phase 46 Plan 01: Override Data Infrastructure and Sync Diff Computation Summary

**One-liner:** Unit override data layer (SQLite migration, types, get/upsert/delete queries, React Query hook with army-list cache invalidation, 3-level COALESCE extension) plus pure computeSyncDiff function comparing pre/post-sync rw_datasheets snapshots.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration, types, query module, hook, army list COALESCE extension | 3003ee7 | 017_unit_overrides.sql, unitOverride.ts, unitOverrides.ts, useUnitOverride.ts, armyLists.ts, lib.rs, unitOverrideQueries.test.ts |
| 2 | computeSyncDiff pure function with tests | 87521a6 | computeSyncDiff.ts, computeSyncDiff.test.ts |

## What Was Built

### Task 1: Override Data Layer

**Migration (`017_unit_overrides.sql`):** Creates `unit_overrides` table in `hobbyforge.db` with `unit_id INTEGER NOT NULL UNIQUE REFERENCES units(id) ON DELETE CASCADE` and 9 nullable override columns (points, move, toughness, save, wounds, leadership, objective_control, keywords, abilities). NULL means "inherit from Wahapedia import".

**Types (`src/types/unitOverride.ts`):** `UnitOverride` interface mirrors the table. `UpsertUnitOverrideInput` type holds all user-editable fields — all nullable for partial overrides.

**Queries (`src/db/queries/unitOverrides.ts`):** Three exports using the select-then-upsert pattern from `strategyNotes.ts`:
- `getUnitOverride(unitId)` — returns `UnitOverride | null`
- `upsertUnitOverride(input)` — SELECT id first, then INSERT or UPDATE
- `deleteUnitOverride(unitId)` — DELETE by unit_id

**Hook (`src/hooks/useUnitOverride.ts`):** Three exports:
- `useUnitOverride(unitId?)` — `staleTime: Infinity`, disabled when `unitId === undefined`
- `useUpsertUnitOverride()` — invalidates `UNIT_OVERRIDE_KEY` + `["army-list"]` on success
- `useDeleteUnitOverride()` — same cache invalidation symmetry
- `UNIT_OVERRIDE_KEY = (unitId) => ["unit-override", unitId] as const`

**Army list COALESCE extension (`src/db/queries/armyLists.ts`):** Both `getArmyListWithUnits` and `getArmyListReadiness` now include `LEFT JOIN unit_overrides uo ON uo.unit_id = u.id`. The effective_points COALESCE chain extended from 2-level to 3-level: `COALESCE(alu.points_override, uo.points, u.points, 0)`. Priority: per-list override > global unit override > imported points.

**Rust migration registration (`src-tauri/src/lib.rs`):** Version 17 entry added after version 16.

### Task 2: computeSyncDiff Pure Function

**`src/lib/computeSyncDiff.ts`:** Exports `SyncDiff` interface and `computeSyncDiff(snapshotData, currentDatasheets)`. Uses two `Map` lookups for O(n) comparison. Returns `{ added, removed, renamed, total_changed }`. Handles null snapshotData gracefully (returns empty diff — no baseline available for first-time syncs).

## Verification

- `pnpm build` exits 0 (TypeScript passes, Vite builds)
- `tests/collection/unitOverrideQueries.test.ts` — 9 tests, all pass
- `tests/datasheet/computeSyncDiff.test.ts` — 7 tests, all pass
- Full test suite: 129 files passed, 1016 tests passed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated armyListQueries.test.ts to match new COALESCE**
- **Found during:** Task 1 — running full test suite after armyLists.ts edits
- **Issue:** `tests/foundation/armyListQueries.test.ts` line 46 asserted the old 2-level `COALESCE(alu.points_override, u.points, 0)` pattern. The new 3-level COALESCE with LEFT JOIN broke that assertion (1 test failed).
- **Fix:** Updated the test description and assertion to check for `LEFT JOIN unit_overrides uo ON uo.unit_id = u.id` and `COALESCE(alu.points_override, uo.points, u.points, 0) AS effective_points`.
- **Files modified:** `tests/foundation/armyListQueries.test.ts`
- **Commit:** 3003ee7

## Self-Check: PASSED

Files verified to exist:
- `src-tauri/migrations/017_unit_overrides.sql` — FOUND
- `src/types/unitOverride.ts` — FOUND
- `src/db/queries/unitOverrides.ts` — FOUND
- `src/hooks/useUnitOverride.ts` — FOUND
- `src/lib/computeSyncDiff.ts` — FOUND
- `tests/collection/unitOverrideQueries.test.ts` — FOUND
- `tests/datasheet/computeSyncDiff.test.ts` — FOUND

Commits verified:
- 3003ee7 — feat(46-01): unit overrides data layer — FOUND
- 87521a6 — feat(46-01): computeSyncDiff pure function — FOUND

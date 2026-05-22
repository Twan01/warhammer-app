---
phase: 95-version-snapshots
plan: 01
subsystem: army-list-snapshots
tags: [data-layer, migration, react-query, snapshots]
dependency_graph:
  requires: []
  provides: [army_list_snapshots-table, snapshot-crud, snapshot-hooks, snapshot-diff]
  affects: [army-lists, army-list-units, army-list-enhancements]
tech_stack:
  added: []
  patterns: [safety-snapshot-before-restore, ghost-unit-fallback, set-based-diff]
key_files:
  created:
    - src-tauri/migrations/032_army_list_snapshots.sql
    - src/db/queries/armyListSnapshots.ts
    - src/hooks/useArmyListSnapshots.ts
    - src/lib/snapshotDiff.ts
    - tests/army-list/armyListSnapshots.test.ts
    - tests/army-list/snapshotDiff.test.ts
  modified:
    - src/types/armyList.ts
decisions:
  - "D-01: army_list_snapshots table with id, list_id, label, snapshot_data, total_points, created_at"
  - "D-03: snapshot_data excluded from list queries via explicit column SELECT"
  - "D-09/D-10: Destructive restore with auto-save safety snapshot labeled 'Auto-save before restore'"
  - "D-12: Ghost unit fallback when unit_id lookup fails during restore"
metrics:
  duration: 565s
  completed: 2026-05-22
  tasks: 2/2
  files_created: 6
  files_modified: 1
  test_count: 15
---

# Phase 95 Plan 01: Version Snapshots Data Layer Summary

Complete data layer for army list version snapshots: SQLite migration, TypeScript types, query CRUD with restore, React Query hooks, pure diff utility, and 15 unit tests.

## Task Completion

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Migration + Types + Query Module | 36b957a | 032_army_list_snapshots.sql, armyList.ts, armyListSnapshots.ts |
| 2 | Hooks + Diff Utility + Tests | 98bb4ba | useArmyListSnapshots.ts, snapshotDiff.ts, 2 test files |

## What Was Built

**Migration (032):** Creates `army_list_snapshots` table with 6 columns (id, list_id, label, snapshot_data, total_points, created_at) and index on list_id. Follows 031 conventions with AUTOINCREMENT and expression default.

**Types:** Three new interfaces appended to armyList.ts: `ArmyListSnapshot` (excludes snapshot_data per D-03), `CreateSnapshotInput`, `RestoreSnapshotInput`.

**Query Module:** Five exported functions:
- `getSnapshotsByList` -- excludes snapshot_data, ORDER BY created_at DESC
- `getSnapshotData` -- fetches raw JSON blob by snapshot id
- `createSnapshot` -- INSERT with $1-$4 params
- `deleteSnapshot` -- DELETE by id
- `restoreSnapshot` -- complex multi-step operation: fetch/parse JSON, build unit name-to-id lookup, auto-save safety snapshot, delete existing units (CASCADE), re-insert units with ghost fallback, re-insert enhancements

**React Query Hooks:** SNAPSHOTS_KEY factory, useSnapshotsByList, useCreateSnapshot, useDeleteSnapshot, useRestoreSnapshot (invalidates 6 cache keys).

**Diff Utility:** Pure `computeSnapshotDiff` function using Set-based name matching. Returns pointsDelta, unitsAdded, unitsRemoved, unitsCommon.

**Tests:** 10 query tests (list, create, delete, restore safety, restore ghost fallback, invalid JSON, not found) + 5 diff tests (basic, points delta, empty, identical, swapped).

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. Restore enhancement re-assignment uses reverse lookup from nameToId map to match unit names to newly inserted army_list_units rows, supporting both real and ghost units.
2. JSON.parse wrapped in try/catch per T-95-01 threat mitigation -- throws typed error for React Query onError handling.

## Known Stubs

None -- all functions are fully implemented with no placeholder data.

## Self-Check: PASSED

- All 6 created files verified on disk
- Both commits (36b957a, 98bb4ba) verified in git log

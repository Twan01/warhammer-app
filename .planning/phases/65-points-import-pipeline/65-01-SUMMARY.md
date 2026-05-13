---
phase: 65-points-import-pipeline
plan: 01
title: "Points Schema, Queries & Delta TDD"
subsystem: data-layer
tags: [migration, schema, tdd, coalesce, points]
dependency_graph:
  requires: []
  provides: [rw_datasheet_points, points_import_history, synced_unit_points, computePointsDelta, 5-level-coalesce]
  affects: [armyLists.ts, lib.rs, datasheet.ts]
tech_stack:
  added: []
  patterns: [denormalized-cache, cross-db-solution, pure-delta-function]
key_files:
  created:
    - src-tauri/migrations/rules_004_datasheet_points.sql
    - src-tauri/migrations/024_points_import_history.sql
    - src/types/pointsDelta.ts
    - src/db/queries/pointsImportHistory.ts
    - src/db/queries/syncedUnitPoints.ts
    - src/lib/computePointsDelta.ts
    - tests/datasheet/computePointsDelta.test.ts
    - tests/datasheet/pointsSchema.test.ts
  modified:
    - src-tauri/src/lib.rs
    - src/types/datasheet.ts
    - src/db/queries/armyLists.ts
decisions:
  - "Separate rw_datasheet_points table in rules.db (not columns on rw_datasheets) for clean sync lifecycle"
  - "synced_unit_points cache in hobbyforge.db solves cross-DB JOIN problem (Research Pitfall 1 Option B)"
  - "5-level COALESCE: alu.points_override > sup.points > uo.points > u.points > 0"
  - "Dashboard queries intentionally NOT updated (D-09: different concern)"
metrics:
  duration: "6 minutes"
  completed: "2026-05-13T10:46:16Z"
  tasks_completed: 2
  tasks_total: 2
  test_count: 11
  files_created: 8
  files_modified: 3
---

# Phase 65 Plan 01: Points Schema, Queries & Delta TDD Summary

JWT-style one-liner: Two SQL migrations (rules_004, 024) establishing points schema in both databases, denormalized synced_unit_points cache solving cross-DB JOIN, 5-level COALESCE chain at all 3 army list query sites, and TDD-driven computePointsDelta pure function.

## What Was Done

### Task 1: Migrations + types + query modules + computePointsDelta TDD
- Created `rules_004_datasheet_points.sql` with `rw_datasheet_points` table (UNIQUE on datasheet_name, faction_id) plus `ALTER TABLE rw_sync_meta ADD COLUMN points_count`
- Created `024_points_import_history.sql` with `points_import_history` audit table and `synced_unit_points` denormalized cache table
- Registered migration 24 in `get_migrations()` and rules migration 4 in `get_rules_migrations()` in lib.rs
- Added `points_count: number | null` to `RulesSyncMeta` interface
- Created `PointsDelta` and `PointsDeltaDetail` types
- Implemented `insertPointsImportHistory` and `getLatestPointsImportHistory` query functions
- Implemented `replaceSyncedUnitPoints` (DELETE + INSERT loop) and `getSyncedUnitPointsMap` (returns Map keyed by "unit_name:faction_id")
- Implemented `computePointsDelta` pure function with key parsing (handles "null" faction_id string)
- TDD: 7 test cases for computePointsDelta, 4 test cases for schema contracts -- all 11 pass

### Task 2: Update 3 COALESCE sites to 5-level chain
- Updated `getArmyListWithUnits` with `LEFT JOIN synced_unit_points sup` and 5-level COALESCE
- Updated `getArmyListReadiness` total_points SUM with 5-level COALESCE
- Updated `getArmyListReadiness` battle_ready_points CASE with 5-level COALESCE
- Both COALESCE sites in getArmyListReadiness updated atomically per D-08
- Dashboard queries (`dashboard.ts`) intentionally NOT modified per D-09

## TDD Gate Compliance

1. RED commit `43f365d` -- `test(65-01): add failing tests...` (9 tests failing, 2 passing)
2. GREEN commit `6ea5518` -- `feat(65-01): implement points schema...` (all 11 tests passing)
3. No separate refactor needed -- implementation was clean on first pass

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `pnpm test -- tests/datasheet/computePointsDelta.test.ts tests/datasheet/pointsSchema.test.ts` -- 11/11 pass
- `pnpm build` (tsc --noEmit) -- clean, zero errors
- Full suite: 3 pre-existing failures (SyncStatusCard date test, unrelated) -- no regressions

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 43f365d | test(65-01): add failing tests for points delta, schema contracts, and query modules |
| 2 | 6ea5518 | feat(65-01): implement points schema, migrations, query modules, and computePointsDelta |
| 3 | a022ea7 | feat(65-01): update 3 COALESCE sites to 5-level chain with synced_unit_points JOIN |

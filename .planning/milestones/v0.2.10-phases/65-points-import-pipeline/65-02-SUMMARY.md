---
phase: 65-points-import-pipeline
plan: 02
title: "Rust bulk_sync_rules Extension + Sync Pipeline"
subsystem: sync-pipeline
tags: [rust, sync, points, delta, cache-invalidation]
dependency_graph:
  requires: [rw_datasheet_points, points_import_history, synced_unit_points, computePointsDelta]
  provides: [points-sync-pipeline, points-delta-flow, army-list-invalidation]
  affects: [useRulesSync.ts, lib.rs, validateCsvHeaders.ts, rulesSnapshot.ts, computeSyncDiff.ts]
tech_stack:
  added: []
  patterns: [graceful-404-fetch, pre-post-sync-snapshot, best-effort-post-processing]
key_files:
  created: []
  modified:
    - src-tauri/src/lib.rs
    - src/hooks/useRulesSync.ts
    - src/lib/validateCsvHeaders.ts
    - src/db/queries/rulesSnapshot.ts
    - src/lib/computeSyncDiff.ts
    - tests/datasheet/useRulesSync.test.ts
decisions:
  - "Graceful try-catch for Datasheets_points.csv instead of adding to RULES_SYNC_FILES (T-65-04)"
  - "Points post-processing (delta, cache, history) wrapped in best-effort try-catch"
  - "Army list invalidation added to onSuccess with exact: false"
metrics:
  duration: "8 minutes"
  completed: "2026-05-13T10:57:00Z"
  tasks_completed: 2
  tasks_total: 2
  test_count: 10
  files_created: 0
  files_modified: 6
---

# Phase 65 Plan 02: Rust bulk_sync_rules Extension + Sync Pipeline Summary

Extended Rust bulk_sync_rules with points table INSERT (serde default for backward compat) and wired full TypeScript sync pipeline: graceful points CSV fetch, pre/post delta computation, synced_unit_points cache population, import history logging, and army list cache invalidation.

## What Was Done

### Task 1: Extend Rust bulk_sync_rules with points table
- Added `points: Vec<JsRow>` with `#[serde(default)]` to `BulkSyncPayload` for backward compatibility
- Added `pub points: u64` to `SyncResult` struct
- Added `rw_datasheet_points` to the DELETE loop (cleared every sync)
- Added INSERT INTO rw_datasheet_points loop following established pattern (extract datasheet_name, skip if empty, bind faction_id and points)
- Added `points_count` column and binding to rw_sync_meta INSERT OR REPLACE
- cargo check passes clean

### Task 2: Extend useRulesSync with points fetch, delta, cache, and invalidation
- Added `points: number` to `RustSyncResult` interface (mirrors Rust struct)
- Implemented graceful try-catch fetch for `Datasheets_points.csv` AFTER main Promise.all -- 404 or any error sets pointsRows to empty array, sync proceeds
- Added `Datasheets_points.csv` to `REQUIRED_HEADERS` with columns `["datasheet_name", "points"]`
- Added `rw_datasheet_points` to `SNAPSHOT_TABLES` in rulesSnapshot.ts
- Added `points` field to `ExtendedSnapshotData` interface (type completeness)
- Pre-sync: reads current rw_datasheet_points from rules.db into preSyncPointsMap
- Post-sync: reads new rw_datasheet_points, calls computePointsDelta, calls replaceSyncedUnitPoints, calls insertPointsImportHistory -- all wrapped in best-effort try-catch
- Added points to invoke payload and rowCounts return
- Added pointsDelta to return type
- onSuccess now invalidates `["army-lists"]` and `["army-list-readiness"]` (D-20)
- Updated test: expects 12 invalidation calls (was 10), asserts army-lists and army-list-readiness keys
- All 10 useRulesSync tests pass

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `cargo check` in src-tauri/ -- passes clean
- `pnpm test -- tests/datasheet/useRulesSync.test.ts` -- all 10 tests pass
- `pnpm build` -- passes clean (tsc + Vite)
- Pre-existing failures: schema-shape tests (not related to this plan)

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 1b5ed73 | feat(65-02): extend Rust bulk_sync_rules with points table INSERT |
| 2 | c8b56a4 | feat(65-02): extend sync pipeline with points CSV, delta, cache, and army list invalidation |

## Self-Check: PASSED

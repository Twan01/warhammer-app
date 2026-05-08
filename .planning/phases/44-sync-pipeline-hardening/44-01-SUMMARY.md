---
phase: 44-sync-pipeline-hardening
plan: "01"
subsystem: sync-pipeline
tags: [rust, sqlite, typescript, tdd, sync, migration]
dependency_graph:
  requires: []
  provides: [SyncResult, validateCsvHeaders, insertSyncError, getSyncErrors, migration-015]
  affects: [useRulesSync, PlaybookTab]
tech_stack:
  added: []
  patterns: [sqlx-rows-affected, tdd-red-green, migration-append-only, getDb-pattern]
key_files:
  created:
    - src-tauri/migrations/015_sync_errors.sql
    - src/lib/validateCsvHeaders.ts
    - src/db/queries/syncErrors.ts
    - tests/datasheet/validateCsvHeaders.test.ts
    - tests/datasheet/syncErrorQueries.test.ts
  modified:
    - src-tauri/src/lib.rs
decisions:
  - "SyncResult struct fields use pub visibility for Tauri IPC serialization via serde::Serialize"
  - "rw_datasheet_keywords INSERT changed from plain INSERT to INSERT OR IGNORE to prevent intra-sync duplicates"
  - "sync_errors migration is version 15 in hobbyforge.db get_migrations() (not rules_migrations)"
  - "validateCsvHeaders uses map-based REQUIRED_HEADERS rather than per-file functions"
metrics:
  duration: "13m"
  completed_date: "2026-05-08"
  tasks_completed: 3
  files_changed: 6
requirements: [SYNC-01, SYNC-03, SYNC-04]
---

# Phase 44 Plan 01: Sync Pipeline Hardening Foundations Summary

**One-liner:** Rust bulk_sync_rules returns SyncResult with 11 per-table INSERT counts via rows_affected(), plus CSV header validation module and sync_errors persistence layer with full test coverage.

## What Was Built

Three foundational artifacts for the sync pipeline hardening:

1. **Rust SyncResult struct** (`src-tauri/src/lib.rs`) — `#[derive(serde::Serialize)]` struct with 11 `u64` fields (one per data table). `bulk_sync_rules` return type changed from `Result<(), String>` to `Result<SyncResult, String>`. Each INSERT loop now captures the sqlx execute result and accumulates `res.rows_affected()` into the corresponding count field. `rw_datasheet_keywords` INSERT fixed to `INSERT OR IGNORE` (was the only table without this). Migration version 15 registered in `get_migrations()`.

2. **CSV header validation** (`src/lib/validateCsvHeaders.ts`) — Pure TypeScript function with a `REQUIRED_HEADERS` map covering all 11 known CSV filenames. Throws `${filename}: CSV is empty or header-only` for empty rows arrays. Throws `${filename}: missing required columns: ${missing.join(", ")}` for missing headers. Unknown filenames pass through silently.

3. **sync_errors persistence** (`src-tauri/migrations/015_sync_errors.sql` + `src/db/queries/syncErrors.ts`) — New table in hobbyforge.db (not rules.db) with CHECK constraint on `error_type`. Query module exports `insertSyncError()` and `getSyncErrors()` via `getDb()` singleton.

## Verification Results

- `cargo check` — passes (Rust compiles with SyncResult return type)
- `pnpm test -- tests/datasheet/validateCsvHeaders.test.ts` — 7 tests, all green
- `pnpm test -- tests/datasheet/syncErrorQueries.test.ts` — 3 tests, all green
- `pnpm build` — TypeScript compilation succeeds, 2790 modules transformed

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 2fc9936 | feat(44-01): add SyncResult struct with per-table row counts to bulk_sync_rules |
| Task 2 | d767870 | feat(44-01): add CSV header validation module with tests (SYNC-03) |
| Task 3 | 9c14c1f | feat(44-01): add sync_errors query module with tests (SYNC-04) |

## Deviations from Plan

None — plan executed exactly as written.

## Pre-existing Out-of-Scope Issues

`tests/datasheet/useRulesExtended.test.tsx` fails (untracked file from Phase 43, not created by this plan). Logged per deviation Rule boundary — out-of-scope, pre-existing.

## Self-Check: PASSED

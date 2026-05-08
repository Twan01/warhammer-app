---
phase: 45-sync-metadata-import-tracking
plan: "01"
subsystem: rules-sync-data-layer
tags: [migrations, rust, typescript, snapshot, freshness, react-query]
dependency_graph:
  requires: [phase-44-sync-pipeline]
  provides: [rules_snapshot-table, rw_sync_meta-count-columns, RulesSyncMeta-extended, capturePreSyncSnapshot, useRulesSyncErrors, getSyncFreshness]
  affects: [rules.db, hobbyforge.db, src/types/datasheet.ts, src-tauri/src/lib.rs]
tech_stack:
  added: []
  patterns: [dual-db-snapshot-pattern, freshness-tier-computation, rules-migration-v3]
key_files:
  created:
    - src-tauri/migrations/rules_003_sync_meta_counts.sql
    - src-tauri/migrations/016_rules_snapshot.sql
    - src/db/queries/rulesSnapshot.ts
    - src/hooks/useSyncErrors.ts
    - src/lib/syncFreshness.ts
    - tests/datasheet/rulesSnapshot.test.ts
    - tests/datasheet/syncFreshness.test.ts
  modified:
    - src-tauri/src/lib.rs
    - src/types/datasheet.ts
decisions:
  - "rules_snapshot lives in hobbyforge.db (not rules.db) — rules.db is wiped on every sync"
  - "cleanOldSnapshots keeps 3 most recent groups (11 rows each) to bound table growth"
  - "Composite-PK tables (models, abilities, keywords, wargear) store null snapshot_data and COUNT(*) only"
  - "getSyncFreshness thresholds: <7 days = fresh, 7-14 = aging, >=14 = stale"
  - "useSyncErrors uses staleTime: 0 since error data changes on every failed sync"
  - "Rust upsert casts u64 to i64 for sqlx binding (SQLite INTEGER range)"
metrics:
  duration_seconds: 271
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_changed: 9
---

# Phase 45 Plan 01: Sync Metadata Import Tracking — Data Infrastructure Summary

**One-liner:** SQL migrations (11 rw_sync_meta count columns + rules_snapshot DDL), Rust upsert extended with 13 bound parameters, TypeScript type extended with 11 nullable count fields, and three new modules (rulesSnapshot.ts, useSyncErrors.ts, syncFreshness.ts) with 18 passing tests.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Migrations, Rust upsert, TypeScript type extension | e9cbcfa | rules_003_sync_meta_counts.sql, 016_rules_snapshot.sql, lib.rs, datasheet.ts |
| 2 | Snapshot query module, sync errors hook, freshness utility | 0205b17 | rulesSnapshot.ts, useSyncErrors.ts, syncFreshness.ts, 2 test files |

## What Was Built

### Task 1 — Migrations and type extension

- `rules_003_sync_meta_counts.sql` — 11 `ALTER TABLE rw_sync_meta ADD COLUMN` statements (factions_count through detachment_abilities_count, all nullable INTEGER)
- `016_rules_snapshot.sql` — `CREATE TABLE IF NOT EXISTS rules_snapshot` in hobbyforge.db with `id, captured_at, wahapedia_version, table_name, row_count, snapshot_data` columns
- `lib.rs` — registered rules migration version 3 (`sync_meta_counts`) and hobbyforge migration version 16 (`rules_snapshot`)
- `lib.rs` — extended bulk_sync_rules upsert from 2 bindings to 13 bindings (last_sync_at, wahapedia_version + 11 counts cast u64→i64)
- `src/types/datasheet.ts` — `RulesSyncMeta` interface extended with 11 `number | null` count fields; existing `getRulesSyncMeta()` SELECT * query picks them up automatically

### Task 2 — Query module, hook, and utility

- `rulesSnapshot.ts` — `capturePreSyncSnapshot` (reads 11 rw_* tables from rules.db, writes 11 rows to hobbyforge.db, calls `cleanOldSnapshots(3)`) + `cleanOldSnapshots` + `getLatestSnapshot`; SNAPSHOT_TABLES array has 11 entries with 7 simple-PK tables (store id+name JSON) and 4 composite-PK tables (store COUNT only)
- `useSyncErrors.ts` — `useRulesSyncErrors` hook with `staleTime: 0`, exports `SYNC_ERRORS_KEY`
- `syncFreshness.ts` — `getSyncFreshness` (fresh/aging/stale/never tiers), `getSyncAgeLabel` (human-readable string), `FRESHNESS_DOT_CLASS` (CSS class map)

## Verification

- `pnpm build` — passed (TypeScript + Vite, no errors)
- `pnpm test -- tests/datasheet/rulesSnapshot.test.ts tests/datasheet/syncFreshness.test.ts` — all 18 new tests passed
- Full test suite: 990 passed, 0 failed

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified present:
- src-tauri/migrations/rules_003_sync_meta_counts.sql — FOUND
- src-tauri/migrations/016_rules_snapshot.sql — FOUND
- src/db/queries/rulesSnapshot.ts — FOUND
- src/hooks/useSyncErrors.ts — FOUND
- src/lib/syncFreshness.ts — FOUND
- tests/datasheet/rulesSnapshot.test.ts — FOUND
- tests/datasheet/syncFreshness.test.ts — FOUND

Commits verified:
- e9cbcfa — FOUND (feat(45-01): migrations, Rust upsert extension, TypeScript type extension)
- 0205b17 — FOUND (feat(45-01): snapshot query module, sync errors hook, freshness utility)

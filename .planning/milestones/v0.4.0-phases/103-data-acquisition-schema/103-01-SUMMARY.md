---
phase: 103-data-acquisition-schema
plan: "01"
subsystem: database
tags: [migration, schema, fts5, udb, sqlite]
dependency_graph:
  requires: []
  provides: [udb_* tables, udb_search FTS5, migration-038]
  affects: [lib.rs, db-helpers.ts]
tech_stack:
  added: []
  patterns: [CREATE VIRTUAL TABLE fts5, CHECK(id=1) single-row table, ON DELETE CASCADE]
key_files:
  created:
    - src-tauri/migrations/038_udb_schema.sql
    - tests/data-layer/migration038.test.ts
  modified:
    - src-tauri/src/lib.rs
    - tests/data-layer/db-helpers.ts
decisions:
  - "udb_search FTS5 virtual table appears in sqlite_master with type='table' — test filters shadow tables by name suffix to isolate regular tables"
  - "Migration 037_override_flags.sql was missing from db-helpers.ts HOBBYFORGE_MIGRATIONS — added alongside 038 as a parity fix"
metrics:
  duration: 15m
  completed: "2026-05-29"
---

# Phase 103 Plan 01: UDB Schema Migration Summary

**One-liner:** SQLite migration 038 creates 9 udb_* tables + FTS5 virtual table with FK/UNIQUE/CHECK constraints and cascade deletes for the canonical 40k unit database.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create migration 038 + register in lib.rs and db-helpers.ts | 9a01b73 | 038_udb_schema.sql, lib.rs, db-helpers.ts |
| 2 | Write migration 038 schema verification tests | 8a36c20 | migration038.test.ts |

## What Was Built

Migration `038_udb_schema.sql` establishes the full canonical unit database schema:

**Regular tables (9):**
- `udb_factions` — TEXT PK, name, short_name, updated_at
- `udb_units` — TEXT PK, FK to udb_factions, name, role, base_points, damaged_w, damaged_desc
- `udb_unit_models` — model profiles per datasheet (M/T/Sv/inv_sv/W/Ld/OC)
- `udb_unit_weapons` — ranged and melee weapon profiles per unit
- `udb_unit_abilities` — special rules and ability text per unit
- `udb_unit_keywords` — FACTION KEYWORDS and regular KEYWORDS per unit
- `udb_unit_points` — model-count based points tiers (UNIQUE unit_id+model_count)
- `udb_unit_composition` — min/max models per unit build
- `udb_meta` — single-row version tracking (CHECK(id=1))

**Virtual table (1):**
- `udb_search` — FTS5 virtual table for full-text search over unit_id, name, faction_name, keywords

**FK indexes (6):** All child tables have FK column indexes.

**Parity fixes:** Added `037_override_flags.sql` (previously missing from db-helpers.ts) and updated HOBBYFORGE_MIGRATION_COUNT comment from 33 to 38.

## Test Results

All 6 schema verification tests pass:
- creates all udb_* regular tables
- creates udb_search FTS5 virtual table
- udb_meta enforces CHECK(id=1)
- udb_units FK to udb_factions is enforced
- udb_unit_points UNIQUE(unit_id, model_count) is enforced
- ON DELETE CASCADE removes child rows when unit deleted

Migration parity test also passes (lib.rs count matches db-helpers count: 38+4=42).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FTS5 virtual table appears in sqlite_master as type='table'**
- **Found during:** Task 2 — first test run
- **Issue:** The test `creates all udb_* regular tables` asserted `udb_search` would not appear when querying `sqlite_master WHERE type='table' AND name LIKE 'udb_%'`, but SQLite reports FTS5 virtual tables with type='table' in sqlite_master.
- **Fix:** Updated query to explicitly exclude `udb_search` by name and filter out FTS5 shadow table suffixes (_data, _idx, _content, _docsize, _config).
- **Files modified:** tests/data-layer/migration038.test.ts
- **Commit:** 8a36c20

## Threat Flags

None — migration is DDL-only with no user input surface, no network endpoints, no file access outside the migration directory. T-103-02 (no INSERT/seed data) verified: migration contains no INSERT statements.

## Known Stubs

None — this plan is schema-only (DDL + tests). No UI components or data flows.

## Self-Check: PASSED

- [x] `src-tauri/migrations/038_udb_schema.sql` exists
- [x] `src-tauri/src/lib.rs` contains `version: 38` entry
- [x] `tests/data-layer/db-helpers.ts` contains `037_override_flags.sql` and `038_udb_schema.sql`
- [x] `tests/data-layer/migration038.test.ts` exists with 6 tests
- [x] Commit `9a01b73` exists
- [x] Commit `8a36c20` exists

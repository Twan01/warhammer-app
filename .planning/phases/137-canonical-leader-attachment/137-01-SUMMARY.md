---
phase: 137-canonical-leader-attachment
plan: "01"
subsystem: database/migration
tags: [migration, schema, udb, leader-targets, parity-gate]
dependency_graph:
  requires: []
  provides: [udb_leader_targets table, migration-050-DDL, parity-gate-at-50]
  affects: [migration-parity-test, check-version-gate, Phase-137-Plan-02]
tech_stack:
  added: []
  patterns: [composite-PK-migration, disk-derived-migration-count, better-sqlite3-schema-test]
key_files:
  created:
    - src-tauri/migrations/050_udb_leader_targets.sql
    - tests/data-layer/leader-targets.test.ts
  modified:
    - src-tauri/src/lib.rs
decisions:
  - "D-01: New udb_leader_targets table (not repurposing synced_leader_targets)"
  - "D-02: Composite PK (leader_unit_id, target_unit_id) + both FK ON DELETE CASCADE + two indexes"
  - "D-03: Migration number 050 confirmed (048/049 already exist)"
  - "D-04: LF endings enforced; lib.rs version 50 added in same commit as .sql file"
metrics:
  duration: "8 minutes"
  completed: "2026-06-17T21:21:48Z"
  tasks: 2
  files: 3
---

# Phase 137 Plan 01: Migration 050 udb_leader_targets — Summary

**One-liner:** DDL-only migration 050 creates udb_leader_targets with composite PK and CASCADE FKs; parity gate advances from 49 to 50 across disk and lib.rs in one atomic commit.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Author migration 050 DDL + register version 50 in lib.rs | 464c74fa | src-tauri/migrations/050_udb_leader_targets.sql, src-tauri/src/lib.rs |
| 2 | Data-layer test for udb_leader_targets schema + parity | 8bbeb205 | tests/data-layer/leader-targets.test.ts |

## What Was Built

**Migration 050 (`050_udb_leader_targets.sql`):** DDL-only migration creating the `udb_leader_targets` table with:
- Composite `PRIMARY KEY (leader_unit_id, target_unit_id)` — mirrors `udb_unit_keywords` pattern
- Both columns `TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE`
- Two single-column indexes: `idx_udb_leader_targets_leader` and `idx_udb_leader_targets_target`
- LF line endings (verified via `git ls-files --eol` showing `w/lf`)

**lib.rs registration:** `Migration { version: 50, description: "udb_leader_targets", sql: include_str!("../migrations/050_udb_leader_targets.sql"), kind: MigrationKind::Up }` added immediately after version 49 in `get_migrations()`. Added in the same commit as the .sql file per Pitfall 3 (parity gate requires both to move together).

**Data-layer tests (`tests/data-layer/leader-targets.test.ts`):** 5 assertions using `@vitest-environment node` + better-sqlite3 with `PRAGMA foreign_keys = ON`:
1. Table exists in sqlite_master
2. Both columns are NOT NULL and have `pk > 0` (composite PK)
3. Two FK rows to udb_units both with `on_delete = 'CASCADE'`
4. Observable ON DELETE CASCADE: deleting a udb_units row removes referencing leader_targets rows
5. `INSERT OR IGNORE` composite PK dedup: duplicate pairs silently ignored

## Verification Results

- `pnpm check:version` exits 0: version match OK, 50==50 migration parity, no CR bytes
- `pnpm test -- tests/data-layer/leader-targets.test.ts`: 5/5 tests pass
- `pnpm test -- tests/data-layer/migration-parity.test.ts`: all 4 parity assertions pass with migration 050 in chain

## Deviations from Plan

None — plan executed exactly as written. Migration template from RESEARCH §Code Examples used verbatim. Pitfalls 2 (CRLF) and 3 (parity) both avoided by design.

## Known Stubs

None. This plan is DDL-only — the table exists but contains no data until Plan 02 (pipeline wiring) and the Rust importer supply `leader_targets` rows at runtime.

## Threat Flags

None. No new network endpoints, auth paths, or user-supplied SQL introduced. T-137-01 (CRLF tamper) mitigated by LF enforcement verified via `git ls-files --eol` and `pnpm check:version` Leg 3.

## Self-Check: PASSED

- `src-tauri/migrations/050_udb_leader_targets.sql` — exists (created in commit 464c74fa)
- `tests/data-layer/leader-targets.test.ts` — exists (created in commit 8bbeb205)
- `src-tauri/src/lib.rs` — contains `version: 50` (modified in commit 464c74fa)
- Commit 464c74fa exists in git log
- Commit 8bbeb205 exists in git log

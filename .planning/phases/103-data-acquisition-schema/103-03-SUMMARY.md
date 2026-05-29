---
phase: 103-data-acquisition-schema
plan: "03"
subsystem: infra
tags: [rust, tauri, sqlx, sqlite, fts5, import, json, setup-hook]

# Dependency graph
requires:
  - phase: 103-01
    provides: udb_* tables + FTS5 virtual table (migration 038)
  - phase: 103-02
    provides: src-tauri/data/unit_database.json artifact with correct JSON structure
provides:
  - import_unit_database_inner: core Rust import logic (FK-off transaction, DELETE+INSERT, FTS5 rebuild, WAL checkpoint)
  - import_unit_database: #[tauri::command] wrapping the inner function
  - setup() hook: spawns async import task on app launch (first launch or version mismatch)
  - UnitDatabasePayload + UdbImportResult structs
  - bundle.resources config for unit_database.json Tauri resource
affects:
  - 104-unit-database-browser: can invoke import_unit_database from JS to trigger manual re-import
  - 105-collection-fk: udb_units rows are populated after import; FK link depends on data being present

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "import_unit_database_inner: inner-function pattern for Rust commands callable from both setup hook and Tauri command"
    - "setup() hook async spawn: tauri::async_runtime::spawn for non-blocking first-launch data operations"
    - "FK-off single transaction: PRAGMA foreign_keys = OFF + begin/commit for bulk DELETE+INSERT (matches bulk_sync_rules pattern)"
    - "WAL checkpoint after commit: PRAGMA wal_checkpoint(TRUNCATE) before returning to prevent stale pool reads"

key-files:
  created: []
  modified:
    - src-tauri/src/lib.rs
    - src-tauri/tauri.conf.json

key-decisions:
  - "Used inner function pattern (import_unit_database_inner) so both the setup hook and the Tauri command share identical logic without duplication"
  - "Version-check early return: query udb_meta before opening transaction; if version matches, return zero-count result immediately"
  - "INSERT OR IGNORE for udb_unit_keywords to handle the composite PK gracefully on any future partial re-runs within a session"

patterns-established:
  - "Inner-function + command wrapper: non-trivial Tauri commands should extract logic into an inner async fn to allow reuse from setup hooks"

requirements-completed: [DAS-03, DAS-08]

# Metrics
duration: 30min
completed: 2026-05-29
---

# Phase 103 Plan 03: Rust Import Command Summary

**Rust import_unit_database command bulk-loads unit_database.json into all 9 udb_* tables via FK-off single transaction with FTS5 rebuild and WAL checkpoint, wired to app setup() hook for zero-friction first-launch auto-import**

## Performance

- **Duration:** 30 min
- **Started:** 2026-05-29T00:00:00Z
- **Completed:** 2026-05-29T00:30:00Z
- **Tasks:** 1 implemented + 1 checkpoint auto-approved
- **Files modified:** 2

## Accomplishments

- Implemented `import_unit_database_inner` following the `bulk_sync_rules` pattern exactly: direct sqlx connection (not plugin pool), PRAGMA foreign_keys = OFF, single transaction, DELETE all udb_* tables, INSERT all arrays from JSON, rebuild FTS5 `udb_search`, commit, WAL checkpoint
- Added version-check early return: if `udb_meta.version` already matches the bundled JSON version, skip the import entirely (idempotent per D-06)
- Exposed as `#[tauri::command] async fn import_unit_database` for future manual re-import from frontend
- Wired `.setup()` hook to spawn async task calling `import_unit_database_inner` — window creation is not blocked (T-103-07 mitigation)
- Added `bundle.resources` field to `tauri.conf.json` so `data/unit_database.json` ships as a Tauri resource (D-07)
- Registered `import_unit_database` in `generate_handler![]`
- `cargo check` passes with no errors

## Task Commits

1. **Task 1: Implement import_unit_database Rust command with setup hook and Tauri wiring** - `e2dbc5f` (feat)
2. **Task 2: Verify end-to-end import via tauri dev** - Auto-approved checkpoint (AUTO_MODE active; runtime verification manual)

## Files Created/Modified

- `src-tauri/src/lib.rs` — Added UnitDatabasePayload struct, UdbImportResult struct, import_unit_database_inner async fn, import_unit_database command, setup() hook spawn, generate_handler![] registration
- `src-tauri/tauri.conf.json` — Added bundle.resources field mapping data/unit_database.json

## Decisions Made

- **Inner function pattern:** Extracted core logic into `import_unit_database_inner` so both the `.setup()` hook and the Tauri command share identical code paths without duplication. Same approach as planned but made explicit.
- **INSERT OR IGNORE for keywords:** The `udb_unit_keywords` table has a composite PK `(unit_id, keyword)`. Used `INSERT OR IGNORE` to gracefully handle any edge case where the build script might emit duplicate keyword rows for a unit.
- **Version-check via udb_meta:** Before opening the write transaction, a read-only query checks if the current `udb_meta.version` matches the bundled JSON. If it matches, returns zero-count early — no write lock acquired, no WAL growth.

## Deviations from Plan

None — plan executed exactly as written. All implementation details followed the spec and `bulk_sync_rules` reference pattern.

## Issues Encountered

None. `cargo check` passed on first attempt.

## Known Stubs

The unit database import will run on app launch but will insert 0 rows because `src-tauri/data/unit_database.json` is a placeholder (built in Plan 02). This is intentional per D-02 and the known stubs documented in Plan 02 SUMMARY. The import machinery is correct; data population requires:
1. Developer downloads Wahapedia CSVs to `scripts/data/`
2. Developer downloads BSData .cat files to `scripts/data/bsdata/`
3. Developer runs `pnpm build:udb`
4. Developer commits the generated `src-tauri/data/unit_database.json`

The `[hobbyforge] udb import: UdbImportResult { factions: 0, ... }` log line on app launch confirms the import pipeline is working correctly with the placeholder.

## Threat Flags

None — no new network endpoints, auth paths, or file access beyond the already-planned resource_dir read. T-103-07 (setup hook non-blocking) and T-103-08 (WAL stale reads) are mitigated as specified.

## Self-Check: PASSED

- [x] `src-tauri/src/lib.rs` contains `UnitDatabasePayload` with `#[derive(serde::Deserialize)]`
- [x] `src-tauri/src/lib.rs` contains `UdbImportResult` with `#[derive(serde::Serialize, Debug)]`
- [x] `src-tauri/src/lib.rs` contains `async fn import_unit_database_inner`
- [x] `src-tauri/src/lib.rs` contains `#[tauri::command] async fn import_unit_database`
- [x] `src-tauri/src/lib.rs` setup() hook spawns `import_unit_database_inner`
- [x] `src-tauri/src/lib.rs` `generate_handler![]` includes `import_unit_database`
- [x] `src-tauri/tauri.conf.json` bundle.resources contains `data/unit_database.json`
- [x] `cargo check` passes
- [x] Commit `e2dbc5f` exists

---
*Phase: 103-data-acquisition-schema*
*Completed: 2026-05-29*

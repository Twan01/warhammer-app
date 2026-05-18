---
phase: 79-rust-backup-foundation
plan: "01"
subsystem: rust-backend
tags: [backup, zip, rust, foundation]
dependency_graph:
  requires: []
  provides: [BackupManifest, vacuum_to_temp, create_backup_zip, format_iso8601_now, format_filename_timestamp]
  affects: [src-tauri/src/lib.rs, src-tauri/Cargo.toml]
tech_stack:
  added: [zip 2.x, time 0.3.x]
  patterns: [ZipWriter with Stored compression, time crate RFC 3339 formatting, VACUUM INTO temp file helper]
key_files:
  created: []
  modified: [src-tauri/Cargo.toml, src-tauri/src/lib.rs, src-tauri/Cargo.lock]
decisions:
  - "Used UTC for filename timestamps instead of local time -- time crate's local-offset feature is unsound on multi-threaded Tauri apps"
metrics:
  duration: "~3 minutes"
  completed: "2026-05-18"
---

# Phase 79 Plan 01: Rust Backup Foundation Helpers Summary

ZIP and time crate dependencies added, BackupManifest struct and 4 helper functions (vacuum_to_temp, create_backup_zip, format_iso8601_now, format_filename_timestamp) implemented and compiling in lib.rs.

## What Was Done

### Task 1: Add zip and time dependencies to Cargo.toml
- Added `zip = "2"` for ZIP archive creation and reading
- Added `time = { version = "0.3", features = ["formatting", "macros"] }` for ISO 8601 timestamp formatting
- Both placed after existing `sqlx` line in dependencies section
- `cargo check` passed successfully

### Task 2: Add BackupManifest struct and shared helper functions
- **BackupManifest** struct with `Serialize`, `Deserialize`, `Clone` derives and 5 pub fields: `app_version`, `schema_version`, `created_at`, `platform`, `db_size_bytes`
- **format_iso8601_now()** -- returns UTC time as RFC 3339 string using `time::OffsetDateTime::now_utc()`
- **format_filename_timestamp()** -- returns UTC time as `YYYY-MM-DD-HHMM` string for safety backup filenames
- **vacuum_to_temp()** -- async helper that creates a VACUUM INTO snapshot to `hobbyforge_backup_temp.db` in app_data_dir, reusing the established direct sqlx connection pattern
- **create_backup_zip()** -- creates a zip with `hobbyforge.db` and pretty-printed `metadata.json` entries using `Stored` compression (no deflate for SQLite data)
- All code placed between `backup_database` and `run()` function; no existing code modified
- `cargo check` passed (4 dead_code warnings expected -- helpers consumed by Plan 02)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b49975e | chore(79-01): add zip and time crate dependencies |
| 2 | 6eec232 | feat(79-01): BackupManifest struct and 4 helper functions |
| -- | 439b8c2 | chore(79-01): update Cargo.lock |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed local offset API unavailability**
- **Found during:** Task 2
- **Issue:** `time::UtcOffset::current_local_offset()` does not exist in the time 0.3 crate API. The `local-offset` feature exists but is documented as unsound on multi-threaded programs (which Tauri is).
- **Fix:** Changed `format_filename_timestamp()` to use UTC instead of attempting local time. This is acceptable since backup filenames are machine-generated identifiers, not user-facing display timestamps.
- **Files modified:** src-tauri/src/lib.rs
- **Commit:** 6eec232

## Verification

- `cargo check` succeeds with no errors
- BackupManifest struct has all 5 required fields
- vacuum_to_temp reuses established direct sqlx connection pattern from backup_database
- create_backup_zip writes Stored-compression zip with hobbyforge.db and metadata.json entries
- Existing backup_database, bulk_sync_rules, run(), and get_migrations are all untouched

## Known Stubs

None -- all functions are complete implementations ready for consumption by Plan 02 commands.

## Threat Flags

None -- no new network endpoints, auth paths, or schema changes introduced. All file I/O is within app_data_dir scope.

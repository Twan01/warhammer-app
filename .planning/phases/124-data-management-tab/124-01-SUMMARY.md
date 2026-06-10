---
phase: "124"
plan: "01"
subsystem: data-management
tags: [rust, tauri-command, factory-reset, safety-backup]
dependency_graph:
  requires: [create_safety_backup]
  provides: [factory_reset command]
  affects: [src-tauri/src/lib.rs]
tech_stack:
  patterns: [sidecar-deletion, image-extension-filter, best-effort-cleanup]
key_files:
  modified:
    - src-tauri/src/lib.rs
decisions:
  - "Photos deleted via read_dir + extension filter (not remove_dir_all) since they are flat UUID files in appDataDir root"
metrics:
  completed: "2026-06-10"
  tasks_completed: 1
  tasks_total: 1
---

# Phase 124 Plan 01: Add factory_reset Rust Tauri Command Summary

JWT-less factory reset command that creates a safety backup then deletes hobbyforge.db, sidecar files, and all user photos from app_data_dir.

## What Was Implemented

Added `factory_reset` async Tauri command to `src-tauri/src/lib.rs`:

1. Calls `create_safety_backup(app.clone()).await?` -- aborts on failure
2. Resolves `app_data_dir` via `app.path().app_data_dir()`
3. Deletes sidecar files (`-wal`, `-shm`, `-journal`) with NotFound tolerance (same pattern as `restore_from_backup`)
4. Deletes `hobbyforge.db` main file (NotFound NOT tolerated)
5. Enumerates `app_data_dir` with `std::fs::read_dir`, filters by image extensions (`jpg`, `jpeg`, `png`, `webp`, `gif` case-insensitive), removes each file best-effort
6. Returns `Ok(())`

Command registered in `tauri::generate_handler![]` macro after `ack_successful_launch`.

## Verification

`cargo check --manifest-path src-tauri/Cargo.toml` completed successfully with no errors or warnings.

## Requirements Covered

- **DAT-02**: Factory reset Rust command

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 7a0790b | feat(124-01): add factory_reset Rust command for data management |

## Deviations from Plan

None - plan executed exactly as written.

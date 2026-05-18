# Stack Research

**Domain:** Tauri 2 desktop app — structured backup export / restore / safety backups (v0.2.14)
**Researched:** 2026-05-18
**Confidence:** HIGH

---

## Summary

This is an **additive** milestone. The existing stack already contains every plugin needed.
The only new Rust dependency is the `zip` crate for archive creation and extraction.
No new JS/npm packages are required. All orchestration and DB operations belong in Rust;
the JS layer only invokes commands and calls the already-wired `relaunch()`.

---

## Recommended Stack

### New Rust Dependency (the only addition)

| Crate | Version | Purpose | Why Recommended |
|-------|---------|---------|-----------------|
| `zip` | `"2"` (crates.io: 8.6.0 as of May 2026) | Create and extract `.zip` archives from Rust Tauri commands | Pure-Rust, no system dependency, supports Stored + Deflate. ZipWriter/ZipArchive APIs are stable. Preferred over JS zip libs because all file I/O stays in the Rust process, avoids Tauri IPC size limits for binary blobs, and leverages the same pattern as the existing sqlx direct connection in `lib.rs`. |

> **Version note:** The crate's crates.io identifier is `zip` (maintained at `zip-rs/zip2`), currently at version 8.6.0. Pin as `zip = "2"` in Cargo.toml to accept any compatible release, or pin exact for reproducibility. The `deflate` feature is needed for compressed archives.

### Existing Capabilities Already in Place (no changes needed)

| Technology | Already in Stack | Role in This Milestone |
|------------|-----------------|------------------------|
| `sqlx 0.8` | Cargo.toml | Direct SQLite connection for VACUUM INTO — already used by `backup_database` command |
| `tauri-plugin-fs 2` | Cargo.toml + capabilities | Read/write files in app_data_dir; temp file staging during restore |
| `tauri-plugin-dialog 2` | Cargo.toml + capabilities | `save()` for export destination, `open()` for restore file picker |
| `tauri-plugin-process 2.3.1` | Cargo.toml + `capabilities/default.json` | `relaunch()` already imported and working in `UpdateBanner.tsx`; `process:default` grants `allow-restart` |
| `serde / serde_json 1` | Cargo.toml | Serialize metadata.json and manifest inside zip |
| `std::fs` | Rust stdlib | File rename for atomic DB swap during restore |
| `tauri-plugin-sql 2` | Cargo.toml | Existing pool — restore flow uses `relaunch()` to reinitialize rather than closing mid-session |

---

## Architecture Boundary: Rust vs JavaScript

**All zip I/O and file operations live in Rust commands.** JavaScript only:
1. Calls `save()` / `open()` dialog to get a user-chosen path.
2. Invokes a Rust command with that path string.
3. Calls `relaunch()` after a successful restore (or Rust calls `app_handle.restart()` directly).

**Why not a JS zip library (JSZip, ADM-ZIP, fflate)?**
- Tauri IPC transfers binary through JSON serialization — a 50+ MB db file as base64 across the bridge is impractical.
- `tauri-plugin-fs` can read/write from JS, but constructing a multi-file zip in JS means reading each binary file into a JS buffer, zipping in JS, writing back — three IPC round trips for large binary data.
- Rust has direct filesystem access with no IPC overhead; the zip crate runs in-process alongside the DB file.

---

## Zip Archive Structure

```
hobbyforge-backup-2026-05-18.zip
├── hobbyforge.db          (VACUUM INTO consistent snapshot)
├── metadata.json          (app version, schema version, created_at, db_size_bytes)
└── manifest.json          (file list + checksums for integrity verification on restore)
```

ZipWriter pattern (Rust):
```rust
use zip::{ZipWriter, write::SimpleFileOptions, CompressionMethod};
use std::io::Write;

let file = File::create(&destination)?;
let mut zip = ZipWriter::new(file);
let opts = SimpleFileOptions::default()
    .compression_method(CompressionMethod::Deflated);

zip.start_file("hobbyforge.db", opts)?;
zip.write_all(&db_bytes)?;

zip.start_file("metadata.json", opts)?;
zip.write_all(metadata_json.as_bytes())?;

zip.finish()?;
```

ZipArchive pattern for restore validation (Rust):
```rust
use zip::ZipArchive;
let file = File::open(&source)?;
let mut archive = ZipArchive::new(file)?;
let mut db_entry = archive.by_name("hobbyforge.db")?;
// stream to temp path, then rename to app_data_dir/hobbyforge.db
```

---

## SQLite Safety: VACUUM INTO Is the Only Safe Backup Method

**Problem:** `std::fs::copy` on a live WAL-mode SQLite file copies only the `.db` while `-wal` and `-shm` sidecar files are being written — produces an instantly-corrupt backup. This is documented in SQLite's official "How to Corrupt" guide.

**Rule:** Every backup (structured export, safety backup before restore, safety backup before sync) must use VACUUM INTO via a direct sqlx connection. The existing `backup_database` Rust command already implements this correctly and is the template for all backup paths in this milestone.

---

## Restore Flow: Pool Constraint and Relaunch

tauri-plugin-sql holds a connection pool open for the entire app lifetime. There is no public API to reinitialize it mid-session. The only clean restore path:

1. VACUUM INTO safety backup to a temp path (same pattern as `backup_database`).
2. Validate the zip: open archive, check manifest, verify `hobbyforge.db` entry exists and checksum matches.
3. Extract `hobbyforge.db` from zip to a staging path (e.g., `app_data_dir/hobbyforge.db.incoming`).
4. Rust command calls `app_handle.restart()` — or returns success to JS which calls `await relaunch()`.
5. On startup, a Rust startup hook in `run()` checks for a pending restore flag file. If found: `std::fs::rename("hobbyforge.db.incoming", "hobbyforge.db")`, delete flag, proceed. The plugin pool then opens the restored file normally and migrations run.

This pending-restore pattern avoids trying to close the pool mid-session. The process fully exits before any file rename happens.

**`relaunch()` is already proven working** in `UpdateBanner.tsx` (same import, same Tauri version, same capability grant). No new setup needed.

---

## Installation

```toml
# src-tauri/Cargo.toml — add ONE line under [dependencies]
zip = { version = "2", features = ["deflate"] }
```

No npm installs needed. No capabilities changes needed (`process:default` already grants `allow-restart`).

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zip` | `"2"` | Zip archive creation + extraction | All structured export and restore commands |
| `serde_json` (already present) | `"1"` | Serialize metadata.json / manifest.json inside zip | Same crate, no new dependency |

---

## Alternatives Considered

| Recommended | Alternative | When Alternative Makes Sense |
|-------------|-------------|------------------------------|
| Rust `zip` crate | JS `JSZip` / `fflate` | Only if archive contains only small text files with no binary blobs |
| Rust `zip` crate | `async_zip` crate | If async streaming of very large archives is needed (not the case here) |
| VACUUM INTO for safety backups | `std::fs::copy` | Never — unsafe for WAL-mode SQLite |
| Pending-restore flag + startup hook | Close pool mid-session and swap file | Only if tauri-plugin-sql exposed a `reinitialize()` API (it does not) |
| `.zip` format | `.tar.gz` | On Linux/macOS where users have native tar tooling; Windows users expect zip |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| JS zip library (JSZip, ADM-ZIP, fflate) | Binary IPC overhead for DB-sized files; splits backup logic between JS and Rust | Rust `zip` crate in a Tauri command |
| `async_zip` crate | Async overhead unnecessary for a one-shot backup; more complex error handling | Synchronous `zip` crate (use `spawn_blocking` if needed for tokio compatibility) |
| Additional Tauri plugins | `fs`, `dialog`, `process` already registered | No new plugins needed |
| New SQLite schema for backup metadata | Backup metadata already lives in `localStorage` per existing `BackupStatus` / `BACKUP_STORAGE_KEY` pattern | Extend the existing `BackupStatus` interface in `useDiagnostics.ts` |
| Auto-scheduled backups | Explicitly out of scope per PROJECT.md | Manual backup + safety backups before risky operations is sufficient |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `zip` | `"2"` | `serde_json "1"`, `std::fs`, `tokio` runtime | Pure-Rust, no system deps, compiles on Windows MSVC without issues |
| `tauri-plugin-process` | `2.3.1` (already pinned) | `relaunch()` from `@tauri-apps/plugin-process` | Working in `UpdateBanner.tsx`; no version change needed |
| `sqlx` | `0.8` (already in use) | VACUUM INTO backup commands | Existing pattern validated in `backup_database` command |

---

## Sources

- `crates.io/crates/zip` — current version 8.6.0, updated May 2026 (HIGH confidence — crates.io registry)
- `sqlite.org/howtocorrupt.html` — WAL-mode safe copy rules (HIGH confidence — SQLite official docs)
- `v2.tauri.app/plugin/process/` — process plugin relaunch API and permissions (HIGH confidence — Tauri official docs)
- `src-tauri/capabilities/default.json` — `process:default` already granted (verified in codebase)
- `src/components/common/UpdateBanner.tsx` — `relaunch()` already imported and proven working (verified in codebase)
- `src-tauri/src/lib.rs` — `backup_database` VACUUM INTO command (verified in codebase)
- `src-tauri/Cargo.toml` — existing dependencies confirmed (verified in codebase)

---
*Stack research for: HobbyForge v0.2.14 Backup 2.0 — Structured Export, Restore & Safety Backups*
*Researched: 2026-05-18*

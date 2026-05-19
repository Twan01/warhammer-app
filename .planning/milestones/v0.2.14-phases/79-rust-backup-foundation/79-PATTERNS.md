# Phase 79: Rust Backup Foundation - Pattern Map

**Mapped:** 2026-05-18
**Files analyzed:** 2 (both modifications, no new files)
**Analogs found:** 2 / 2

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src-tauri/src/lib.rs` | backend-command | file-I/O | `src-tauri/src/lib.rs` (self: `backup_database` + `bulk_sync_rules`) | exact |
| `src-tauri/Cargo.toml` | config | N/A | `src-tauri/Cargo.toml` (self) | exact |

## Pattern Assignments

### `src-tauri/src/lib.rs` — 3 new commands + helpers

**Analog:** Same file, existing commands `backup_database` (lines 578-616) and `bulk_sync_rules` (lines 264-573)

**Imports pattern** (lines 1-3 + inline imports):
```rust
// Top-level imports
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};
use std::collections::HashMap;

// Inline imports inside command functions (established pattern — see lines 269, 583):
use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions};
use std::str::FromStr;
```

**Serde struct pattern** (lines 225-243, 246-259):
```rust
// Input payload — Deserialize only
#[derive(serde::Deserialize)]
pub struct BulkSyncPayload {
    factions: Vec<JsRow>,
    // ...
}

// Output return type — Serialize only
#[derive(serde::Serialize)]
pub struct SyncResult {
    pub factions: u64,
    // ...
}
```
New `BackupManifest` struct needs both `Serialize` (returned to frontend from `validate_backup`) and `Deserialize` (parsed from metadata.json in zip).

**Direct sqlx connection pattern** (lines 583-596 from `backup_database`):
```rust
use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions};
use std::str::FromStr;

let app_data_dir = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("app_data_dir: {e}"))?;
let db_url = format!("sqlite:{}", app_data_dir.join("hobbyforge.db").display());

let opts = SqliteConnectOptions::from_str(&db_url)
    .map_err(|e| format!("opts: {e}"))?
    .create_if_missing(false);

let mut conn = opts.connect().await.map_err(|e| format!("connect: {e}"))?;
```

**VACUUM INTO pattern** (lines 598-613 from `backup_database`):
```rust
// Remove existing file to avoid "output file already exists" error
if let Err(e) = std::fs::remove_file(&destination) {
    if e.kind() != std::io::ErrorKind::NotFound {
        return Err(format!("remove existing backup: {e}"));
    }
}

// Single-quote escaping for path interpolation (VACUUM INTO doesn't support param binding)
let sql = format!("VACUUM INTO '{}'", destination.replace('\'', "''"));
sqlx::query(&sql)
    .execute(&mut conn)
    .await
    .map_err(|e| format!("VACUUM INTO: {e}"))?;
```

**Tauri command signature pattern** (lines 264-268, 578-582):
```rust
// Pattern 1: AppHandle + payload input, returns Result<T, String>
#[tauri::command]
async fn bulk_sync_rules(
    app: tauri::AppHandle,
    payload: BulkSyncPayload,
) -> Result<SyncResult, String> {

// Pattern 2: AppHandle + simple String param, returns Result<(), String>
#[tauri::command]
async fn backup_database(
    app: tauri::AppHandle,
    destination: String,
) -> Result<(), String> {
```

**Error handling pattern** — consistent throughout all commands:
```rust
// All errors converted to String via .map_err(|e| format!("context: {e}"))
// No custom error types — commands return Result<T, String>
// Descriptive prefix in format string identifies the failing operation
.map_err(|e| format!("app_data_dir: {e}"))?;
.map_err(|e| format!("opts: {e}"))?;
.map_err(|e| format!("connect: {e}"))?;
.map_err(|e| format!("VACUUM INTO: {e}"))?;
```

**Command registration pattern** (line 642):
```rust
.invoke_handler(tauri::generate_handler![bulk_sync_rules, backup_database])
```
New commands must be added to this macro invocation.

**Directory creation pattern** (lines 623-627 from `setup`):
```rust
let app_data_dir = app
    .path()
    .app_data_dir()
    .expect("failed to resolve app_data_dir");
std::fs::create_dir_all(&app_data_dir).expect("failed to create app_data_dir");
```
The `create_safety_backup` command needs `std::fs::create_dir_all` for the `backups/` subdirectory — same approach but with `.map_err` instead of `.expect` since it's inside a command (not setup).

**get_migrations() length** (lines 5-176):
```rust
fn get_migrations() -> Vec<Migration> {
    vec![
        // 28 migrations (version 1 through 28)
    ]
}
```
Use `get_migrations().len() as u32` at runtime for `schema_version` rather than hardcoding.

---

### `src-tauri/Cargo.toml` — add `zip` dependency

**Analog:** Self (existing dependency block, lines 20-31)

**Dependency declaration pattern**:
```toml
[dependencies]
tauri = { version = "2", features = ["protocol-asset"] }
tauri-plugin-opener = "2"
# ... other deps ...
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite"] }
```

Simple crates use `name = "version"` syntax. Feature-gated crates use `name = { version = "x", features = [...] }`. New additions:
- `zip = "2"` — simple version string (no features needed)
- `time = { version = "0.3", features = ["formatting", "macros"] }` — needs feature flags for date formatting (already a transitive dep of sqlx, so no new download)

---

## Shared Patterns

### Error Handling (all commands)
**Source:** `src-tauri/src/lib.rs` throughout
**Apply to:** All 3 new commands + helper functions
```rust
// Pattern: .map_err(|e| format!("descriptive_context: {e}"))?;
// No custom error types. Commands return Result<T, String>.
// Helper functions also return Result<T, String> for consistency.
```

### App Data Dir Resolution (all commands needing filesystem)
**Source:** `src-tauri/src/lib.rs` lines 272-275 and 586-589
**Apply to:** `export_backup`, `create_safety_backup`, and `vacuum_to_temp` helper
```rust
let app_data_dir = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("app_data_dir: {e}"))?;
```

### VACUUM INTO + Temp File Cleanup
**Source:** `src-tauri/src/lib.rs` lines 598-613
**Apply to:** Shared `vacuum_to_temp` helper used by both `export_backup` and `create_safety_backup`
```rust
// 1. Remove existing temp file (guard against previous failed attempt)
// 2. VACUUM INTO temp path with single-quote escaping
// 3. Caller is responsible for cleanup via let _ = std::fs::remove_file(&temp_path);
//    in BOTH success and error paths (do cleanup before returning error)
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | -- | -- | All modifications are to existing files with exact self-analogs |

**Note:** ZIP creation/reading (`zip` crate usage) has no existing analog in the codebase. RESEARCH.md Patterns 1 and 3 provide the reference code for `ZipWriter` and `ZipArchive` APIs from docs.rs/zip/2.3.0. The planner should reference those patterns directly.

## Metadata

**Analog search scope:** `src-tauri/` (only Rust files affected in this phase)
**Files scanned:** 2 (`lib.rs`, `Cargo.toml`)
**Pattern extraction date:** 2026-05-18

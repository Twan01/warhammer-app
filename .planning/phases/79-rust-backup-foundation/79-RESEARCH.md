# Phase 79: Rust Backup Foundation - Research

**Researched:** 2026-05-18
**Domain:** Rust / Tauri commands / ZIP archive creation and reading / SQLite VACUUM INTO
**Confidence:** HIGH

## Summary

Phase 79 adds three new Rust Tauri commands (`export_backup`, `validate_backup`, `create_safety_backup`) to `src-tauri/src/lib.rs`. These commands create and read ZIP archives containing `hobbyforge.db` (via VACUUM INTO) and `metadata.json`. The only new dependency is `zip = "2"` (resolves to 2.3.0, the only un-yanked 2.x release).

The existing codebase already has the exact patterns needed: `backup_database` (line 578-616) demonstrates VACUUM INTO with a direct sqlx connection, `bulk_sync_rules` demonstrates `AppHandle` usage for `app_data_dir()`, and serde Serialize/Deserialize structs are used throughout. This phase is a straightforward composition of existing patterns plus ZIP packaging.

**Primary recommendation:** Implement three commands reusing the established `SqliteConnectOptions` direct-connection pattern, add `zip = "2"` to Cargo.toml, and share a helper function for the zip-creation logic between `export_backup` and `create_safety_backup`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** New Rust command `export_backup(destination: String)` -- VACUUM INTO temp file, then zip with metadata.json. Delete temp after.
- **D-02:** metadata.json schema: `{ app_version, schema_version, created_at, platform, db_size_bytes }`. Schema version = migration count (28). Platform from `std::env::consts::OS`.
- **D-03:** Backup filename: `hobbyforge-backup-YYYY-MM-DD-HHMM.zip` -- frontend provides full path, Rust writes to it.
- **D-04:** Add `zip = "2"` to `src-tauri/Cargo.toml`. Only new crate.
- **D-05:** Direct sqlx connection pattern (not plugin pool), same as `bulk_sync_rules` and `backup_database`.
- **D-06:** `validate_backup(path: String) -> BackupManifest` -- opens zip, checks for metadata.json + hobbyforge.db, parses metadata, returns manifest.
- **D-07:** Validation scope: zip integrity, required file presence, metadata.json parseable. No schema compatibility checks (Phase 81).
- **D-08:** `BackupManifest` is a serde Serialize struct matching metadata.json fields. Frontend receives as JSON.
- **D-09:** `create_safety_backup(app: AppHandle) -> String` -- creates zip in `{app_data_dir}/backups/`, returns path.
- **D-10:** Safety backup naming: `safety-YYYY-MM-DD-HHMM.zip`. Creates `backups/` dir if needed.
- **D-11:** Phase 79 ships the command only; callers come in later phases.
- **D-12:** Keep existing `backup_database` as-is. Phase 80 replaces its usage.

### Claude's Discretion
- Internal helper functions for zip creation (shared between export and safety backup)
- Temp file naming and cleanup strategy
- Error message formatting for validation failures
- Whether to use `chrono` or `std::time` for timestamp formatting (prefer std to avoid new deps)

### Deferred Ideas (OUT OF SCOPE)
- Restore execution and process restart (Phase 82)
- Schema version compatibility checks during validation (Phase 81)
- Restore preview UI (Phase 81)
- Safety backup auto-cleanup (SAF-F02)
- Pre-migration safety backup (SAF-F01)
- Including photos/assets in backup (EXP-F01)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXP-01 | User can export a structured backup (.zip) from Data Health page | `export_backup` command creates the zip; UI wiring in Phase 80 |
| EXP-02 | Backup contains hobbyforge.db created via VACUUM INTO | Direct sqlx connection + `VACUUM INTO` pattern already proven in `backup_database` (lib.rs:578-616) |
| EXP-03 | Backup contains metadata.json with app version, schema version, timestamp, platform | `BackupMetadata` struct serialized to pretty JSON inside zip |
| EXP-04 | Backup filename is timestamped | Frontend provides path (Phase 80); Rust command writes to whatever path it receives |
| EXP-05 | User receives success/failure feedback after export | Command returns `Result<String, String>` -- success path or error message; UI feedback in Phase 80 |
| SAF-01 | Automatic safety backup created before restore | `create_safety_backup` command available; called by restore in Phase 82 |
| SAF-03 | Safety backups stored in app data directory with auto-generated names | `create_safety_backup` writes to `{app_data_dir}/backups/safety-YYYY-MM-DD-HHMM.zip` |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| VACUUM INTO snapshot | Rust backend | -- | Requires direct SQLite access via sqlx, not available from frontend |
| ZIP archive creation | Rust backend | -- | File I/O with zip crate, operates on temp files in app_data_dir |
| ZIP archive validation | Rust backend | -- | Opens zip, reads entries, parses JSON -- all file I/O |
| Metadata generation | Rust backend | -- | Reads app version from Cargo config, counts migrations, gets OS |
| Safety backup storage | Rust backend | -- | Writes to app_data_dir/backups/ which is OS-specific |
| Backup UI / feedback | Frontend (Phase 80+) | -- | NOT in this phase |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zip` | 2.3.0 (via `zip = "2"`) | Create and read ZIP archives | De facto Rust ZIP library, 14M+ downloads/month, maintained at github.com/zip-rs/zip2 [VERIFIED: crates.io registry + docs.rs] |
| `sqlx` | 0.8.x (already in Cargo.toml) | Direct SQLite connection for VACUUM INTO | Already used by `bulk_sync_rules` and `backup_database` |
| `serde` + `serde_json` | 1.x (already in Cargo.toml) | Serialize BackupManifest struct, generate metadata.json | Already used throughout the project |
| `tauri` | 2.x (already in Cargo.toml) | AppHandle, command registration, app_data_dir() | Core framework |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `zip` crate | `std::process::Command` calling system zip | Non-portable, requires zip installed on user system |
| `zip = "2"` | `zip = "8"` (latest) | v2.3.0 is un-yanked and stable; v8 has breaking API changes with no benefit for our simple use case; CONTEXT.md locks v2 |

**Installation:**
```toml
# In src-tauri/Cargo.toml [dependencies]
zip = "2"
```

**Version note:** `zip = "2"` resolves to 2.3.0, the only un-yanked 2.x release. Published 2025-03-16. The zip crate has since released v7.x and v8.x with breaking changes, but v2.3.0 is sufficient for this phase's needs (create zip with two files, read zip to validate). [VERIFIED: docs.rs/crate/zip/2.3.0 confirms not yanked]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| zip | crates.io | ~12 years (since 2014) | ~14M/month | github.com/zip-rs/zip2 | N/A | Approved [VERIFIED: crates.io, docs.rs, lib.rs] |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck is a Python/npm tool not applicable to Rust crates. Verification performed via crates.io registry, docs.rs documentation, and lib.rs statistics instead.*

## Architecture Patterns

### System Architecture Diagram

```
Frontend (Phase 80+)
    |
    | invoke("export_backup", { destination })
    | invoke("validate_backup", { path })
    | invoke("create_safety_backup")
    v
+-------------------------------------------+
| Tauri Command Layer (lib.rs)              |
|                                           |
| export_backup(destination)                |
|   1. VACUUM INTO temp file                |
|   2. Build BackupMetadata struct          |
|   3. create_backup_zip(temp, meta, dest)  |  <-- shared helper
|   4. Delete temp file                     |
|   5. Return destination path              |
|                                           |
| validate_backup(path)                     |
|   1. Open zip                             |
|   2. Check hobbyforge.db entry exists     |
|   3. Check metadata.json entry exists     |
|   4. Parse metadata.json -> BackupManifest|
|   5. Return manifest                      |
|                                           |
| create_safety_backup(app)                 |
|   1. VACUUM INTO temp file                |
|   2. Build BackupMetadata struct          |
|   3. Generate safety-YYYY-MM-DD-HHMM.zip |
|   4. create_backup_zip(temp, meta, path)  |  <-- shared helper
|   5. Delete temp file                     |
|   6. Return safety backup path            |
+-------------------------------------------+
    |                    |
    v                    v
 hobbyforge.db      app_data_dir/backups/
 (via sqlx)         (safety backups)
```

### Recommended Project Structure

No new files or directories beyond `src-tauri/src/lib.rs` modifications and `Cargo.toml` dependency addition. All three commands and helper functions go in `lib.rs` following the existing pattern.

```
src-tauri/
  src/lib.rs          # Add 3 commands + helper + structs (estimated ~150 lines)
  Cargo.toml          # Add zip = "2"
```

### Pattern 1: Shared ZIP Creation Helper

**What:** A private helper function that takes a database temp file path, a `BackupMetadata` struct, and a destination path, then creates the zip archive.
**When to use:** Both `export_backup` and `create_safety_backup` need identical zip creation logic.

```rust
// Source: zip crate docs.rs/zip/2.3.0 + existing project patterns
use std::io::Write;
use zip::write::{SimpleFileOptions, ZipWriter};

#[derive(serde::Serialize, serde::Deserialize)]
struct BackupMetadata {
    app_version: String,
    schema_version: u32,
    created_at: String,
    platform: String,
    db_size_bytes: u64,
}

fn create_backup_zip(
    db_path: &std::path::Path,
    metadata: &BackupMetadata,
    dest_path: &std::path::Path,
) -> Result<(), String> {
    let file = std::fs::File::create(dest_path)
        .map_err(|e| format!("create zip file: {e}"))?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Stored);

    // Add hobbyforge.db
    zip.start_file("hobbyforge.db", options)
        .map_err(|e| format!("start db entry: {e}"))?;
    let db_bytes = std::fs::read(db_path)
        .map_err(|e| format!("read temp db: {e}"))?;
    zip.write_all(&db_bytes)
        .map_err(|e| format!("write db to zip: {e}"))?;

    // Add metadata.json (pretty-printed)
    zip.start_file("metadata.json", options)
        .map_err(|e| format!("start metadata entry: {e}"))?;
    let meta_json = serde_json::to_string_pretty(metadata)
        .map_err(|e| format!("serialize metadata: {e}"))?;
    zip.write_all(meta_json.as_bytes())
        .map_err(|e| format!("write metadata to zip: {e}"))?;

    zip.finish().map_err(|e| format!("finalize zip: {e}"))?;
    Ok(())
}
```

### Pattern 2: VACUUM INTO with Temp File

**What:** Reuse the existing VACUUM INTO pattern but target a temp file, then package it.
**When to use:** Both export and safety backup need a consistent DB snapshot.

```rust
// Source: existing backup_database in lib.rs:578-616
async fn vacuum_to_temp(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions};
    use std::str::FromStr;

    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let db_url = format!("sqlite:{}", app_data_dir.join("hobbyforge.db").display());

    let opts = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| format!("opts: {e}"))?
        .create_if_missing(false);

    let mut conn = opts.connect().await
        .map_err(|e| format!("connect: {e}"))?;

    let temp_path = app_data_dir.join("hobbyforge_backup_temp.db");
    // Remove existing temp file if present
    let _ = std::fs::remove_file(&temp_path);

    let sql = format!("VACUUM INTO '{}'", temp_path.display().to_string().replace('\'', "''"));
    sqlx::query(&sql).execute(&mut conn).await
        .map_err(|e| format!("VACUUM INTO: {e}"))?;

    Ok(temp_path)
}
```

### Pattern 3: ZIP Validation (Read)

**What:** Open a zip archive and verify it contains the expected entries.
**When to use:** `validate_backup` command.

```rust
// Source: zip crate docs.rs/zip/2.3.0
fn validate_zip(path: &std::path::Path) -> Result<BackupMetadata, String> {
    let file = std::fs::File::open(path)
        .map_err(|e| format!("open zip: {e}"))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("invalid zip archive: {e}"))?;

    // Check hobbyforge.db exists
    archive.by_name("hobbyforge.db")
        .map_err(|_| "backup missing hobbyforge.db".to_string())?;

    // Read and parse metadata.json
    let mut meta_file = archive.by_name("metadata.json")
        .map_err(|_| "backup missing metadata.json".to_string())?;

    let mut meta_str = String::new();
    std::io::Read::read_to_string(&mut meta_file, &mut meta_str)
        .map_err(|e| format!("read metadata.json: {e}"))?;

    let metadata: BackupMetadata = serde_json::from_str(&meta_str)
        .map_err(|e| format!("parse metadata.json: {e}"))?;

    Ok(metadata)
}
```

### Pattern 4: Timestamp Formatting (std only)

**What:** Generate ISO 8601 timestamps and filename-safe timestamps without chrono.
**When to use:** metadata.json `created_at` field and safety backup filename.

```rust
// Source: Rust std library [ASSUMED - std::time has no built-in ISO formatting]
// NOTE: std::time does NOT have date formatting. Options:
// 1. Use chrono (adds dependency - against preference)
// 2. Use time crate (lighter alternative)
// 3. Use a Tauri-provided timestamp or system command
// RECOMMENDATION: Use the `time` crate which is already an indirect dependency
// via sqlx -> time, so it adds zero new crate downloads.
```

**Important finding:** `std::time` provides `SystemTime` and `Duration` but has NO date/time formatting (no way to get YYYY-MM-DD-HHMM from a SystemTime without additional logic). The project will need either:
1. **`time` crate** (already an indirect dependency of `sqlx`) -- add `time = { version = "0.3", features = ["formatting", "macros"] }` to Cargo.toml
2. **`chrono` crate** -- heavier, new dependency tree
3. **Manual formatting** -- parse seconds since epoch manually (fragile, not recommended)

**Recommendation:** Use `time` crate directly since it's already compiled as a transitive dependency of sqlx. This avoids adding chrono while getting proper date formatting. [VERIFIED: sqlx 0.8 depends on time crate]

### Anti-Patterns to Avoid
- **File copy instead of VACUUM INTO:** Direct file copy of an active SQLite DB can produce a corrupt backup if WAL/journal is active. VACUUM INTO is atomic and produces a clean, defragmented copy.
- **Using plugin pool for VACUUM INTO:** The tauri-plugin-sql pool doesn't expose raw connection for VACUUM INTO. Must use direct sqlx connection.
- **Forgetting temp file cleanup:** If the command errors between VACUUM INTO and zip creation, the temp file leaks. Use a cleanup guard or ensure cleanup in error paths.
- **Not removing existing file before VACUUM INTO:** SQLite's VACUUM INTO fails with "output file already exists" if the temp file from a previous failed attempt remains.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP archive creation | Custom binary format | `zip` crate ZipWriter | Standard format, tool interop, compression options |
| ZIP archive reading | Manual binary parsing | `zip` crate ZipArchive | Central directory parsing, CRC validation, error handling |
| Date/time formatting | Manual epoch math | `time` crate (already transitive dep) | Timezone handling, leap seconds, platform differences |
| DB snapshot | File copy + fsync | VACUUM INTO | Atomic consistent snapshot of active SQLite database |

## Common Pitfalls

### Pitfall 1: VACUUM INTO Temp File Not Cleaned Up
**What goes wrong:** If zip creation fails after VACUUM INTO succeeds, a temp .db file lingers in app_data_dir, wasting disk space and causing "file already exists" errors on next attempt.
**Why it happens:** Error path doesn't include cleanup.
**How to avoid:** Always clean up temp file in both success and error paths. Consider a finally-style guard using `defer` pattern or explicit cleanup before returning errors.
**Warning signs:** "output file already exists" error on second backup attempt.

### Pitfall 2: Path Escaping on Windows
**What goes wrong:** VACUUM INTO uses string interpolation for the file path. Windows paths with backslashes or spaces can break the SQL statement.
**Why it happens:** VACUUM INTO doesn't support parameterized binding for the filename argument.
**How to avoid:** Use the same single-quote escaping pattern as existing `backup_database` (lib.rs:609). On Windows, `PathBuf::display()` produces forward slashes in the SQLite context, but verify.
**Warning signs:** VACUUM INTO errors on paths containing special characters.

### Pitfall 3: Compression Method Choice
**What goes wrong:** Using Deflate compression on an already-compressed SQLite database adds CPU time with minimal size reduction (SQLite data doesn't compress well when already page-aligned).
**Why it happens:** Default compression method in zip crate is Deflate.
**How to avoid:** Use `CompressionMethod::Stored` (no compression) for the database file. metadata.json is tiny so compression method doesn't matter.
**Warning signs:** Backup creation taking unexpectedly long for large databases.

### Pitfall 4: Large Database Memory Usage
**What goes wrong:** Reading the entire temp .db file into memory (`std::fs::read`) before writing to zip can use significant memory for large databases.
**Why it happens:** Simple implementation reads entire file at once.
**How to avoid:** For Phase 79, `std::fs::read` is acceptable -- hobbyforge.db is unlikely to exceed 100MB for a personal hobby tool. If future-proofing is desired, use `std::io::copy` from a `File` reader to the ZipWriter (which implements `Write`).
**Warning signs:** High memory usage during backup of large databases.

### Pitfall 5: Schema Version Hardcoding
**What goes wrong:** Hardcoding `28` as schema version means it goes stale when migrations are added.
**Why it happens:** CONTEXT.md says "28 currently" but this should be derived at runtime.
**How to avoid:** Count the migration entries in `get_migrations()` function (28 currently) or hardcode as a const at the top of lib.rs near the migrations. Since migrations are compile-time constants (not runtime-discovered), a const is acceptable but must be updated with each new migration.
**Warning signs:** Backup metadata shows wrong schema version after adding migrations.

## Code Examples

### Complete export_backup Command Structure

```rust
// Source: Composition of existing patterns in lib.rs + zip crate 2.3.0 docs
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct BackupManifest {
    pub app_version: String,
    pub schema_version: u32,
    pub created_at: String,
    pub platform: String,
    pub db_size_bytes: u64,
}

const SCHEMA_VERSION: u32 = 28; // = get_migrations().len()

#[tauri::command]
async fn export_backup(
    app: tauri::AppHandle,
    destination: String,
) -> Result<String, String> {
    // 1. VACUUM INTO temp
    let temp_path = vacuum_to_temp(&app).await?;

    // 2. Build metadata
    let db_size = std::fs::metadata(&temp_path)
        .map_err(|e| format!("read temp size: {e}"))?
        .len();

    let metadata = BackupManifest {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        schema_version: SCHEMA_VERSION,
        created_at: format_iso8601_now(), // helper using time crate
        platform: std::env::consts::OS.to_string(),
        db_size_bytes: db_size,
    };

    // 3. Create zip
    let dest = std::path::PathBuf::from(&destination);
    let result = create_backup_zip(&temp_path, &metadata, &dest);

    // 4. Clean up temp file (always)
    let _ = std::fs::remove_file(&temp_path);

    result?;
    Ok(destination)
}
```

### Command Registration

```rust
// Source: existing lib.rs:642
.invoke_handler(tauri::generate_handler![
    bulk_sync_rules,
    backup_database,
    export_backup,
    validate_backup,
    create_safety_backup,
])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `backup_database` (raw .db copy via VACUUM INTO) | `export_backup` (zip with metadata) | Phase 79 | Structured backup with version tracking |
| No validation | `validate_backup` | Phase 79 | Can verify backup integrity before restore |
| No safety backups | `create_safety_backup` | Phase 79 | Pre-restore safety net |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `time` crate is available as transitive dependency of sqlx 0.8 and can be used directly | Architecture Patterns / Pattern 4 | Would need to add `chrono` or `time` explicitly to Cargo.toml; low risk since adding `time` is trivial |
| A2 | `env!("CARGO_PKG_VERSION")` returns the version from Cargo.toml at compile time | Code Examples | Would need alternative version source; very low risk, this is standard Rust |
| A3 | hobbyforge.db size is small enough (<100MB) to read fully into memory for zip | Common Pitfalls | Would need streaming approach; very low risk for personal hobby tool |

## Open Questions

1. **Schema version: const vs runtime count?**
   - What we know: There are 28 hobbyforge migrations currently. CONTEXT.md says schema_version = migration count.
   - What's unclear: Should this be a compile-time const (updated manually with each migration) or derived from `get_migrations().len()` at runtime?
   - Recommendation: Use `get_migrations().len() as u32` at runtime -- it's always correct and never goes stale. The function is already defined in the same file.

2. **`time` crate explicit dependency needed?**
   - What we know: `sqlx` depends on `time` transitively. Using it directly requires adding it to Cargo.toml even if already compiled.
   - What's unclear: Whether the user prefers `time` (needs explicit dep but no new downloads) or manual formatting.
   - Recommendation: Add `time = { version = "0.3", features = ["formatting", "macros"] }` to Cargo.toml. It's already downloaded as part of sqlx, so this adds zero compilation overhead. Avoids fragile manual epoch-to-date math.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Rust toolchain | Compilation | Yes | 1.95.0 | -- |
| Cargo | Dependency management | Yes | 1.95.0 | -- |
| sqlx | VACUUM INTO | Yes | 0.8.x (in Cargo.toml) | -- |
| zip crate | ZIP creation/reading | Available on crates.io | 2.3.0 | -- |
| time crate | Timestamp formatting | Transitive dep of sqlx | 0.3.x | Manual formatting or chrono |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vitest config in package.json/vite.config.ts |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXP-01 | export_backup creates valid zip | manual-only | N/A -- Rust command, no frontend test infra | N/A |
| EXP-02 | Backup contains VACUUM INTO db | manual-only | N/A -- requires Tauri runtime | N/A |
| EXP-03 | Backup contains metadata.json | manual-only | N/A -- requires Tauri runtime | N/A |
| EXP-04 | Filename is timestamped | manual-only | N/A -- filename provided by frontend (Phase 80) | N/A |
| EXP-05 | Success/failure feedback | manual-only | N/A -- UI feedback in Phase 80 | N/A |
| SAF-01 | Safety backup before restore | manual-only | N/A -- caller is Phase 82 | N/A |
| SAF-03 | Safety backups in app_data_dir | manual-only | N/A -- requires Tauri runtime | N/A |

### Sampling Rate
- **Per task commit:** `pnpm build` (TypeScript check -- verifies no frontend breakage)
- **Per wave merge:** `pnpm test` (full frontend test suite -- ensures no regressions)
- **Phase gate:** `cargo build` in src-tauri (Rust compilation succeeds) + manual smoke test via `pnpm tauri dev`

### Wave 0 Gaps
- No Rust-level unit tests exist in the project (no `#[cfg(test)]` modules in lib.rs)
- Rust commands are tested manually via `pnpm tauri dev` and Tauri invoke
- Adding Rust unit tests is possible but out of scope for this phase (no existing test infrastructure for Rust code)

*Justification for manual-only testing: All Phase 79 requirements involve Tauri commands that require the native runtime (SQLite database, filesystem, app_data_dir). The project has no Rust test infrastructure, and adding it would be a separate initiative. Verification is via `cargo build` (compiles) + manual smoke test (commands work in dev mode).*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | -- |
| V3 Session Management | No | -- |
| V4 Access Control | No | Local desktop app, single user |
| V5 Input Validation | Yes | Validate zip structure before trusting contents; validate metadata.json schema with serde deserialization |
| V6 Cryptography | No | Backups are not encrypted (explicit out-of-scope decision) |

### Known Threat Patterns for ZIP + SQLite

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Zip slip (path traversal in entry names) | Tampering | Only read entries by known names ("hobbyforge.db", "metadata.json"), never extract to arbitrary paths |
| Zip bomb (decompression bomb) | Denial of Service | Use `CompressionMethod::Stored` for creation; for validation, only read metadata.json (small) by name |
| SQL injection via VACUUM INTO path | Tampering | Single-quote escaping on path (established pattern in backup_database) |
| Malicious metadata.json | Tampering | serde deserialization with typed struct rejects unexpected fields/types |

## Sources

### Primary (HIGH confidence)
- [docs.rs/zip/2.3.0](https://docs.rs/zip/2.3.0/zip/) - ZipWriter and ZipArchive API, SimpleFileOptions, CompressionMethod
- [docs.rs/zip/2.3.0 ZipWriter](https://docs.rs/zip/2.3.0/zip/write/struct.ZipWriter.html) - start_file, finish, code examples
- [docs.rs/zip/2.3.0 ZipArchive](https://docs.rs/zip/2.3.0/zip/read/struct.ZipArchive.html) - new, by_name, file_names
- `src-tauri/src/lib.rs` - Existing backup_database (lines 578-616) and bulk_sync_rules patterns
- `src-tauri/Cargo.toml` - Current dependencies (sqlx 0.8, serde 1, tauri 2)

### Secondary (MEDIUM confidence)
- [lib.rs/crates/zip](https://lib.rs/crates/zip) - Version history, download stats (14M+/month), 2.3.0 is un-yanked
- [github.com/zip-rs/zip2](https://github.com/zip-rs/zip2) - Source repository, issue tracker

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - zip 2.3.0 verified on docs.rs and crates.io, all other deps already in project
- Architecture: HIGH - directly extends existing proven patterns (backup_database, bulk_sync_rules)
- Pitfalls: HIGH - based on known SQLite VACUUM INTO behavior and zip crate documented API

**Research date:** 2026-05-18
**Valid until:** 2026-06-18 (stable domain, no fast-moving dependencies)

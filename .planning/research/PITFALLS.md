# Pitfalls Research

**Domain:** Backup / restore / export for a Tauri 2 + React 19 + SQLite desktop app (v0.2.14)
**Researched:** 2026-05-18
**Confidence:** HIGH — all pitfalls grounded in direct inspection of `src/db/client.ts`, `src/db/rules-client.ts`, `src-tauri/src/lib.rs`, `src/features/data-health/BackupCard.tsx`, `src/hooks/useDiagnostics.ts`, and verified against tauri-plugin-sql source, SQLite official docs, and community issue threads.

---

## Critical Pitfalls

### 1. DB Connection Lifecycle: tauri-plugin-sql Has No "Reconnect After File Replace"

**What goes wrong:**
The `Database.close()` method closes the connection pool managed by tauri-plugin-sql. After calling `close()`, the plugin removes the pool from its internal `DbInstances` state. Any subsequent call to `db.execute()` or `db.select()` through the old `Database` instance fails with a "pool closed" or "connection not found" error. The JS singleton in `src/db/client.ts` still holds the stale `_dbPromise` reference pointing to the closed instance. Every query in the app that calls `getDb()` will receive the closed connection and throw.

The restore workflow requires: (1) close the connection, (2) replace the `.db` file on disk, (3) reopen. Step 3 is where the trap is. Calling `Database.load("sqlite:hobbyforge.db")` again after `close()` triggers migration re-runs via sqlx's `_sqlx_migrations` table tracking. If the restored backup has the same or older migration history that the app's compiled migrations know about, this is safe and idempotent. If the restored backup has a `_sqlx_migrations` table entry with a different checksum for the same version (e.g., the user edited a migration file between backup creation and restore), sqlx will throw "migration N was previously applied but has been modified" and the app will fail to open the DB.

**Why it happens:**
The `client.ts` singleton pattern (`_dbPromise`) was designed for a single long-lived connection. The `__resetDbForTesting` escape hatch exists but is labeled test-only. Restore requires intentionally breaking the singleton, replacing the file, and rebuilding the singleton — a lifecycle sequence the plugin was not designed to orchestrate from JS.

Additionally, `Database.load()` re-runs migrations on every call, which is correct for fresh installs but can be a landmine when the restored backup's `_sqlx_migrations` table diverges from the compiled migration checksums.

**How to avoid:**
- Implement restore entirely as a Rust Tauri command (`restore_database`), not via JS file operations + reconnect.
- In the Rust command: (1) close the sqlx connection pool manually, (2) delete the existing `.db` and any `-wal`/`-shm` sidecars, (3) copy or unzip the backup `.db` file into place, (4) return success to JS.
- After the Rust command succeeds, call `window.location.reload()` or `tauri::window::WebviewWindow::reload()` to force a full app restart. This reinitializes `_dbPromise = null` and triggers a fresh `Database.load()` with migrations on the new file.
- Do NOT attempt to reset `_dbPromise = null` and re-call `getDb()` in-process. The tauri-plugin-sql plugin state in Rust is separate from the JS singleton; resetting the JS pointer does not re-register the pool in Rust's plugin state.
- Full app window reload (not just React Query invalidation) is the only safe recovery path after in-process file replacement.

**Warning signs:**
- The restore flow calls `await db.close()` then `await Database.load(...)` without a window reload.
- The restore UI shows success but subsequent queries return stale data or throw connection errors.
- `_dbPromise` is set to `null` in JS but no `window.__TAURI_INTERNALS__` reinit or window reload follows.

**Phase to address:** Restore / import phase (first phase that implements actual file replacement). The window-reload approach must be the accepted pattern from day one.

---

### 2. WAL and Sidecar Files: Restore Leaves Stale -wal and -shm Files

**What goes wrong:**
When `hobbyforge.db` is open and the user restores a backup by replacing only the main `.db` file, any existing `hobbyforge.db-wal` and `hobbyforge.db-shm` files are left on disk. SQLite's WAL mode (which `rules.db` explicitly uses, and which `hobbyforge.db` may enter if the journal mode pragma is ever set) treats the `-wal` file as pending committed transactions not yet checkpointed into the main file. After replacing the main file with the backup, SQLite will attempt to apply the stale `-wal` on top of the restored snapshot. The result is either data corruption (transactions from the old DB applied to the restored DB) or an integrity error.

Even if `hobbyforge.db` is in default DELETE journal mode (as configured currently in `client.ts`), a `-journal` file left over from a crashed write transaction can corrupt the restore if it is from the wrong DB generation.

**Why it happens:**
VACUUM INTO (the current backup method) produces a clean, self-contained backup file with no sidecar files. But when restoring this backup over an existing live database, the live DB may have generated `-wal`/`-shm` sidecars since the last checkpoint. The restore code must explicitly delete these before placing the backup file.

**How to avoid:**
- In the Rust restore command, after closing the connection pool, delete all three possible sidecars before copying the backup file:
  ```rust
  let _ = std::fs::remove_file(db_path.with_extension("db-wal"));
  let _ = std::fs::remove_file(db_path.with_extension("db-shm"));
  let _ = std::fs::remove_file(db_path.with_extension("db-journal"));
  ```
  Use `let _ = ...` (ignore errors) because not all sidecars exist on every restore.
- Never restore by copying a backup `.db` file without the sidecar cleanup step.
- After restore, the clean backup file + no sidecars = SQLite opens in a well-defined state.

**Warning signs:**
- Restore implementation uses `std::fs::copy(backup, live_db)` without removing sidecar files first.
- After restore, `PRAGMA integrity_check` returns errors.
- App opens successfully after restore but shows unexpected data (old WAL transactions applied on top of backup).

**Phase to address:** Restore / import phase. The three-file deletion pattern must be in the Rust restore command, not in optional cleanup code.

---

### 3. Schema Version Mismatch: Restoring an Old Backup to a Newer App Version

**What goes wrong:**
`tauri-plugin-sql` tracks applied migrations in a `_sqlx_migrations` table inside the database. When the user restores a backup from a previous app version (e.g., backed up at v0.2.10 with 24 migrations), the restored DB's `_sqlx_migrations` table has only 24 entries. The current app (v0.2.14+) has 28 compiled migrations. On the post-restore `Database.load()` call (which happens on window reload), sqlx compares compiled migrations against `_sqlx_migrations` and runs any missing ones — migrations 25 through 28 — to bring the restored DB up to the current schema.

This is the desired behavior if migrations are purely additive (ADD COLUMN, CREATE TABLE). However, three failure modes exist:

1. **Seed-data migration run twice**: Migration 002 seeds factions and migration 003 seeds units. If the backup was made before `INSERT OR IGNORE` was used in the seed, re-running on a populated DB inserts duplicate rows or fails on UNIQUE constraints.
2. **Destructive migration applied to wrong-schema state**: A migration that runs `ALTER TABLE ... RENAME COLUMN` or `DROP TABLE` assumes the table is in a specific state. If the backup predates the table being created (the table was added in a later migration than the backup contains), the migration will fail.
3. **User-visible data lost in migration gap**: If migration 026 (`unit_rules_mapping`) added a table that the user populated between backup creation and now, restoring the backup (which predates that table) and re-running migration 026 creates the empty table. The user's mapping data is silently gone.

**Why it happens:**
Migrations are idempotent for schema changes (IF NOT EXISTS guards) but not for data. The `_sqlx_migrations` table checksum check prevents re-running already-applied migrations but not the gap scenario.

**How to avoid:**
- Before restore, display a schema compatibility warning to the user: "This backup was created with app version X (N migrations). Your current app version has M migrations. Restoring will re-apply M-N migrations on top of the backup." This is informational — do not block restores, just surface the gap.
- Read the backup's `_sqlx_migrations` count using a separate sqlx connection before replacing the live file. Compare against the count of compiled migrations. If the count is lower, warn the user.
- Ensure all migrations from 025 onward use `CREATE TABLE IF NOT EXISTS` and `INSERT OR IGNORE` to be safe for gap re-application.
- For the safety backup taken before restore: capture it BEFORE any migration runs, so the user can recover to the pre-restore state if migrations fail.

**Warning signs:**
- The restore preview UI shows no schema version information.
- Post-restore migration re-run throws "no such table" or "duplicate entry" errors.
- Migrations 001–003 (seed data) do not use `INSERT OR IGNORE`.

**Phase to address:** Restore / import phase (schema validation) and wherever migration re-application is handled. The metadata.json in the export zip must record the migration count at backup time.

---

### 4. rules.db Restoration: Synced Data Should Not Be Restored

**What goes wrong:**
The v0.2.14 export zip is designed to contain `hobbyforge.db` (all user data). `rules.db` contains only synced Wahapedia data (rw_* tables) which is entirely reproducible via a fresh sync. If a restore implementation naively includes `rules.db` in the backup and restores it, it overwrites the user's current (possibly more current) rules data with a stale snapshot.

More critically: the current `bulk_sync_rules` Rust command opens a direct sqlx connection to `rules.db` at the path `app_data_dir/rules.db`. If a restore has just placed a different version of `rules.db` at that path, and the JS-side `getRulesDb()` singleton (`_rulesDbPromise`) still holds the old open pool, the Tauri plugin-sql pool and the sqlx connection in `bulk_sync_rules` are now pointing at different physical states of the file.

**Why it happens:**
The dual-DB architecture separates user data (`hobbyforge.db`) from synced reference data (`rules.db`). Backup and restore should only concern themselves with `hobbyforge.db`. Including `rules.db` in backups is tempting because it makes the backup "complete", but it creates stale-data and connection conflicts.

**How to avoid:**
- Explicitly exclude `rules.db` from backup exports. The export zip must contain only `hobbyforge.db` + `metadata.json`.
- Document in the restore flow UI: "Backup contains your collection data. Game rules data will remain unchanged and can be re-synced via Settings."
- If a future version decides to include `rules.db` in exports, it must close the `_rulesDbPromise` singleton and the bulk_sync_rules sqlx connection before replacement, identical to the `hobbyforge.db` restore flow.

**Warning signs:**
- The zip creation code iterates the app_data_dir and includes all `.db` files.
- Restore code extracts all files from the zip without filtering to `hobbyforge.db` only.
- Post-restore, the Rules Hub shows data from the backup date rather than the user's most recent sync.

**Phase to address:** Export / backup creation phase. The `hobbyforge.db`-only exclusion must be enforced when building the zip, not as a post-hoc filter.

---

### 5. React Query Cache Remains Stale After DB Swap

**What goes wrong:**
After a restore + window reload, all React Query caches are cleared naturally because `window.location.reload()` destroys the JS runtime. However, if any "soft" restore approach is attempted (resetting `_dbPromise` without a full reload), every cached query in the `QueryClient` still holds the pre-restore data. The user will see their old units, recipes, and army lists even though the underlying `.db` file has been replaced. `queryClient.invalidateQueries()` will trigger refetches that return new data, but only for currently-rendered query keys — queries not currently subscribed remain stale in the cache indefinitely until their `gcTime` (10 minutes) expires.

This pitfall also applies to the `localStorage`-persisted backup status: after a restore, `BACKUP_STORAGE_KEY` in localStorage still references the pre-restore backup. The backup metadata should be updated (or cleared) post-restore to reflect the new DB state.

**Why it happens:**
React Query caches are in-memory per `QueryClient` instance. The `QueryClient` is initialized once at app boot in `QueryProvider`. A file-level DB swap does not automatically notify React Query. `staleTime: 5 minutes` (the app's default) means queries that were fresh before the restore will not refetch for 5 minutes.

**How to avoid:**
- Use `window.location.reload()` after restore — this is the complete solution. It destroys the JS heap (React state, QueryClient cache, Zustand stores, localStorage reads) and forces a clean boot against the restored DB.
- After the reload, the app boots fresh. No manual cache invalidation is required.
- Update `BACKUP_STORAGE_KEY` in localStorage BEFORE triggering the reload: write a new entry recording "last restore date" and "restored from backup path" so the Data Health backup status reflects the restore.
- If a partial-reload approach is ever considered, `queryClient.clear()` (not `invalidateQueries`) must be called — `clear()` removes all cached data without triggering refetches, guaranteeing no stale data is displayed before refetches complete.

**Warning signs:**
- Restore flow uses `queryClient.invalidateQueries()` instead of a full window reload.
- After restore, the UI briefly shows old data before updating.
- The backup status card still shows the old backup date after a restore.

**Phase to address:** Restore / import phase. Window reload is the design constraint; partial-refresh approaches must be explicitly rejected in code review.

---

### 6. VACUUM INTO Path Escaping on Windows: Backslashes and Spaces

**What goes wrong:**
The existing `backup_database` Rust command uses string interpolation to build the VACUUM INTO SQL:

```rust
let sql = format!("VACUUM INTO '{}'", destination.replace('\'', "''"));
```

This correctly escapes single-quote characters in the path. However, on Windows, paths with spaces (e.g., `C:\Users\Antoine André\Desktop\backup.db`) pass through `replace('\'', "''")` unchanged (backslashes are not affected). SQLite's VACUUM INTO parser handles spaces in paths correctly when the path is single-quoted. The escaping is correct as implemented.

The failure mode is different: if the user chooses a destination inside a path containing Unicode characters that the Windows file system handles correctly but that the Tauri dialog returns as a non-UTF-8 sequence, the Rust `String` (which requires valid UTF-8) will fail deserialization. In practice, `tauri-plugin-dialog` returns paths as UTF-8 strings on all platforms, so this is LOW risk. The higher risk is paths on network drives (UNC paths: `\\server\share\backup.db`) which VACUUM INTO does not support.

**Why it happens:**
VACUUM INTO opens the destination file path using SQLite's VFS, which on Windows uses `CreateFileW`. UNC paths and paths longer than MAX_PATH (260 chars without the long-path registry fix) can fail silently or produce opaque SQLite errors. The existing path-escaping is correct for local paths but not for edge-case Windows path types.

**How to avoid:**
- In the save dialog filter, set `defaultPath` to a local path (e.g., the user's Documents folder via `tauri::path::document_dir()`) to steer away from network shares.
- Validate in the Rust command that the destination path is a valid local path (starts with a drive letter, not `\\`) before issuing VACUUM INTO. Return a clear error if it is a UNC path.
- For the zip export, use `std::fs::File::create()` which correctly handles long Windows paths if the `\\?\` prefix is applied. Use `dunce::canonicalize()` (the `dunce` crate) to normalize paths on Windows.
- Keep `VACUUM INTO` for the intermediate step (backup the DB to a temp `.db` file), then zip that temp file using Rust's `zip` crate. Never pass the user's chosen `.zip` path directly to VACUUM INTO.

**Warning signs:**
- The export destination path is passed directly to VACUUM INTO without a local-path validation step.
- A user on a network drive gets a cryptic SQLite error instead of a friendly "unsupported path" message.
- The zip export does not use a temp file intermediate step.

**Phase to address:** Export / backup creation phase. The two-step flow (VACUUM INTO temp `.db`, then zip to user-chosen `.zip` path) is safer than a single-step VACUUM INTO to the final destination.

---

### 7. Zip File Handling in Rust: zip Crate API Breaking Changes

**What goes wrong:**
The Rust `zip` crate has a history of breaking API changes between minor versions. Specifically, the `ZipWriter::start_file()` method signature changed between `zip 0.x` and `zip 2.x`, and the `zip 2.x` API requires `FileOptions` builder patterns that do not compile under `zip 0.x` syntax. If `Cargo.toml` specifies `zip = "2"` but community examples online (which typically show the `zip 0.5` or `zip 0.6` API) are copy-pasted, the code will not compile.

Additionally, `zip` and `zip-extensions` versions must be compatible. Using `zip = "2"` and `zip-extensions = "0.8"` will fail because `zip-extensions 0.8` depends on `zip ~0.6`.

**Why it happens:**
The Rust `zip` crate ecosystem has two distinct API generations. Most StackOverflow examples and blog posts use the older API. The current latest stable is `zip 2.x` with a builder-pattern `FileOptions`. The `zip-extensions` crate (useful for directory extraction) lags behind the main crate.

**How to avoid:**
- Use `zip = "2"` in `src-tauri/Cargo.toml` and write all zip code against the `zip 2.x` API directly. Do not use `zip-extensions` — it adds complexity for a simple single-file zip.
- For the export: create a zip with one entry (`hobbyforge.db`) and one entry (`metadata.json`). The `zip 2.x` pattern:
  ```rust
  use zip::write::{ZipWriter, SimpleFileOptions};
  let mut zip = ZipWriter::new(File::create(&zip_path)?);
  let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
  zip.start_file("hobbyforge.db", options)?;
  zip.write_all(&db_bytes)?;
  ```
- For the import: use `zip::ZipArchive::new()` and extract by entry name, not by index, to avoid order-dependence.
- Pin the exact `zip` version in `Cargo.toml` (`zip = "2.1"`) to prevent `cargo update` from pulling in future breaking changes.

**Warning signs:**
- `Cargo.toml` uses `zip-extensions` alongside `zip = "2"` — version incompatibility.
- `ZipWriter::start_file()` call uses the old `FileOptions::default()` pattern (not `SimpleFileOptions`).
- Compilation fails with "method not found" or "trait bound not satisfied" errors from the zip crate.

**Phase to address:** Export / backup creation phase (zip implementation). The zip crate version must be pinned and tested against a compile-only check before the full implementation.

---

### 8. Safety Backup Before Restore: Must Complete Before File Replacement Begins

**What goes wrong:**
The restore flow requires a "safety backup" to be taken before the user's current DB is overwritten. If the safety backup is initiated in parallel with the file replacement (or if the safety backup's Rust command and the restore's Rust command are both invoked as sequential JS `await` calls), a race condition or out-of-order execution can result in the safety backup capturing a partial state if the restore began writing to the file.

More concretely: `backup_database` (VACUUM INTO) and a hypothetical `restore_database` command both open sqlx connections to `hobbyforge.db`. If both commands are running simultaneously, VACUUM INTO may read a DB that is mid-replacement, producing a corrupt safety backup — the exact scenario it is meant to prevent.

**Why it happens:**
The `backup_database` Rust command opens its own `SqliteConnectOptions` connection independent of the tauri-plugin-sql pool. Multiple sqlx connections to the same file are allowed by SQLite (WAL mode allows readers and one writer simultaneously). However, if the restore Rust command closes the plugin pool and then immediately replaces the file, a concurrent VACUUM INTO connection may be mid-read, producing an incomplete output file.

**How to avoid:**
- The `restore_database` Rust command must:
  1. First call `backup_database` logic inline (not as a separate command invocation) to write the safety backup.
  2. Only after the safety backup VACUUM INTO completes successfully, close the pool and replace the file.
  3. Return the safety backup path in the response so the UI can display "Safety backup saved to X" in the success confirmation.
- Never split safety-backup and restore into two sequential JS `await invoke(...)` calls. Merge them into a single `restore_database` Rust command that performs both atomically from Rust's perspective.
- The safety backup path should be in the app's own data directory (e.g., `app_data_dir/safety-backup-YYYY-MM-DD.db`), not user-chosen, so it does not depend on a file dialog being open.

**Warning signs:**
- The restore UI makes two separate `invoke()` calls: `backup_database` then `restore_database`.
- The safety backup file is empty or smaller than the live DB (VACUUM INTO was interrupted).
- Restore succeeds but `PRAGMA integrity_check` on the safety backup fails.

**Phase to address:** Restore / import phase. The atomic safety-backup-then-replace pattern must be enforced as the only accepted implementation.

---

### 9. Backup Metadata.json: Version Fields Must Match Actual App State at Backup Time

**What goes wrong:**
The export zip's `metadata.json` is intended to record the app version, migration count, and backup date for schema compatibility checking on import. If `metadata.json` is constructed in JS using `import.meta.env.VITE_APP_VERSION` (or similar build-time constant) rather than reading the actual `tauri.conf.json` version at runtime, version parity enforcement (a known existing pitfall from v0.2.11) can cause mismatches. Specifically: if the dev builds without a proper version bump, `metadata.json` records "0.2.14" but the actual binary is "0.2.13-dev".

The migration count is equally fragile: if `metadata.json` is populated by `SELECT COUNT(*) FROM _sqlx_migrations` at backup time but the count is fetched before `Database.load()` has finished applying pending migrations (possible on the first run after an app update), the count in the file will be lower than the actual applied count.

**Why it happens:**
`_sqlx_migrations` is populated during `Database.load()`, which happens asynchronously at startup. If the backup is triggered before the migration run completes (possible if the user opens Data Health very quickly on first launch after an update), the migration count is stale.

**How to avoid:**
- Use `app.package_info().version` in Rust (not a JS constant) to populate the version field in `metadata.json`. This is always the actual binary version.
- Fetch the migration count inside the Rust `backup_database` / `export_database` command, after opening the sqlx connection and ensuring migrations have run, via `SELECT COUNT(*) FROM _sqlx_migrations`.
- The `metadata.json` schema:
  ```json
  {
    "app_version": "0.2.14",
    "migration_count": 28,
    "backup_date": "2026-05-18T14:32:00Z",
    "hobbyforge_db_size_bytes": 2097152
  }
  ```
- On import, compare `migration_count` from `metadata.json` against the count of compiled migrations in the running app. If backup `migration_count > compiled migrations`, refuse the restore with "This backup is from a newer app version. Please update the app before restoring."

**Warning signs:**
- `metadata.json` version is populated from a JS `import.meta.env` constant.
- Migration count is fetched client-side from a React Query hook rather than from Rust at backup time.
- No downgrade protection: restoring a backup from a newer app version into an older app succeeds without warning.

**Phase to address:** Export / backup creation phase. Rust-side metadata population is required; JS-side version constants are insufficient.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| JS-side restore via close() + load() without window reload | Avoids full reload flicker | Stale QueryClient cache; tauri-plugin-sql pool state out of sync with JS singleton | Never acceptable — window reload is required |
| Including rules.db in the backup zip | "Complete" backup | Stale rules data on restore; connection conflicts during DB replacement | Never acceptable — rules.db is reproducible via sync |
| Separate JS invoke() calls for safety-backup then restore | Simpler UI code | Race condition if user triggers restore twice; partial safety backup if timing is wrong | Never acceptable — must be a single atomic Rust command |
| Passing user-chosen zip path directly to VACUUM INTO | One fewer temp file | VACUUM INTO does not write zip files; will write a naked .db file with a .zip extension | Never — two-step (VACUUM INTO temp .db, then zip) is required |
| Skipping -wal / -shm cleanup before file replacement | Fewer file operations | SQLite applies stale WAL to restored snapshot; data corruption or mixed data | Never acceptable |
| Reading app version from JS build constant for metadata.json | Simple JS-only implementation | Version parity mismatch if build not bumped; breaks schema compatibility check | Never acceptable — use Rust app.package_info().version |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| tauri-plugin-sql + file replacement | Call `db.close()` then `Database.load()` in-process to "reconnect" | Perform replacement in Rust command; trigger `window.location.reload()` from JS for clean reinit |
| `VACUUM INTO` + zip export | Pass the .zip destination path to VACUUM INTO directly | VACUUM INTO to a temp `.db` file, then zip it using the Rust `zip` crate in the same command |
| `zip` crate v2.x | Copy-paste `FileOptions::default()` from old examples | Use `SimpleFileOptions::default()` — the `zip 2.x` API; pin version in Cargo.toml |
| Safety backup + restore | Two separate `invoke()` calls from JS | Single `restore_database` Rust command that does safety backup then replacement atomically |
| `rules.db` in restore | Extract all zip entries to app_data_dir | Filter extraction to `hobbyforge.db` only; explicitly skip `rules.db` if present in legacy zips |
| `_sqlx_migrations` checksum | Restore a backup whose migrations were applied from a different binary (dev vs prod) | Checksums must match compiled migrations; warn user if checksum mismatch detected during post-restore Database.load() |
| localStorage backup status | After restore, `BACKUP_STORAGE_KEY` still shows old backup info | Write a "restore event" entry to localStorage before triggering window.location.reload() |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| VACUUM INTO on large DB blocking Rust async thread | UI freezes; progress spinner stalls | Run VACUUM INTO in a dedicated Tauri async command (already the pattern); show spinner with "this may take a moment" | Negligible at current DB size (< 5MB); noticeable at 50MB+ if photo paths grow |
| Reading entire DB file into memory for zip | `std::fs::read()` on a 50MB file allocates 50MB on the async thread | Stream the file into the ZipWriter using `std::io::copy()` instead of buffering | Small DB: fine now; will be visible memory spike at 50MB+ |
| Unzipping entire backup into temp dir for validation | Temp dir fills with extracted files on each import attempt | Open the zip entry as a stream and pipe to a temp `.db` file; validate in-place; delete temp on failure | Always: unnecessary disk use |
| `PRAGMA integrity_check` on 50MB DB | Can take 3–10 seconds on slow disk | Run integrity_check in the Rust command with a configurable timeout; surface partial result if timeout | Negligible now; plan for timeout at 50MB+ |

---

## "Looks Done But Isn't" Checklist

- [ ] **WAL sidecar cleanup:** Before file replacement in Rust, all three sidecars (`-wal`, `-shm`, `-journal`) are explicitly removed with `remove_file` (ignoring NotFound errors).
- [ ] **Window reload after restore:** The restore success handler calls `window.location.reload()` — not just `queryClient.invalidateQueries()` or `queryClient.clear()`.
- [ ] **rules.db excluded from export:** The export zip contains exactly two entries: `hobbyforge.db` and `metadata.json`. Assert by opening the zip and checking entry names in a unit test.
- [ ] **Safety backup completed before replacement:** The Rust restore command writes the safety backup file and verifies its size is > 0 before deleting the live DB file.
- [ ] **Schema version in metadata.json from Rust:** The `app_version` field in `metadata.json` uses `app.package_info().version.to_string()`, not a JS constant.
- [ ] **Migration count read post-migration:** `migration_count` in `metadata.json` is read from `_sqlx_migrations` after the DB connection is established, not from a hardcoded constant.
- [ ] **Downgrade protection:** Restoring a backup with `migration_count > compiled migrations` shows an error message and aborts the restore.
- [ ] **Integrity check on import:** After extracting the backup `.db` to a temp file, run `PRAGMA integrity_check` on it before swapping it into place. Abort and delete temp file if check fails.
- [ ] **zip crate version pinned:** `src-tauri/Cargo.toml` pins `zip = "2.x"` with an exact minor version; `zip-extensions` is NOT present as a dependency.
- [ ] **VACUUM INTO path is local:** The restore Rust command validates the backup destination is a local Windows path (not a UNC path) before issuing VACUUM INTO.
- [ ] **Backup status updated after restore:** `BACKUP_STORAGE_KEY` in localStorage is written before `window.location.reload()` to reflect the restore event in the Data Health backup card.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale -wal applied to restored DB causing corruption | HIGH | Restore from safety backup (taken just before the failed restore). If safety backup also corrupt, data loss — only prevention works. |
| window.location.reload() not called; stale cache | LOW | User navigates away and back; React Query staleTime expires; data corrects itself in ~5 minutes. No data loss. |
| rules.db restored from old backup (stale rules) | LOW | User triggers Wahapedia sync from Rules Hub. Data is fully regenerated in seconds. |
| Safety backup empty / corrupt | MEDIUM | User is left without a pre-restore snapshot. Advise user to check the previously exported zip backup instead. |
| zip crate compilation failure | LOW | Update Cargo.toml to correct zip 2.x version; remove zip-extensions dependency. Compile-time failure; no data at risk. |
| metadata.json version mismatch on import | LOW | Show user a warning with the detected version gap. Allow override import (accepting migration re-run risk). |
| VACUUM INTO to UNC path fails | LOW | Show clear error: "Backup destination must be a local drive. Network paths are not supported." User chooses a different path. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| #1 DB connection lifecycle / window reload | Restore / import phase | After restore, `getDb()` returns fresh data matching the restored backup; no "pool closed" errors in console. |
| #2 WAL sidecar cleanup | Restore / import phase | Restore followed by `PRAGMA integrity_check` returns `ok`; repeat 3 times with live writes in progress. |
| #3 Schema version mismatch | Restore / import + export phase | Restore a v0.2.10 backup into v0.2.14 app; assert missing migrations (25–28) run cleanly and data is preserved. |
| #4 rules.db excluded from export | Export / backup creation phase | Unzip the export; assert exactly 2 entries: `hobbyforge.db` and `metadata.json`. |
| #5 React Query stale cache | Restore / import phase | After restore + reload, all visible data matches the restored backup. Verify via a collection count assertion. |
| #6 Windows path escaping | Export / backup creation phase | Backup to a path with spaces and Unicode characters; verify VACUUM INTO succeeds and zip is readable. |
| #7 zip crate API mismatch | Export / backup creation phase | `cargo build` succeeds with `zip = "2.x"` pinned; no zip-extensions dependency. |
| #8 Safety backup atomicity | Restore / import phase | Invoke restore; verify safety backup file exists and passes `PRAGMA integrity_check` before the live DB is replaced. |
| #9 metadata.json version accuracy | Export / backup creation phase | Build a release binary; export; open zip; assert `app_version` in metadata.json matches the binary version. |

---

## Sources

- `src/db/client.ts` — `_dbPromise` singleton pattern; `__resetDbForTesting` escape hatch; only `PRAGMA foreign_keys = ON` (no WAL mode on hobbyforge.db)
- `src/db/rules-client.ts` — `_rulesDbPromise` singleton; same pattern; WAL mode set on rules.db via sqlx in `bulk_sync_rules`
- `src-tauri/src/lib.rs` — `backup_database` command (VACUUM INTO, single-quote escaping, existing-file removal); `bulk_sync_rules` pattern (direct sqlx connection, not plugin pool)
- `src/features/data-health/BackupCard.tsx` — existing backup UI; localStorage persistence pattern; `BACKUP_STORAGE_KEY`
- GitHub issue: [tauri-apps/plugins-workspace #192](https://github.com/tauri-apps/plugins-workspace/issues/192) — "No js/ts api to close db" (resolved: `close()` method added)
- GitHub issue: [tauri-apps/plugins-workspace #261](https://github.com/tauri-apps/plugins-workspace/issues/261) — "Allows one of multiple identical connections to be closed" — closing one pool affects others on same path
- [tauri-plugin-sql JS API](https://v2.tauri.app/reference/javascript/sql/) — `Database.close()` closes the pool; `Database.load()` re-runs migrations on reconnect
- [SQLite WAL documentation](https://sqlite.org/wal.html) — WAL files must be checkpointed before safe file copy; VACUUM INTO handles WAL correctly
- [VACUUM INTO behavior](https://photostructure.com/coding/how-to-vacuum-sqlite/) — produces standalone file without -wal/-shm; safe while DB is open; smaller than .backup API output
- [zip crate on crates.io](https://crates.io/crates/zip) — v2.x API uses `SimpleFileOptions`; breaking change from v0.x `FileOptions::default()`
- [SQLite _sqlx_migrations checksum behavior](https://github.com/tauri-apps/tauri-plugin-sql/issues/127) — re-running migrations after close/reload is idempotent if checksums match; fails if migration SQL was modified
- `.planning/PROJECT.md` — Key Decisions: `VACUUM INTO via Rust command (not JS bridge)`; `localStorage for backup status`; `Flat inline SQL for transactions`; `Overrides in hobbyforge.db, not rules.db`

---
*Pitfalls research for: v0.2.14 Backup 2.0 — Structured Export, Restore & Safety Backups*
*Researched: 2026-05-18*

# Phase 79: Rust Backup Foundation - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase builds the Rust-side Tauri commands that all downstream backup UI phases depend on. Three new commands replace the existing raw `backup_database` command:

1. **`export_backup`** — VACUUM INTO temp file, bundle with metadata.json into a timestamped .zip archive
2. **`validate_backup`** — Open a .zip, verify structure (metadata.json + hobbyforge.db present), parse and return metadata
3. **`create_safety_backup`** — VACUUM INTO app_data_dir/backups/ as a .zip with auto-generated name

No frontend changes in this phase. The existing BackupCard continues working with the old command until Phase 80 rewires it.

</domain>

<decisions>
## Implementation Decisions

### Export Command (`export_backup`)
- **D-01:** New Rust command `export_backup(destination: String)` — VACUUM INTO a temp file in app_data_dir, then create a zip archive containing `hobbyforge.db` and `metadata.json`. Delete temp file after zip creation.
- **D-02:** metadata.json schema: `{ app_version: string, schema_version: number, created_at: string (ISO 8601), platform: string, db_size_bytes: number }`. Schema version = migration count (28 currently). Platform from `std::env::consts::OS`.
- **D-03:** Backup filename convention: `hobbyforge-backup-YYYY-MM-DD-HHMM.zip` — the frontend provides the full destination path (save dialog in Phase 80). The Rust command just writes to whatever path it receives.
- **D-04:** Add `zip = "2"` to `src-tauri/Cargo.toml` dependencies. Only new crate for this phase.
- **D-05:** Uses the same direct sqlx connection pattern as `bulk_sync_rules` and existing `backup_database` — not the plugin pool.

### Validate Command (`validate_backup`)
- **D-06:** New Rust command `validate_backup(path: String) -> BackupManifest` — opens the zip, checks for `metadata.json` and `hobbyforge.db` entries, parses metadata.json, returns the parsed manifest to the frontend.
- **D-07:** Validation scope for Phase 79: zip integrity, required file presence, metadata.json parseable with all required fields. Does NOT check schema compatibility (that's Phase 81 — RST-04/RST-05).
- **D-08:** Return type `BackupManifest` is a Rust struct with serde Serialize: `{ app_version, schema_version, created_at, platform, db_size_bytes }`. Frontend receives this as JSON.

### Safety Backup Command (`create_safety_backup`)
- **D-09:** New Rust command `create_safety_backup(app: AppHandle) -> String` — creates a backup zip in `{app_data_dir}/backups/` and returns the file path. Same zip format as manual exports (hobbyforge.db + metadata.json).
- **D-10:** Safety backup naming: `safety-YYYY-MM-DD-HHMM.zip` in the backups subdirectory. The command creates the `backups/` directory if it doesn't exist.
- **D-11:** This command is called by restore (Phase 82) and pre-sync safety backup (Phase 82). Phase 79 just ships the command; callers come later.

### Existing `backup_database` Command
- **D-12:** Keep `backup_database` as-is for now. It still works and BackupCard depends on it. Phase 80 will replace BackupCard's invocation with `export_backup` and remove the old command. No breaking changes in Phase 79.

### Claude's Discretion
- Internal helper functions for zip creation (shared between export and safety backup)
- Temp file naming and cleanup strategy
- Error message formatting for validation failures
- Whether to use `chrono` or `std::time` for timestamp formatting (prefer std to avoid new deps)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Rust backend
- `src-tauri/src/lib.rs` — Existing `backup_database` command (VACUUM INTO pattern) and `bulk_sync_rules` (direct sqlx connection pattern). New commands go here.
- `src-tauri/Cargo.toml` — Add `zip = "2"` dependency here.

### Requirements
- `.planning/REQUIREMENTS.md` — EXP-01 through EXP-05 (export), SAF-01, SAF-03 mapped to this phase.

### Prior phase context
- `.planning/milestones/v0.2.13-phases/77-data-health-page-backup-export/77-CONTEXT.md` — Phase 77 decisions on backup_database, Data Health page structure, diagnostic hooks.

### State
- `.planning/STATE.md` §Accumulated Context — Decisions carried forward: zip="2" only new dep, restart for restore, safety backup format.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backup_database` command in `lib.rs:578-616` — VACUUM INTO pattern with direct sqlx connection. The new `export_backup` reuses this same connection approach, just adds zip packaging after.
- `app.path().app_data_dir()` pattern already used in `bulk_sync_rules` and `backup_database` — reuse for safety backup directory.

### Established Patterns
- Direct sqlx `SqliteConnectOptions` connection (not plugin pool) for DB operations that need raw SQLite access — established by `bulk_sync_rules`.
- `#[tauri::command] async fn` with `app: tauri::AppHandle` parameter — standard Tauri command signature.
- Commands registered in `invoke_handler(tauri::generate_handler![...])` macro at bottom of lib.rs.
- `serde::Serialize` / `serde::Deserialize` for command payloads and return types.

### Integration Points
- `invoke_handler` macro in `lib.rs:642` — register 3 new commands alongside existing ones.
- `src-tauri/Cargo.toml` — add `zip = "2"` dependency.
- No frontend integration points in this phase (commands exist but aren't called yet).

</code_context>

<specifics>
## Specific Ideas

- VACUUM INTO creates a consistent, defragmented snapshot — already proven in the existing backup_database command. The new export just wraps this in a zip.
- metadata.json should be human-readable (pretty-printed JSON) so users can inspect backup contents.
- Safety backups directory should be transparent — users can find and manage these files manually if needed.

</specifics>

<deferred>
## Deferred Ideas

- Restore execution and process restart — Phase 82 (RST-06 through RST-08)
- Schema version compatibility checks during validation — Phase 81 (RST-04, RST-05)
- Restore preview UI — Phase 81 (RST-03)
- Safety backup auto-cleanup (cap at N backups) — Future requirement SAF-F02
- Pre-migration safety backup — Future requirement SAF-F01
- Including photos/assets in backup — Future requirement EXP-F01

</deferred>

---

*Phase: 79-Rust Backup Foundation*
*Context gathered: 2026-05-18*

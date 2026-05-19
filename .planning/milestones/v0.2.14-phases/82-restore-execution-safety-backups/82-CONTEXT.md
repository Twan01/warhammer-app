# Phase 82: Restore Execution + Safety Backups - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase completes the destructive restore path and integrates automatic safety backups. Users can confirm a restore in the existing RestorePreviewDialog and the app will: create a safety backup of the current database, atomically replace hobbyforge.db (cleaning up WAL/SHM/journal sidecars), and restart the app. Additionally, a safety backup is automatically created before every Wahapedia rules sync, and the Data Health page lists available safety backups with timestamps and sizes.

</domain>

<decisions>
## Implementation Decisions

### Restore Execution
- **D-01:** New Rust command `restore_from_backup(path: String)` handles the entire destructive sequence: (1) call the existing `create_safety_backup` helper internally to protect current data, (2) delete WAL/SHM/journal sidecar files (`hobbyforge.db-wal`, `hobbyforge.db-shm`, `hobbyforge.db-journal`), (3) extract `hobbyforge.db` from the validated zip and write it to the app_data_dir, replacing the existing file. Returns success or typed error.
- **D-02:** The frontend calls `invoke("restore_from_backup", { path })` from the existing `handleConfirmRestore` in BackupCard. On success, it calls `relaunch()` from `@tauri-apps/plugin-process` to restart the app. This replaces the placeholder toast.
- **D-03:** The Rust command does NOT restart the app itself — it only does the file operations. The frontend owns the restart call so it can show a brief "Restoring..." state before the relaunch. This separation keeps Rust commands pure (file operations) and lets JS control UX timing.
- **D-04:** If the safety backup step fails inside `restore_from_backup`, the restore aborts immediately — no file swap occurs. The user sees an error toast and can retry.
- **D-05:** The `restore_from_backup` command reuses the existing `vacuum_to_temp` + `create_backup_zip` pattern from `create_safety_backup` for the internal safety backup step. No new backup logic needed.

### App Restart
- **D-06:** Use `relaunch()` from `@tauri-apps/plugin-process` (already installed: `tauri-plugin-process = "2.3.1"` in Cargo.toml, `@tauri-apps/plugin-process` in package.json, plugin initialized in lib.rs). This is the documented Tauri 2 pattern for restarting the app process.
- **D-07:** The process:allow-restart capability must be added to `src-tauri/capabilities/default.json` for `relaunch()` to work.

### Pre-Sync Safety Backup
- **D-08:** Add `await invoke("create_safety_backup")` at the top of the `useRulesSync` mutation function (in `src/hooks/useRulesSync.ts`), before any CSV fetching begins. If the safety backup fails, the sync aborts with an error toast.
- **D-09:** The safety backup call in the sync path uses the same `create_safety_backup` Tauri command — no new Rust code needed for this requirement.

### Safety Backup Listing
- **D-10:** New Rust command `list_safety_backups(app: AppHandle) -> Vec<SafetyBackupEntry>` reads the `{app_data_dir}/backups/` directory and returns entries with filename, timestamp (parsed from filename pattern `safety-YYYY-MM-DD-HHMM.zip`), and file size in bytes.
- **D-11:** New `SafetyBackupsList` component rendered below BackupCard on the Data Health page. Simple collapsible list showing timestamp and size for each safety backup. If no safety backups exist, show "No safety backups yet" with a brief explanation of when they're created.
- **D-12:** The list is purely informational in this phase — no delete or restore-from-safety-backup actions. Those are future enhancements.

### Claude's Discretion
- Component decomposition for SafetyBackupsList (inline vs extracted)
- Whether to create a dedicated React Query hook for `list_safety_backups` or keep it simpler
- Loading/empty state UX for the safety backups list
- Whether to show a progress indicator during restore before relaunch
- Error message wording for restore failures (spirit of decisions must be preserved)
- `SafetyBackupEntry` struct fields beyond filename/timestamp/size

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Rust backend
- `src-tauri/src/lib.rs` — `create_safety_backup` (line 758), `vacuum_to_temp` (line 610), `create_backup_zip` (line 650), `validate_backup` (line 725), `BackupManifest` struct (line 577). All existing helpers for the new `restore_from_backup` command.
- `src-tauri/src/lib.rs` — `invoke_handler` registration (line 829). New commands register here.
- `src-tauri/capabilities/default.json` — Add `process:allow-restart` capability for `relaunch()`.
- `src-tauri/Cargo.toml` — No new dependencies needed. `zip = "2"` already present.

### Frontend — Data Health
- `src/features/data-health/BackupCard.tsx` — `handleConfirmRestore` (line 107) is the placeholder to replace with real restore logic. Holds `manifest` and backup path in state.
- `src/features/data-health/RestorePreviewDialog.tsx` — `onConfirm` callback wired to BackupCard. No changes needed in this component.
- `src/features/data-health/DataHealthPage.tsx` — Layout where SafetyBackupsList will be added.

### Frontend — Rules Sync
- `src/hooks/useRulesSync.ts` — Mutation function where `create_safety_backup` invoke gets added (before CSV fetch loop).

### Frontend — Process plugin
- `@tauri-apps/plugin-process` — Already in package.json. Provides `relaunch()` for app restart.

### Requirements
- `.planning/REQUIREMENTS.md` — RST-06 (safety backup before restore), RST-07 (atomic replace), RST-08 (app restart), SAF-02 (pre-sync safety backup), SAF-04 (safety backup listing).

### Prior phase context
- `.planning/phases/79-rust-backup-foundation/79-CONTEXT.md` — Rust command patterns, zip format, `create_safety_backup` design.
- `.planning/phases/81-restore-preview-validation/81-CONTEXT.md` — RestorePreviewDialog design, schema compatibility, confirmation gate.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `create_safety_backup` Rust command — called internally by `restore_from_backup` and directly by `useRulesSync`
- `vacuum_to_temp` + `create_backup_zip` helpers — shared zip creation pattern
- `BackupCard` component — already holds all backup state, just needs restore wiring
- `RestorePreviewDialog` — fully built, `onConfirm` callback ready for real implementation
- `@tauri-apps/plugin-process` — `relaunch()` for app restart, plugin already initialized
- `format_filename_timestamp()` — timestamp formatting for safety backup filenames

### Established Patterns
- Tauri command: `#[tauri::command] async fn` with `app: tauri::AppHandle` parameter
- Frontend invoke: `invoke<T>("command_name", { args })` → typed result or throw
- Toast feedback: `toast.success` / `toast.error` from sonner
- File operations in Rust, UX control in JS — consistent separation across all backup commands
- Safety backup directory: `{app_data_dir}/backups/` with `safety-YYYY-MM-DD-HHMM.zip` naming

### Integration Points
- `BackupCard.handleConfirmRestore` → replace placeholder toast with real restore + relaunch
- `useRulesSync` mutation → prepend `create_safety_backup` invoke
- `DataHealthPage` → add SafetyBackupsList component
- `lib.rs invoke_handler` → register `restore_from_backup` and `list_safety_backups`
- `capabilities/default.json` → add `process:allow-restart`

</code_context>

<specifics>
## Specific Ideas

- The restore flow should feel final but safe — the user already confirmed in the preview dialog, so the actual execution should be swift with a brief "Restoring..." state before the app relaunches.
- Safety backup listing should be understated — most users won't need to interact with it, but it builds confidence that the system is protecting their data automatically.
- The pre-sync safety backup should be invisible when it succeeds — users shouldn't notice any delay. If it fails, that's important enough to abort the sync.

</specifics>

<deferred>
## Deferred Ideas

- Safety backup auto-cleanup (cap at N backups, oldest deleted) — Future requirement SAF-F02
- Pre-migration safety backup (before app updates with schema changes) — Future requirement SAF-F01
- Restore from a safety backup (currently listing only) — future enhancement
- Delete individual safety backups — future enhancement
- Backup diagnostics (never-backed-up flag, staleness threshold, version mismatch) — Phase 83

</deferred>

---

*Phase: 82-Restore Execution + Safety Backups*
*Context gathered: 2026-05-19*

# Phase 81: Restore Preview + Validation - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a non-destructive restore preview flow: users select a backup .zip file from the Data Health page, the app validates the archive and displays manifest details (backup date, app version, schema version, file size), enforces schema compatibility rules, and gates any further action behind explicit confirmation. No data is modified — the actual restore execution belongs to Phase 82.

</domain>

<decisions>
## Implementation Decisions

### Entry Point
- **D-01:** "Restore from backup" button lives on the existing BackupCard alongside the export button. BackupCard already owns all backup-related actions — co-locating restore keeps the pattern consistent.
- **D-02:** Button uses `open` from `@tauri-apps/plugin-dialog` filtered to `.zip` files. The `dialog:allow-open` capability is already granted in `src-tauri/capabilities/default.json`.

### Preview Display
- **D-03:** After file selection, a dialog (AlertDialog-based) opens showing the parsed BackupManifest: backup date (human-readable), app version, schema version, platform, database size. This is the RST-03 requirement.
- **D-04:** The dialog calls `invoke("validate_backup", { path })` — the Rust command from Phase 79 that returns `BackupManifest` without modifying any files.
- **D-05:** If validation fails (corrupt zip, missing metadata.json, missing hobbyforge.db), show an error toast and do not open the preview dialog. The user stays on the Data Health page.

### Schema Compatibility
- **D-06:** Schema version comparison uses the app's current migration count vs `manifest.schema_version`. Current migration count = 32 (but this must be dynamic — read from the same source the Rust backend uses).
- **D-07:** **Newer backup (manifest.schema_version > current):** Red error banner inside the preview dialog. "Continue" button is disabled. Message: "This backup was created with a newer version of HobbyForge. Update the app before restoring." This satisfies RST-04.
- **D-08:** **Older backup (manifest.schema_version < current):** Amber warning banner inside the preview dialog. "Continue" button remains enabled. Message: "This backup was created with an older version. Some data may need migration after restore." This satisfies RST-05.
- **D-09:** **Same version:** No banner. Clean preview with enabled "Continue" button.

### Confirmation Gate
- **D-10:** The preview dialog's action button reads "Replace current database" (not generic "Confirm" or "Restore"). This names the destructive action per RST-09.
- **D-11:** The dialog description explains that the current database will be replaced and a safety backup will be created automatically (foreshadowing Phase 82 behavior).
- **D-12:** The "Replace current database" button is disabled while the preview is loading and when schema version is newer-than-current.
- **D-13:** Clicking "Replace current database" in this phase does NOT perform the restore — it saves the validated path and manifest to component state or a lightweight store so Phase 82 can wire up the actual execution. For now, show a toast: "Restore execution coming in a future update" (placeholder until Phase 82 lands).

### Current Schema Version on Frontend
- **D-14:** The frontend needs the current app schema version (migration count) to compare against the backup manifest. Add a new Tauri command `get_schema_version() -> u32` that returns the migration count, OR reuse the version info already displayed by VersionInfoCard on the Data Health page. Prefer reusing existing data if VersionInfoCard already fetches migration count.

### Claude's Discretion
- Component decomposition (inline vs extracted RestorePreviewDialog)
- Whether to create a dedicated React Query hook for validate_backup or use raw invoke
- Loading state UX during validation (spinner placement, skeleton vs loader)
- Exact wording of warning/error messages (spirit of D-07/D-08 must be preserved)
- Whether the "coming soon" placeholder (D-13) is a toast or inline message

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Rust backend
- `src-tauri/src/lib.rs` — `validate_backup` command (line 768), `BackupManifest` struct (line 621). The Rust side is complete from Phase 79.
- `src-tauri/capabilities/default.json` — `dialog:allow-open` and `dialog:allow-save` already granted.

### Frontend — Data Health
- `src/features/data-health/BackupCard.tsx` — Current backup card with export flow. Restore button goes here.
- `src/features/data-health/DataHealthPage.tsx` — Page layout assembling all health sections.
- `src/hooks/useDiagnostics.ts` — `useBackupStatus` hook and `BACKUP_STORAGE_KEY` localStorage pattern.

### Frontend — Dialog patterns
- `src/components/ui/alert-dialog.tsx` — shadcn AlertDialog used for destructive confirmation gates across the app.
- `src/features/units/JournalTab.tsx` — `open as openDialog` import pattern for file picker.

### Requirements
- `.planning/REQUIREMENTS.md` — RST-01 through RST-05, RST-09 mapped to this phase.

### Prior phase context
- `.planning/phases/79-rust-backup-foundation/79-CONTEXT.md` — Phase 79 decisions on Rust commands, BackupManifest schema, validate_backup scope.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BackupCard` component — extend with restore button alongside existing export button
- `AlertDialog` (shadcn) — use for the preview + confirmation dialog, matches all delete confirmation patterns
- `open` from `@tauri-apps/plugin-dialog` — file picker for .zip selection, already used in 3 components
- `invoke` from `@tauri-apps/api/core` — call `validate_backup` command, same pattern as `backup_database` call
- `formatRelativeDate` in BackupCard — reuse for displaying backup date in the preview

### Established Patterns
- File picker: `open({ filters: [{ name, extensions }] })` → returns path or null
- Tauri invoke: `invoke<T>("command_name", { args })` → returns typed result or throws
- Toast feedback: `toast.success` / `toast.error` from sonner for operation results
- Loading state: `useState(false)` + `Loader2` spinner icon during async operations
- AlertDialog for destructive actions: title, description, Cancel + destructive Action button

### Integration Points
- `BackupCard.tsx` — add restore button and dialog trigger
- `validate_backup` Rust command — invoke from frontend for the first time
- `BackupManifest` TypeScript type — define frontend mirror of the Rust struct
- Schema version — need a way to get current migration count on the frontend

</code_context>

<specifics>
## Specific Ideas

- The preview dialog should feel like a "dry run" — reassuring the user that nothing has changed yet while giving them all the information they need to decide.
- Schema version display should be human-friendly: "Schema version 32 (matches current)" rather than raw numbers.
- The file picker filter for .zip keeps the flow clean — users can't accidentally select a raw .db file.

</specifics>

<deferred>
## Deferred Ideas

- Actual restore execution (file swap, sidecar cleanup, app restart) — Phase 82
- Automatic safety backup before restore — Phase 82 (RST-06)
- Safety backup listing on Data Health — Phase 82 (SAF-04)
- Backup diagnostics (never-backed-up flag, staleness threshold) — Phase 83
- Selective restore (choose which tables) — Future requirement RST-F01

</deferred>

---

*Phase: 81-Restore Preview + Validation*
*Context gathered: 2026-05-18*

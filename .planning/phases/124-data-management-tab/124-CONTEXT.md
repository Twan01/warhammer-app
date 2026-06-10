# Phase 124: Data Management Tab - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the Data tab placeholder in the Settings page with four features: a navigation link to the existing Data Health page, a factory reset with multi-step confirmation, and preference export/import via JSON files. This phase delivers data management controls — it does not modify the Data Health page itself or add new data operations.

</domain>

<decisions>
## Implementation Decisions

### Data Health Link (DAT-01)
- **D-01:** Simple card or section at the top of the Data tab with a brief description ("View diagnostics, backup & restore") and a button/link that navigates to `/data-health` using TanStack Router's `useNavigate()`. No inline health status summary — the Data Health page handles that.

### Factory Reset (DAT-02)
- **D-02:** Factory reset wipes all user data from `hobbyforge.db` by dropping and re-running migrations. The canonical unit database (built at compile time) is not affected since it's rebuilt from the pipeline on install. Photo files in `appDataDir()` are also deleted during reset.
- **D-03:** Multi-step confirmation flow: (1) User clicks "Factory Reset" button styled as destructive. (2) A confirmation dialog appears explaining what will be lost. (3) User must type a confirmation phrase (e.g., "RESET") into a text input to enable the final "Reset" button. This prevents accidental data loss.
- **D-04:** Before executing reset, create a safety backup using the existing `create_safety_backup` Rust command — same pattern as the restore flow in BackupCard.
- **D-05:** After reset, call `relaunch()` from `@tauri-apps/plugin-process` to restart the app with a clean database (same pattern as BackupCard restore flow).
- **D-06:** The actual DB reset is implemented as a Rust Tauri command (`factory_reset`) that: closes the DB connection, deletes the `hobbyforge.db` file, and lets Tauri's migration plugin recreate it on relaunch. This is simpler and more reliable than running individual DELETE statements across 40+ tables.

### Preference Export (DAT-03)
- **D-07:** Export reads all rows from `app_settings` via the existing `getAppSettings()` query and writes them as a JSON file. The JSON structure includes a version field and a flat key-value map: `{ "version": 1, "exported_at": "ISO date", "settings": { "key": "value", ... } }`.
- **D-08:** Uses the native save dialog from `@tauri-apps/plugin-dialog` (`save()`) with a suggested filename like `hobbyforge-preferences-YYYY-MM-DD.json` and a JSON file filter. Then writes via `writeTextFile()` from `@tauri-apps/plugin-fs`.

### Preference Import (DAT-04)
- **D-09:** Import uses the native open dialog (`open()` from `@tauri-apps/plugin-dialog`) with a JSON file filter. Reads the file, validates the JSON structure (version field present, settings is an object), then upserts each key-value pair via the existing `upsertAppSetting()` function.
- **D-10:** On successful import, invalidate the React Query `APP_SETTINGS_KEY` cache so the UI reflects the new values immediately. Show a success toast with the count of imported settings.
- **D-11:** If the JSON is malformed or missing the version field, show an error toast and do not modify any settings. No partial imports — validate the entire file before writing any values.

### Claude's Discretion
- Layout and visual hierarchy within the Data tab (card sections, spacing, dividers)
- Exact confirmation phrase text for factory reset
- Whether to show a loading spinner during reset or just let the app close and relaunch
- Error handling UX for file read/write failures during export/import
- Whether export/import buttons are in a single card or separate sections

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — DAT-01, DAT-02, DAT-03, DAT-04 are the 4 requirements for this phase
- `.planning/ROADMAP.md` §Phase 124 — Success criteria and dependencies

### Settings Foundation (Phase 121)
- `src/db/queries/appSettings.ts` — Query layer: `getAppSettings()`, `getAppSetting()`, `upsertAppSetting()`
- `src/hooks/useAppSettings.ts` — Hook layer: `useAppSettings()`, `useUpdateSetting()`, `APP_SETTINGS_KEY`
- `src/app/settings/page.tsx` — Current tabbed Settings page with Data tab placeholder to replace

### Existing Patterns (file I/O & dialogs)
- `src/features/data-health/BackupCard.tsx` — Reference for save/open dialog, `relaunch()`, safety backup flow, restore with confirmation
- `src/features/army-lists/ArmyListDetailSheet.tsx` — Reference for `save()` dialog + `writeTextFile()` pattern

### Tauri Commands (Rust backend)
- `src-tauri/src/lib.rs` — `export_backup`, `create_safety_backup`, `list_safety_backups` commands; model for new `factory_reset` command

### Integration Points
- `src/app/data-health/page.tsx` — Target of Data Health navigation link
- `src/app/router.tsx` — Route configuration (Data Health at `/data-health`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@tauri-apps/plugin-dialog` (`save`, `open`): Already used in BackupCard, ArmyListDetailSheet, JournalTab — proven file picker pattern
- `@tauri-apps/plugin-fs` (`writeTextFile`, `readFile`): Already used across multiple features
- `@tauri-apps/plugin-process` (`relaunch`): Used in BackupCard restore and UpdateBanner
- `create_safety_backup` Rust command: Existing backup-before-destructive-action pattern
- `useAppSettings()` / `getAppSettings()`: Query + hook layer for reading all settings
- `upsertAppSetting()`: Mutation for writing individual settings
- shadcn `Card`, `Button`, `AlertDialog`: UI primitives available for confirmation flows

### Established Patterns
- File picker: `save()` with filters + `writeTextFile()` for export; `open()` + file read for import
- Destructive action: Safety backup before destructive operation (BackupCard restore precedent)
- App restart: `relaunch()` after DB-level changes (BackupCard restore, UpdateBanner)
- Toast notifications: `toast.success()` / `toast.error()` from sonner for operation feedback
- Tauri commands: `invoke("command_name", { args })` for Rust backend operations

### Integration Points
- Settings page Data tab placeholder at `src/app/settings/page.tsx` — replace with real content
- TanStack Router navigation to `/data-health` for the Data Health link
- React Query cache invalidation via `APP_SETTINGS_KEY` after preference import
- New Rust command `factory_reset` in `src-tauri/src/lib.rs` alongside existing backup commands

</code_context>

<specifics>
## Specific Ideas

No specific requirements — implementations follow well-established codebase patterns (file dialogs, safety backups, relaunch).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 124-Data Management Tab*
*Context gathered: 2026-06-10*

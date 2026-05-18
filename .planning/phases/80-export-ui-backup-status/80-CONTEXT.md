# Phase 80: Export UI + Backup Status - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase upgrades the existing BackupCard on the Data Health page and the DataHealthSummaryCard on the Dashboard to support the new structured backup system from Phase 79. Three changes:

1. **BackupCard migration** — Replace `backup_database` invocation with `export_backup`, update save dialog to .zip format, add a color-coded health indicator (Healthy / Recommended / Overdue / Never) based on backup age
2. **Health status display** — Show last backup as human-readable age with color-coded badge on the BackupCard
3. **Dashboard integration** — Update DataHealthSummaryCard to show backup health with the same color-dot pattern used for sync freshness

No new pages or routes. No new database tables or migrations. This is a UI-only phase that wires existing Rust commands into the frontend.

</domain>

<decisions>
## Implementation Decisions

### Health Indicator Thresholds
- **D-01:** Four-tier health system: **Healthy** (≤7 days, green), **Recommended** (8–30 days, yellow), **Overdue** (>30 days, orange/red), **Never** (no backup recorded, red). These thresholds live in a shared utility so both BackupCard and DataHealthSummaryCard use identical logic.
- **D-02:** Health tier calculation is a pure function `getBackupFreshness(date: string | null)` returning a tier enum — mirrors the existing `getSyncFreshness` pattern in `src/lib/syncFreshness.ts`.

### BackupCard Layout
- **D-03:** Keep the existing Card layout structure (icon + text left, action button right). Add a color-coded dot badge inline with the age text, matching the dot pattern from DataHealthSummaryCard's sync freshness display.
- **D-04:** Update the default filename to `hobbyforge-backup-YYYY-MM-DD-HHMM.zip` and the save dialog filter to `HobbyForge Backup (*.zip)`.
- **D-05:** Replace `invoke("backup_database", { destination })` with `invoke("export_backup", { destination })`. The BackupStatus localStorage shape (`{ date, path, success }`) stays the same — only the file extension changes.

### Dashboard DataHealthSummaryCard
- **D-06:** Replace the plain text backup label with a color-coded dot + text, using the same `FRESHNESS_DOT_CLASS` CSS class map pattern. Create a parallel `BACKUP_FRESHNESS_DOT_CLASS` map or reuse the existing one if the tier names align.
- **D-07:** The backup status text remains: "Backed up today", "Backed up yesterday", "Backed up N days ago", "No backup" — but now preceded by the health dot.

### Old Command Removal
- **D-08:** Remove the `backup_database` command from `src-tauri/src/lib.rs` and its entry in the `invoke_handler` macro. Nothing else references it after BackupCard migrates to `export_backup`.

### Claude's Discretion
- Whether to create a new `backupFreshness.ts` utility or extend the existing `syncFreshness.ts` (prefer separate file for clarity)
- Exact CSS color classes for each backup tier (follow the sync freshness pattern)
- Whether the health dot goes before or after the text in BackupCard
- Any minor layout tweaks needed for visual consistency

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 79 context (upstream)
- `.planning/phases/79-rust-backup-foundation/79-CONTEXT.md` — D-03 (filename convention), D-05 (direct sqlx pattern), D-08 (BackupManifest return type), D-12 (old command preserved for Phase 80 to remove)

### Requirements
- `.planning/REQUIREMENTS.md` — STS-01 (last backup date/age), STS-02 (health indicator), STS-03 (export action), STS-04 (dashboard backup status)

### Existing UI components (to modify)
- `src/features/data-health/BackupCard.tsx` — Current backup card using `backup_database`; rewire to `export_backup`
- `src/features/dashboard/DataHealthSummaryCard.tsx` — Current dashboard card with plain text backup label
- `src/hooks/useDiagnostics.ts` — `useBackupStatus()` hook and `BackupStatus` interface (no changes needed)

### Pattern reference
- `src/lib/syncFreshness.ts` — `getSyncFreshness()`, `getSyncAgeLabel()`, `FRESHNESS_DOT_CLASS` — the backup freshness utility should mirror this pattern

### Rust backend
- `src-tauri/src/lib.rs` — `export_backup` command (line ~733), `backup_database` command (line ~579, to remove)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getSyncFreshness` / `FRESHNESS_DOT_CLASS` in `src/lib/syncFreshness.ts` — Exact pattern to replicate for backup freshness. Returns tier from date, maps to Tailwind dot classes.
- `useBackupStatus()` in `src/hooks/useDiagnostics.ts` — Already reads backup metadata from localStorage. No changes needed; just consume it with the new freshness logic.
- `formatRelativeDate()` in `BackupCard.tsx` — Local helper for "today" / "yesterday" / "N days ago". Consider extracting to shared utility or keeping inline.

### Established Patterns
- Color-coded status dots: `<span className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[tier]}`} />` — used in DataHealthSummaryCard for sync status
- `save()` from `@tauri-apps/plugin-dialog` — already used in BackupCard for the save dialog
- `invoke()` from `@tauri-apps/api/core` — standard Tauri command invocation

### Integration Points
- BackupCard.tsx line 54: `invoke("backup_database", ...)` → `invoke("export_backup", ...)`
- BackupCard.tsx line 42: default filename `.db` → `.zip` with HHMM timestamp
- DataHealthSummaryCard.tsx line 57-60: backup section needs dot + tier logic
- lib.rs invoke_handler macro: remove `backup_database` from the list

</code_context>

<specifics>
## Specific Ideas

- The backup health freshness utility should be a separate file (`src/lib/backupFreshness.ts`) to keep sync and backup concerns decoupled, even though the pattern is identical.
- The BackupCard should show the health tier name alongside the dot (e.g., "Healthy — Backed up 2 days ago") for accessibility.
- The filename change from `.db` to `.zip` in the save dialog is the only user-visible format change — the user just sees a different file extension.

</specifics>

<deferred>
## Deferred Ideas

- Restore UI and restore action on BackupCard — Phase 81 (RST-03)
- Schema compatibility validation during restore — Phase 81 (RST-04, RST-05)
- Safety backup before rules sync — Phase 82 (SAF-02)
- Backup history list (multiple past backups) — Future enhancement
- Auto-backup scheduling — Future enhancement

</deferred>

---

*Phase: 80-Export UI + Backup Status*
*Context gathered: 2026-05-18*

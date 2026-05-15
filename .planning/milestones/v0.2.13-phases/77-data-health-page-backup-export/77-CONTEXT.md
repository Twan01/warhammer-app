# Phase 77: Data Health Page + Backup/Export - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase creates a dedicated Data Health page reachable from the sidebar and implements safe database backup via VACUUM INTO. The page surfaces app version, schema versions, sync metadata, key table row counts, and diagnostic flags (orphaned rows, ambiguous matches, stale data). Backup creates a safe copy of hobbyforge.db via a user-chosen file picker.

Two deliverables:
1. **Data Health page** — new route at `/data-health` with version info, schema status, row counts, and diagnostic flags that load asynchronously
2. **Backup/Export** — new Rust command `backup_database` using VACUUM INTO with a save dialog file picker, plus backup status display on the Data Health page

</domain>

<decisions>
## Implementation Decisions

### Page Location & Navigation
- **D-01:** New route at `/data-health` with its own page component. Not repurposing the Settings placeholder — Data Health is a distinct concern.
- **D-02:** Add to sidebar under the Management group (consistent with Phase 27 navigation structure). Icon: `HeartPulse` or `Activity` from Lucide.

### VACUUM INTO Backup Implementation
- **D-03:** New Rust command `backup_database(destination: String)` in `lib.rs`, following the same pattern as `bulk_sync_rules` — opens a direct sqlx connection to hobbyforge.db (not the plugin pool) and runs `VACUUM INTO ?` with the user-provided path.
- **D-04:** The frontend uses `tauri-plugin-dialog` save dialog to let the user pick the destination file path. The dialog defaults to `hobbyforge-backup-{date}.db` filename.
- **D-05:** Must add `dialog:allow-save` to `src-tauri/capabilities/default.json` (currently only has `dialog:allow-open`).
- **D-06:** After successful backup, store the last backup date and path in localStorage (not DB — the backup status is about the file system, not the database state). The Data Health page reads this to display "Last backup: {date}".

### Diagnostic Detection Logic
- **D-07:** New query file `src/db/queries/diagnostics.ts` with separate async functions per diagnostic group. Each returns a typed result: `{ type: string; count: number; description: string; severity: "warning" | "info" }`.
- **D-08:** Orphaned progress rows: `unit_recipe_step_progress` rows where `recipe_step_id` does not exist in `recipe_steps` (LEFT JOIN WHERE rs.id IS NULL).
- **D-09:** Ambiguous point matches: units in `synced_unit_points` where the unit name matches multiple `rw_datasheet_points` entries (cross-DB detection). Also flag units with zero matches.
- **D-10:** Stale sync data: sync age > 30 days from `rw_sync_meta.last_sync_at`, or sync errors in recent 7 days. Reuse `getSyncFreshness()` from `src/lib/syncFreshness.ts`.
- **D-11:** Row counts for key tables: units, recipes (painting_recipes), unit_recipe_assignments, unit_recipe_step_progress, synced_unit_points. Simple `SELECT COUNT(*)` queries.

### Async Loading Pattern
- **D-12:** Three independent React Query hooks: `useTableCounts()`, `useDiagnosticFlags()`, `useBackupStatus()` (the last one reads localStorage, not DB). Each loads independently — page skeleton renders immediately with loading spinners per section.
- **D-13:** Schema migration version comes from `PRAGMA user_version` on each database. App version comes from `tauri.conf.json` via `@tauri-apps/api/app` `getVersion()`.

### Version & Schema Display
- **D-14:** App version via Tauri `getVersion()` API. Schema versions via `PRAGMA user_version` on hobbyforge.db and rules.db. Last sync date and Wahapedia version from `rw_sync_meta` (reuse existing `useRulesSyncMeta` hook).
- **D-15:** Sync error count from existing `useRulesSyncErrors` hook — no new query needed.

### Claude's Discretion
- Page layout and section ordering (version info, then counts, then diagnostics, then backup — or whatever reads best)
- Card styling and visual hierarchy for diagnostic severity
- Whether diagnostic flags link/navigate to the affected data or just show descriptions
- Loading skeleton design
- Whether to show a "Re-run diagnostics" button or auto-refresh

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Rust backend (backup command pattern)
- `src-tauri/src/lib.rs` — `bulk_sync_rules` command pattern (direct sqlx connection, not plugin pool); entry point for new `backup_database` command
- `src-tauri/capabilities/default.json` — Current permissions; needs `dialog:allow-save` added

### Existing sync/diagnostics infrastructure
- `src/db/queries/syncErrors.ts` — Sync error CRUD (hobbyforge.db, not rules.db)
- `src/hooks/useSyncErrors.ts` — React Query hook for sync errors
- `src/hooks/useDatasheet.ts` — `useRulesSyncMeta` hook (sync meta from rules.db)
- `src/lib/syncFreshness.ts` — `getSyncFreshness()`, `getSyncAgeLabel()`, freshness constants
- `src/features/rules-hub/SyncStatusCard.tsx` — Reference for sync status display patterns

### DB clients
- `src/db/client.ts` — hobbyforge.db singleton (getDb pattern)
- `src/db/rules-client.ts` — rules.db connection (for cross-DB diagnostic queries)

### Navigation
- `src/app/router.tsx` — Route tree (add `/data-health` route)
- `src/components/common/AppSidebar.tsx` — Sidebar Management group (add Data Health link)

### Requirements
- `.planning/REQUIREMENTS.md` — DX-01 through DX-04, BK-01 through BK-03

### Accumulated decisions
- `.planning/STATE.md` §Accumulated Context — VACUUM INTO blocker noted; transaction rules

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useRulesSyncMeta` hook — already provides last_sync_at, wahapedia_version, table counts from rules.db
- `useRulesSyncErrors` hook — provides sync error history
- `getSyncFreshness()` / `getSyncAgeLabel()` — reuse for stale sync detection
- `SyncStatusCard.tsx` — visual patterns for sync status display (freshness dot, error collapsible)
- `@tauri-apps/api/app` `getVersion()` — app version at runtime

### Established Patterns
- One query file per domain in `src/db/queries/` with positional `$1, $2` params
- One hook file per domain in `src/hooks/` with KEY + useQuery
- Tauri commands via `#[tauri::command]` in lib.rs with `invoke()` from frontend
- `dialog:allow-open` already permitted — `dialog:allow-save` follows same pattern
- PlaceholderPage pattern for stub routes (Settings page is one)

### Integration Points
- `lib.rs` `invoke_handler` macro — register `backup_database` alongside `bulk_sync_rules`
- `capabilities/default.json` — add `dialog:allow-save`
- `router.tsx` — add `/data-health` route
- `AppSidebar.tsx` — add Data Health link in Management group
- Cross-DB queries: diagnostics needs to query both hobbyforge.db and rules.db for ambiguous match detection

</code_context>

<specifics>
## Specific Ideas

- Backup filename default: `hobbyforge-backup-YYYY-MM-DD.db`
- Diagnostic flags should have actionable descriptions: "3 orphaned progress rows — these track completion for steps that no longer exist"
- Version info at top of page as a compact header: "HobbyForge v0.2.13 · Schema v28 · Rules v4"
- Row counts as simple metric cards (reuse MetricCard from dashboard if appropriate)

</specifics>

<deferred>
## Deferred Ideas

- Restore from backup — deferred to v0.3+ (connection lifecycle complexity, per REQUIREMENTS.md)
- Auto-backup on schedule — deferred to v0.3+
- Database export to JSON/CSV format
- Diagnostic auto-fix (e.g., "delete orphaned rows" button) — too risky for v0.2.13

</deferred>

---

*Phase: 77-Data Health Page + Backup/Export*
*Context gathered: 2026-05-15*

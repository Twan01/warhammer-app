# Feature Research

**Domain:** Backup/restore for a local-first SQLite desktop app (Tauri 2 + Windows)
**Researched:** 2026-05-18
**Milestone:** v0.2.14 Backup 2.0 — Structured Export, Restore & Safety Backups
**Confidence:** HIGH (grounded in existing codebase inspection + comparable app research)

---

## Context: What Already Exists (v0.2.13)

This is a subsequent milestone. The following backup infrastructure is already shipped and must not be re-scoped here:

| Existing capability | Implementation | Notes |
|---------------------|---------------|-------|
| `backup_database` Rust command (VACUUM INTO) | `src-tauri/src/lib.rs` | Works; only exports hobbyforge.db as raw `.db` file |
| Native save dialog filtered to `.db` | `BackupCard.tsx` via `@tauri-apps/plugin-dialog` | File picker already wired |
| Last backup date + path in localStorage | `useDiagnostics.ts` → `BACKUP_STORAGE_KEY` | `{ date, path, success }` shape |
| BackupCard on DataHealthPage | Phase 77 (BK-01/02/03) | Shows "last backup: N days ago — filename" |
| `tauri_plugin_fs` registered in builder | `lib.rs` | Available for zip/file ops in new Rust commands |
| `tauri_plugin_process` registered | `lib.rs` | Available for app restart after restore |

The v0.2.14 milestone builds on this. The existing `backup_database` command is not modified — new commands are additive.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a serious local-first data app once basic export is shipped. Missing any of these leaves the backup system feeling incomplete or unsafe.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Structured backup export (.zip with DB + metadata.json) | Raw `.db` files are opaque and non-self-describing. Any app that competes for trust (Bear, Obsidian, Stash) packages backups as named archives with version context. A `.zip` that can be opened in Explorer and understood is the expected format for personal data export. | MEDIUM | Zip must contain: `hobbyforge.db` (VACUUM INTO copy), `metadata.json` (app version, schema version, export timestamp, table row counts). Filename: `hobbyforge-backup-YYYY-MM-DD-v{semver}.zip`. New Rust command handles zip assembly. |
| Restore / import from backup file | Any export without restore is a trap. Users back up data expecting to be able to recover. Once export exists, restore is the implied contract. Comparable apps (Bear, Stash) support in-app restore. | HIGH | Sequence: open `.zip` picker → validate zip structure → read metadata.json → show preview → auto-create safety backup → replace hobbyforge.db → trigger app relaunch. The safety-backup-before-replace step is the critical gate — never skip it. |
| Pre-restore safety backup (automatic) | Data-loss is irreversible. The restore operation replaces the live database. Users expect the app to protect them from a bad restore. Bear warns but provides no protection; Stash requires manual pre-backup. The HobbyForge standard is higher: do it automatically. | MEDIUM | No user action needed. New Rust command `safety_backup_database` writes to `app_data_dir/safety-backups/hobbyforge-safety-{timestamp}.db` using VACUUM INTO. Path shown to user in the restore confirmation dialog. Auto-generated filename — no file picker. |
| Schema/version compatibility check on restore | Restoring a backup from a newer schema version onto an older app silently corrupts the database (migrations 29-30 would be missing). Stash has reported bugs from exactly this pattern. This must be a hard block, not an advisory. | MEDIUM | Read `app_version` and `schema_version` from `metadata.json` before restore. Block if backup schema_version > current app migration count. Warn (with override) if versions differ but schema_version <= current. Allow same-or-older schema restores after user confirmation. |
| Restore preview from metadata | Users should know what they are restoring before data is replaced. The `metadata.json` table row counts give enough information for a meaningful preview without opening the DB. | LOW | Display in confirmation dialog: "This backup contains: 42 units, 12 recipes, 8 army lists, 5 factions. Created 2026-05-10 with app v0.2.13." Read from `metadata.json` — no DB access required at this step. |
| Clear success/failure feedback | Users need to know if export/restore worked. Silent failures are unacceptable for a backup system. | LOW | Toast on success with file path (export) or safety backup path (restore). Inline error with actionable copy on failure. Never swallow errors. |
| Backup status staleness in BackupCard | "Last backup: 14 days ago" is more actionable than a bare date. Users should see a visual indication that their backup is stale before something goes wrong. | LOW | Extend existing BackupCard. Compute `backupAgeDays` from localStorage date. Show: green (backed up today/yesterday), amber (3-7 days), red (>7 days or never). Feeds into DataHealthSummaryCard on Dashboard. |

### Differentiators (What Makes This Better Than Raw .db Backup)

Features that separate the v0.2.14 structured backup from the BK-01/02/03 raw `.db` approach and from comparable apps like Bear and Stash.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Timestamped zip filename with app version | Self-documenting archive in Explorer: `hobbyforge-backup-2026-05-18-v0.2.14.zip` tells the user exactly when and from which version without opening anything. Raw `.db` files have no such context. | LOW | Generated at export time from current semver and `todayISO()`. Constructed in the Rust export command. |
| metadata.json with schema version | Machine-readable provenance: enables version compatibility check on restore without opening the DB, and provides human-readable summary of what the backup contains. | LOW | Fields: `app_version` (string semver), `schema_version` (integer = migration count, currently 28), `export_timestamp` (ISO-8601), `db_size_bytes`, `table_row_counts` (object with key tables: units, painting_recipes, army_lists, factions, paints, battle_logs). |
| Automatic pre-restore safety backup | The single biggest trust differentiator. Bear requires users to export first. Stash requires manual pre-backup. HobbyForge does it silently before every restore — users cannot accidentally destroy unrecoverable data. | MEDIUM | Reuses VACUUM INTO logic from existing `backup_database` command. New command: auto-path, no dialog. Path surfaced in confirmation dialog so user knows where the safety net is. |
| Backup age diagnostic in Data Health | "Never backed up" and "Last backup: 23 days ago" are actionable diagnostics, not just informational. Surfaces in DiagnosticsCard alongside orphan and stale-data flags. | LOW | Extends `DiagnosticsCard` with a backup-status check: reads localStorage backup record, checks age, checks if format is structured zip or legacy raw db. Feeds severity badge (none/warn/error). |
| Backup format field in localStorage status | Distinguishes structured zip exports (restorable via the new flow) from legacy raw `.db` exports (not restorable via the new flow). Prevents user confusion when they try to restore an old backup. | LOW | Add `format: "zip" | "raw"` to the `BackupStatus` type in `useDiagnostics.ts`. Old records without `format` are treated as `"raw"`. |

### Anti-Features (Avoid These)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Scheduled / automatic backup on timer | "Set and forget" safety | Single-user personal tool — scheduled tasks add background process complexity, Windows wake/power issues, and notification spam. Explicitly out of scope per PROJECT.md. | Manual export + automatic pre-restore safety backup + optional pre-sync safety backup covers the real risk windows without background processes |
| rules.db in the backup archive | "Complete backup" appeal | rules.db is fully reconstructible from Wahapedia sync at any time. It is destroyed and rebuilt on every sync. Including it doubles the archive size (~2-5 MB of rules data) for zero recovery value. | Document in export UI: "Your personal data is backed up. Rules data is re-synced separately." |
| Backup history list managed in-app | "Restore any version" appeal | Requires in-app storage management, delete UI, and disk space accounting — large scope for single-user marginal value. | Timestamped filenames in Explorer. User manages their own backup history. App tracks only the most recent backup status. |
| Export to CSV or JSON (human-readable) | Data portability appeal | CSV/JSON export of 28-table schema with FK relationships is a distinct "data portability" feature, not a backup. A backup must be restorable; a CSV export is not. | Defer CSV/JSON export to a separate "Export Data" feature under Data Health if requested. |
| Differential / incremental backup | "Faster backup" appeal | SQLite VACUUM INTO already produces a compact consistent snapshot. The DB is typically <5 MB. Full snapshot is fast and simple to validate on restore. Differential adds complexity for no measurable user benefit. | Full VACUUM INTO is the correct approach. |
| Restore from raw .db file (v0.2.14 scope) | Backward compat for BK-01/02/03 backups | Requires a separate restore code path that skips metadata validation. Adds branching complexity to the restore flow. The number of raw .db backups in the wild is low (one user). | Document: "Legacy .db backups cannot be restored in-app. To restore a .db backup, close HobbyForge, replace hobbyforge.db in AppData manually, and relaunch." Revisit in v0.2.15 if needed. |
| Auto-backup before every sync | "Maximum safety" appeal | Wahapedia sync already takes 2-10 seconds for network + DB operations. Adding VACUUM INTO before every sync adds 0.5-1s and silent file accumulation in AppData. Pre-restore safety backup covers the meaningful risk. | Offer pre-sync safety backup as an explicit user toggle in a future settings page, not as a default. |

---

## Feature Dependencies

```
[Structured Export .zip]
    └──requires──> New Rust command: export_backup (zip assembly + metadata.json)
    └──requires──> metadata.json schema definition (app_version, schema_version, etc.)
    └──dependency-of──> Restore (restore reads metadata.json from the zip)

[Restore / Import]
    └──requires──> Structured Export format (zip + metadata.json — must exist to read)
    └──requires──> Safety backup before replace (never skip this gate)
    └──requires──> Schema version compatibility check (block downgrade restore)
    └──requires──> App relaunch after DB replace (plugin-sql pool holds stale handles)
    └──requires──> Restore preview (from metadata.json — no DB access needed)

[Safety backup (automatic)]
    └──requires──> backup_database Rust command pattern (VACUUM INTO — already exists)
    └──new command──> safety_backup_database (auto-path, no dialog)
    └──called-by──> Restore flow (pre-replace step)
    └──enhances──> Restore (turns destructive operation into recoverable operation)

[Schema version compatibility check]
    └──reads──> metadata.json schema_version from zip
    └──compares-against──> Current migration count (get_migrations().len() in lib.rs)
    └──called-by──> Restore flow (before safety backup and replace)

[App relaunch after restore]
    └──uses──> tauri_plugin_process restart() (already registered in lib.rs)
    └──called-by──> Restore flow (final step after DB replace)

[Backup status staleness]
    └──reads──> localStorage BackupStatus (already exists)
    └──extends──> BackupCard (existing component)
    └──enhances──> DataHealthSummaryCard on Dashboard (staleness signal)

[Backup diagnostics]
    └──reads──> localStorage BackupStatus
    └──extends──> DiagnosticsCard (existing component) or new BackupDiagnosticsCard
    └──enhances──> DataHealthPage (existing page — no new route needed)
```

### Dependency Notes

- **Restore requires safety backup — always, no exceptions:** The replace-DB step is irreversible. The safety backup is the only recovery path if the user restores a bad file. This must be executed before the replace, not offered as an option.
- **Restore requires app relaunch, not cache invalidation:** After replacing `hobbyforge.db` on disk, the tauri-plugin-sql connection pool holds file handles to the old file. React Query cache invalidation is insufficient — it will re-query against the old, now-replaced file. `invoke("plugin:process|restart")` is the only clean path. This is already in `lib.rs` via `tauri_plugin_process`.
- **Schema version uses migration count, not semver:** The `schema_version` field in `metadata.json` should be the count of migrations in `get_migrations()` (currently 28), not the app semver. Migration count is the true DB compatibility signal. App semver can change without schema changes. Read via `PRAGMA user_version` at export time or hardcode migration count.
- **Structured export must precede restore in phasing:** Restore reads metadata.json from the zip. If the export command doesn't produce a zip yet, restore has nothing to read. These two features ship together or export ships one phase before restore.
- **Backup diagnostics has no hard dependencies:** Reads only localStorage and does not touch the DB. Can ship in any phase.

---

## MVP Definition for v0.2.14

### Launch With (P1 — core scope)

- [x] Structured backup export — zip containing `hobbyforge.db` + `metadata.json` (app version, schema version, timestamp, table row counts)
- [x] Restore / import from structured backup zip — validate zip, check schema version, show preview, auto-create safety backup, replace DB, relaunch
- [x] Pre-restore safety backup — automatic, no user action, written to `app_data_dir/safety-backups/`, path surfaced in confirmation dialog
- [x] Schema version compatibility check — hard block on downgrade restore; warn with override for version difference on same schema
- [x] Backup status staleness in BackupCard — age-based color indicator (green/amber/red), feeds Dashboard DataHealthSummaryCard

### Add After Core is Stable (P2)

- [ ] Backup diagnostics in DiagnosticsCard — never backed up / format is legacy raw .db / backup too old flags
- [ ] `format` field in localStorage BackupStatus — distinguishes structured zip from legacy raw exports
- [ ] Safety backup before Wahapedia sync — triggered in the sync hook before `invoke("bulk_sync_rules")`; reuses `safety_backup_database` command

### Future Consideration (v0.3+)

- [ ] Restore from legacy raw .db files — separate code path, document manual workaround for now
- [ ] Scheduled auto-backup — explicitly out of scope per PROJECT.md
- [ ] Backup history management — out of scope (timestamped filenames + Explorer is sufficient)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Structured backup export (.zip + metadata.json) | HIGH | MEDIUM | P1 |
| Pre-restore safety backup (automatic) | HIGH | MEDIUM | P1 — gate on restore flow |
| Schema version compatibility check | HIGH | LOW | P1 — hard block, not optional |
| Restore / import with preview + safety backup | HIGH | HIGH | P1 |
| Backup status staleness in BackupCard | MEDIUM | LOW | P1 — extends existing component |
| Backup diagnostics in DiagnosticsCard | MEDIUM | MEDIUM | P2 |
| `format` field in BackupStatus | LOW | LOW | P2 — correctness improvement |
| Safety backup before sync | MEDIUM | LOW | P2 — add after core restore works |
| Restore from legacy raw .db | LOW | MEDIUM | P3 |

**Priority key:** P1 = must have for v0.2.14 launch / P2 = add once core works / P3 = future

---

## Comparable App Patterns

| App | Backup format | Restore UX | Safety pattern | Lessons for HobbyForge |
|-----|--------------|------------|---------------|------------------------|
| Bear (notes, SQLite) | `.bear2bk` = ZIP of TextBundles | Replaces all notes; warns that current notes are lost | None — user must export first | HobbyForge improves on Bear by auto-creating safety backup before replace |
| Stash (media, SQLite + Go) | Raw SQLite file download from web UI | Manual: stop app, delete old .db + WAL files, copy backup, restart | None — user must manually back up first. Schema version mismatch bugs reported. | HobbyForge improves: in-app replace + relaunch, schema version gate |
| Obsidian (markdown vault) | Raw folder / zip; no in-app backup | Not in-app — user manages files externally | None (plain files, no DB) | Not comparable — file-based, not DB |
| HobbyForge v0.2.13 | Raw `.db` via VACUUM INTO | None | None | Current baseline |
| **HobbyForge v0.2.14 target** | `.zip` with DB + metadata.json | In-app: validate → preview → auto-safety-backup → replace → relaunch | Automatic pre-restore safety backup | Meaningfully ahead of all comparable apps on restore safety |

---

## Implementation Notes for Roadmap Phasing

### New Rust commands needed

Three new commands in `src-tauri/src/lib.rs`:

1. **`export_backup(destination: String)`** — VACUUM INTO temp `.db`, build `metadata.json`, zip both into `destination`, delete temp file. Returns `ExportResult { path, size_bytes }`.
2. **`import_backup(source: String)`** — extract zip, read and return `metadata.json` contents for frontend preview + version check. Does NOT replace DB yet — frontend confirms first. Returns `ImportMetadata`.
3. **`restore_backup(source: String)`** — called after user confirms: auto-create safety backup (reuses VACUUM INTO), extract DB from zip, replace `hobbyforge.db`, return safety backup path. Frontend calls `plugin:process|restart` after success.
4. **`safety_backup_database()`** — no args; auto-generates path in `app_data_dir/safety-backups/hobbyforge-safety-{timestamp}.db`; VACUUM INTO. Returns the path written.

Splitting import into validate-step (`import_backup`) and commit-step (`restore_backup`) avoids a half-committed restore if the user cancels during the confirmation dialog.

### BackupStatus type extension

```ts
// src/hooks/useDiagnostics.ts — extend existing type
export interface BackupStatus {
  date: string;        // existing
  path: string;        // existing
  success: boolean;    // existing
  format?: "zip" | "raw";  // new — absent in legacy records = "raw"
}
```

### Restore flow component

`RestoreBackupDialog.tsx` in `src/features/data-health/` — multi-step dialog:
1. Open file picker (`.zip` only)
2. Call `import_backup` → receive `ImportMetadata`
3. Run schema version check in JS
4. Render confirmation step: preview counts + safety backup will be created at [auto-path] + version warning if applicable
5. User confirms → call `restore_backup` → receive safety backup path
6. Show "Restore complete. Safety backup at [path]." toast → `invoke("plugin:process|restart")`

### DataHealthSummaryCard backup signal

The Dashboard's `DataHealthSummaryCard` already exists (DB-03, Phase 78). It should surface the backup staleness signal from `useBackupStatus`. Add a "Backup: N days ago" line or a colored dot to the card's existing health indicators. No new hook needed — reads from localStorage directly.

---

## Sources

- Existing codebase: `src-tauri/src/lib.rs` — `backup_database` command (VACUUM INTO), `tauri_plugin_process` registration
- Existing codebase: `src/features/data-health/BackupCard.tsx`, `src/hooks/useDiagnostics.ts` — `BackupStatus` type, `BACKUP_STORAGE_KEY`
- Existing codebase: `src/features/data-health/DataHealthPage.tsx` — existing page structure; restore UI slots in here
- Comparable app: [Bear backup & restore](https://bear.app/faq/backup-restore/) — zip format, replace-all restore, no safety net
- Comparable app: [Stash backup & restore wiki](https://github.com/stashapp/stash/wiki/Backup-&-Restore-Database) — WAL file caveats, schema version mismatch risk, manual restore procedure
- Comparable app: [Stash schema downgrade discussion](https://github.com/stashapp/stash/discussions/3688) — real-world schema version mismatch failure mode
- SQLite backup strategies: [Backup strategies for SQLite in production](https://oldmoe.blog/2024/04/30/backup-strategies-for-sqlite-in-production/) — VACUUM INTO vs file copy, WAL safety
- Tauri FS plugin: [tauri-plugin-fs docs](https://v2.tauri.app/plugin/file-system/) — available for zip assembly in Rust
- Confirmation dialog UX: [LogRocket — double-check user actions](https://blog.logrocket.com/ux-design/double-check-user-actions-confirmation-dialog/) — when to require explicit confirmation

---

*Feature research for: HobbyForge v0.2.14 — Backup 2.0 (Structured Export, Restore & Safety Backups)*
*Researched: 2026-05-18*

# Architecture Research

**Domain:** Tauri 2 desktop app — structured backup export, restore/import, and safety backups for v0.2.14
**Researched:** 2026-05-18
**Confidence:** HIGH (codebase directly inspected, existing patterns verified)

---

## Existing Architecture (Baseline)

The app already ships two backup-related capabilities:

1. **`backup_database` Rust command** — VACUUM INTO to a user-chosen `.db` path via `save()` dialog. Raw SQLite file, no metadata, no compression.
2. **`BackupCard` component** — UI wrapper in `DataHealthPage`. Calls the command, writes `{ date, path, success }` to `localStorage["lastBackup"]`. Reads back via `useBackupStatus()` (plain function, not a React Query hook).

The existing pattern establishes: file operations must go through Rust commands (not the JS plugin bridge), and `tauri-plugin-dialog` + `tauri-plugin-fs` are already registered and used throughout the app.

---

## System Overview: Backup 2.0 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer (React)                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ BackupCard   │  │ RestoreSheet │  │ BackupStatusBadge │  │
│  │ (enhanced)   │  │ (new)        │  │ (new)             │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                   │              │
├─────────┼─────────────────┼───────────────────┼──────────────┤
│  Hook Layer                                                  │
│  useBackupStatus()  ←─ localStorage (existing)               │
│  useBackupHistory() ←─ localStorage array (new)              │
├─────────┼─────────────────┼───────────────────┼──────────────┤
│  invoke() boundary — Tauri IPC                               │
├─────────▼─────────────────▼───────────────────▼──────────────┤
│  Rust Commands (src-tauri/src/lib.rs)                        │
│  ┌───────────────────┐  ┌────────────────────────────────┐   │
│  │ export_backup     │  │ restore_backup                 │   │
│  │ (zip + metadata)  │  │ (validate, safety-bkp, replace)│   │
│  └───────────────────┘  └────────────────────────────────┘   │
│  ┌───────────────────┐  ┌────────────────────────────────┐   │
│  │ backup_database   │  │ validate_backup_zip            │   │
│  │ (existing VACUUM) │  │ (inspect zip, return manifest) │   │
│  └───────────────────┘  └────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  SQLite / File System                                        │
│  hobbyforge.db  ←─ sqlx direct connection (not plugin pool) │
│  %APPDATA%\com.hobbyforge.app\                              │
│    ├── hobbyforge.db                                         │
│    ├── rules.db                                              │
│    └── safety_backups\          (new — auto-created)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Rust vs TypeScript Boundary

This is the most critical architectural decision for Backup 2.0.

**Must be in Rust:**

| Operation | Why |
|-----------|-----|
| VACUUM INTO (existing) | tauri-plugin-sql JS bridge cannot execute VACUUM INTO — proven in v0.2.13 |
| ZIP archive creation | Requires writing to arbitrary filesystem paths; `zip` crate handles binary safely |
| ZIP extraction | Same — file writes outside AppData scope need Rust's `tauri_plugin_fs` ACL bypass |
| Safety backup creation | Happens before restore — must be atomic with the restore path logic |
| File copy for safety backups | Rust `std::fs::copy` is synchronous and atomic; JS equivalent would add race risk |
| DB file replacement during restore | The plugin pool holds the DB open; only Rust can close the pool and replace the file |
| manifest.json write inside zip | Part of ZIP creation — bundled with it |

**Can stay in TypeScript:**

| Operation | Why |
|-----------|-----|
| File picker dialogs | `tauri-plugin-dialog` already used in BackupCard |
| Reading manifest from zip (preview) | Rust command returns parsed manifest as JSON; TS just renders it |
| React Query cache invalidation after restore | Must happen client-side post-invoke |
| localStorage backup history writes | Same as existing backup status pattern |
| Backup staleness/health computation | Pure function, same pattern as `getSyncFreshness()` |
| Diagnostic flag for "never backed up" | Read-only check of localStorage — no Rust needed |

---

## New Rust Commands Required

### 1. `export_backup` (new — replaces/extends `backup_database`)

```
Input:  { destination: String }  // .zip path from save() dialog
Output: Result<BackupManifest, String>
```

Steps:
1. Resolve `app_data_dir` → get `hobbyforge.db` path
2. `VACUUM INTO` to a temp file in `app_data_dir/tmp_backup.db`
3. Build `metadata.json` (app version, schema version, timestamp, row counts)
4. Open a zip writer at `destination`
5. Add `hobbyforge.db` (from temp file) + `metadata.json` to zip
6. Remove temp file
7. Return `BackupManifest` as JSON (TS side stores to localStorage)

The `zip` crate (`zip = "2"`) must be added to `src-tauri/Cargo.toml`.

### 2. `validate_backup_zip` (new)

```
Input:  { source: String }  // path to .zip file from open() dialog
Output: Result<BackupManifest, String>
```

Steps:
1. Open zip, verify it contains `hobbyforge.db` + `metadata.json`
2. Parse `metadata.json` → return as `BackupManifest`
3. Return error string if corrupt/unrecognized format

Used to power the "preview before restore" UI without doing a restore yet.

### 3. `restore_backup` (new)

```
Input:  { source: String, safety_backup_path: String }
Output: Result<RestoreResult, String>
```

Steps (order is critical):
1. Create safety backup via `VACUUM INTO safety_backup_path`
2. Extract `hobbyforge.db` from zip to a temp file
3. **Close the sqlx connection** to `hobbyforge.db`
4. Replace `app_data_dir/hobbyforge.db` with temp file via `std::fs::rename`
5. **Restart** the Tauri process via `tauri_plugin_process::restart()`

**DB connection lifecycle note:** `tauri-plugin-sql` holds a connection pool to `hobbyforge.db`. You cannot replace a file that is open. The only safe approach for a Tauri app is:
- Use `tauri_plugin_process::restart()` after the file swap — the app restarts, migrations run on the restored DB, and the pool is fresh.
- Do NOT try to close the pool mid-session — no public API for it in tauri-plugin-sql v2.

The `restore_backup` command therefore never returns to the JS caller on success — the process restarts instead. The TS caller should handle this with a `try/catch` that expects either an error (show it) or no response (process is restarting).

### 4. `create_safety_backup` (new helper or merged into restore_backup)

Can be a standalone command OR merged as a pre-step inside `restore_backup`. Standalone is preferable for the "pre-sync safety backup" use case.

```
Input:  {} (no args — path auto-computed)
Output: Result<String, String>  // returns the backup path on success
```

Path: `%APPDATA%\com.hobbyforge.app\safety_backups\safety-{timestamp}.db`

---

## BackupManifest Type (shared Rust + TS)

```typescript
// src/types/backup.ts (new)
export interface BackupManifest {
  app_version: string;        // from tauri.conf.json at backup time
  schema_version: number;     // PRAGMA user_version at backup time
  created_at: string;         // ISO 8601
  hobbyforge_db_size_bytes: number;
  row_counts: {               // for preview display
    units: number;
    painting_recipes: number;
    painting_sessions: number;
    army_lists: number;
    battle_logs: number;
  };
  format_version: number;     // 1 — for future format evolution
}
```

Rust serializes this via `serde::Serialize` → JSON in the zip manifest + return value.

---

## React Query Cache Invalidation After Restore

Since restore causes a process restart, cache invalidation is implicit — the React Query cache is entirely fresh on restart. No explicit invalidation is needed for the restore path.

However, for any future "hot reload" approach (not recommended for v0.2.14), the invalidation would be:

```typescript
// Nuke everything
queryClient.clear();
// Then force remount of the router
```

The restart approach is simpler and safer.

---

## localStorage Backup State Evolution

Existing:
```typescript
// Single entry
BACKUP_STORAGE_KEY = "lastBackup"
{ date, path, success }: BackupStatus
```

Extended for v0.2.14:
```typescript
// Key stays the same for backward compat with existing BackupCard
BACKUP_STORAGE_KEY = "lastBackup"
{ date, path, success, manifest?: BackupManifest }: BackupStatus  // add manifest field

// New key for history
BACKUP_HISTORY_KEY = "backupHistory"
BackupStatus[]  // last N backups (cap at 10)
```

This extends existing types without breaking the existing `useBackupStatus()` hook.

---

## Backup Diagnostics: Pure Function Pattern

Follow the `getSyncFreshness()` pattern — pure function in `src/lib/`:

```typescript
// src/lib/backupHealth.ts (new)
export type BackupHealth = "healthy" | "stale" | "old" | "never" | "failed";

export function getBackupHealth(status: BackupStatus | null): BackupHealth {
  if (!status) return "never";
  if (!status.success) return "failed";
  const ageDays = (Date.now() - new Date(status.date).getTime()) / 86_400_000;
  if (ageDays < 7) return "healthy";
  if (ageDays < 30) return "stale";
  return "old";
}
```

Consumed by the enhanced `BackupCard` and `DataHealthSummaryCard` without any backend calls.

---

## Component Boundaries

| Component | New/Modified | Responsibility |
|-----------|-------------|----------------|
| `BackupCard` | Modified | Add export format selector (zip vs raw db), show manifest details, link to restore |
| `RestoreSheet` | New | File picker → validate_backup_zip → preview manifest → confirm → invoke restore_backup |
| `BackupStatusBadge` | New | Compact badge (healthy/stale/never) for DataHealthSummaryCard dashboard widget |
| `SafetyBackupNotice` | New (inline) | Small notice shown before destructive ops (restore, sync if opted in) |
| `BackupHistoryList` | New (inside BackupCard) | Last N backups from localStorage history |

---

## Data Flow: Export Backup

```
User clicks "Export Backup"
    ↓
save() dialog (tauri-plugin-dialog) → user picks .zip path
    ↓
invoke("export_backup", { destination })
    ↓ [Rust]
VACUUM INTO temp.db → build metadata.json → zip both → return BackupManifest
    ↓ [back to TS]
Write BackupStatus + manifest to localStorage
Update backup history array
Toast: "Backup saved to [filename]"
```

## Data Flow: Restore Backup

```
User clicks "Restore from Backup"
    ↓
open() dialog → user picks .zip path
    ↓
invoke("validate_backup_zip", { source }) → BackupManifest
    ↓
RestoreSheet shows preview (version, date, row counts, schema compatibility check)
    ↓
User confirms → invoke("restore_backup", { source, safety_backup_path })
    ↓ [Rust]
1. VACUUM INTO safety_backup_path   ← safety net
2. Extract hobbyforge.db from zip to temp file
3. std::fs::rename temp → hobbyforge.db
4. tauri_plugin_process::restart()  ← process exits here
    ↓ [App restarts]
tauri-plugin-sql runs migrations on restored DB (no-op if schema matches)
App loads fresh — all React Query cache empty
```

## Data Flow: Safety Backup (pre-restore, optional pre-sync)

```
Auto-triggered before restore (no dialog)
Auto-path: %APPDATA%\com.hobbyforge.app\safety_backups\safety-{YYYYMMDD-HHmmss}.db
invoke("create_safety_backup") → path string → stored in safety backup log
```

---

## Architectural Patterns to Follow

### Pattern 1: Direct sqlx Connection (Not Plugin Pool)

The existing `backup_database` and `bulk_sync_rules` both use a direct `sqlx` connection, bypassing the plugin pool. This is the established pattern for all Rust DB operations. All new Rust backup commands follow this pattern.

**Why:** The plugin pool is managed by tauri-plugin-sql. Direct connections avoid pool contention and allow operations the pool interface doesn't expose (VACUUM INTO, write access outside the plugin's API).

### Pattern 2: Rust Returns Structured Data, TS Stores It

`export_backup` returns a `BackupManifest` struct (serialized as JSON). TypeScript stores it in localStorage. This follows the `bulk_sync_rules` → `SyncResult` pattern already established.

### Pattern 3: Diagnostic Staleness as Pure Function

`getBackupHealth()` follows `getSyncFreshness()` exactly — pure function, no hooks, testable in isolation, no backend calls.

### Pattern 4: Process Restart for Restore

For restore specifically, `tauri_plugin_process::restart()` is the only safe approach given the plugin pool holds the DB open. This is simpler than attempting pool teardown and avoids a class of race conditions. The TS caller wraps the invoke in try/catch but does not await a response — if no error, the app restarts.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Restoring via JS File Write + Pool Reconnect

**What it looks like:** Writing the extracted `.db` bytes via `tauri-plugin-fs` `writeFile()` to the AppData path, then calling `Database.load()` again.

**Why wrong:** `tauri-plugin-sql` holds the DB file open with a connection pool. `writeFile` will either fail (Windows file lock) or corrupt the DB mid-write if the pool is still active. There is no public API to close the pool in v2.

**Instead:** Rust command does the file replacement, then `tauri_plugin_process::restart()`.

### Anti-Pattern 2: Zip Operations in TypeScript

**What it looks like:** Using a JS zip library (e.g., `jszip`) to create the archive client-side.

**Why wrong:** The DB file (`hobbyforge.db`) is not accessible via `tauri-plugin-fs` `readFile()` because the plugin pool holds it open. Rust must create the zip using the VACUUM INTO temp file approach.

**Instead:** `export_backup` Rust command handles all zip operations.

### Anti-Pattern 3: Storing Safety Backups Outside AppData

**What it looks like:** Prompting the user for a safety backup location before every restore.

**Why wrong:** Adds friction to restore. Safety backups are automatic, not user-visible by default.

**Instead:** Fixed subdirectory `%APPDATA%\com.hobbyforge.app\safety_backups\` with timestamped filenames. Mention the path in the post-restore success screen only.

### Anti-Pattern 4: Schema Version Mismatch Silent Restore

**What it looks like:** Restoring a backup without checking if its `schema_version` is compatible.

**Why wrong:** Restoring a backup from v0.2.10 (schema v21) into v0.2.14 (schema v28) will cause migrations to re-run. If any migration is not idempotent, data loss or errors follow.

**Instead:** `validate_backup_zip` returns `schema_version`. The RestoreSheet shows a warning if `backup.schema_version < current.schema_version` ("This backup is from an older version. Migrations will be re-applied on restore."). If `backup.schema_version > current.schema_version`, block with error ("This backup requires a newer app version").

---

## File System Scope: AppData Directory

Established pattern from `src-tauri/src/lib.rs`:

```rust
let app_data_dir = app.path().app_data_dir()
    .map_err(|e| format!("app_data_dir: {e}"))?;
// Windows: C:\Users\{user}\AppData\Roaming\com.hobbyforge.app\
```

New paths created by Backup 2.0:
```
%APPDATA%\com.hobbyforge.app\
  hobbyforge.db           ← existing
  rules.db                ← existing
  safety_backups\         ← new, auto-created by create_safety_backup
    safety-20260518-143022.db
    safety-20260521-091540.db
```

The `safety_backups` subdirectory is created via `std::fs::create_dir_all` inside the Rust command (same as `app_data_dir` creation in `run()`).

---

## Cargo Dependencies Required

```toml
# src-tauri/Cargo.toml additions
zip = "2"          # zip archive read/write — crates.io top result, 70M+ downloads
```

No other new Rust dependencies. `serde_json` and `sqlx` already present.

---

## Suggested Build Order (Phase Dependencies)

1. **Rust foundation first** — `export_backup`, `validate_backup_zip`, `create_safety_backup` commands + `BackupManifest` type. These have no TypeScript dependencies and unblock all UI work. Register in `invoke_handler!`.

2. **TypeScript types** — `src/types/backup.ts` with `BackupManifest`, extended `BackupStatus`. Used by all subsequent UI components.

3. **Enhanced BackupCard + export flow** — Replaces existing `.db` export with `.zip` export. `useBackupStatus()` extended with `manifest`. Existing localStorage key preserved.

4. **`validate_backup_zip` + RestoreSheet** — Preview modal using the validate command. No restore yet — safe to ship independently.

5. **`restore_backup` + confirm flow** — Full restore with safety backup + process restart. Depends on RestoreSheet from step 4.

6. **Backup diagnostics** — `getBackupHealth()` pure function + `BackupStatusBadge` + enhanced `DataHealthPage` backup section. No Rust dependencies — can be built in parallel with step 3+.

---

## Integration Points with Existing Components

| Existing Component | Change Required |
|-------------------|-----------------|
| `BackupCard` | Replace `.db` save dialog with `.zip` save dialog; invoke `export_backup` instead of `backup_database`; show manifest details on success |
| `DataHealthPage` | Add RestoreSheet trigger; add backup history list; replace BackupCard inline |
| `DataHealthSummaryCard` (dashboard) | Add `BackupStatusBadge` using `getBackupHealth()` |
| `src-tauri/src/lib.rs` | Add 3 new commands to `invoke_handler!`; add `zip` import |
| `src-tauri/Cargo.toml` | Add `zip = "2"` |
| `src/hooks/useDiagnostics.ts` | Extend `BackupStatus` interface; add `useBackupHistory()` |
| `src/types/backup.ts` | New file — `BackupManifest`, extended `BackupStatus` |
| `src/lib/backupHealth.ts` | New file — `getBackupHealth()` pure function |

---

## Sources

- `src-tauri/src/lib.rs` — existing `backup_database` pattern (VACUUM INTO via direct sqlx)
- `src/features/data-health/BackupCard.tsx` — existing UI + localStorage pattern
- `src/hooks/useDiagnostics.ts` — existing `BackupStatus` type + `useBackupStatus()`
- `src/db/client.ts` — plugin pool singleton (why it cannot be closed mid-session)
- `src-tauri/Cargo.toml` — existing dependencies; no zip crate yet
- `src-tauri/tauri.conf.json` — plugin registrations including `tauri-plugin-process`
- [zip crate on crates.io](https://crates.io/crates/zip) — standard Rust zip library
- [Tauri plugin-sql docs](https://v2.tauri.app/plugin/sql/) — confirms pool model

---
*Architecture research for: v0.2.14 Backup 2.0 — Structured Export, Restore & Safety Backups*
*Researched: 2026-05-18*

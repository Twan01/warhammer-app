# Stack Research

**Domain:** Data integrity hardening, backup/export, diagnostics, points resolution, after-action loop — v0.2.13 additions to Tauri 2 + React 19 + SQLite desktop app
**Researched:** 2026-05-14
**Confidence:** HIGH

---

## Executive Summary

v0.2.13 adds five capability areas to an existing, stable stack. The research
question is whether any of them require new libraries. The answer is almost no:

- **Transactional recipe saves** — `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`
  already works via `db.execute()` on the existing single-connection singleton.
  Confirmed in production code (`syncedUnitPoints.ts`). No new library needed.
- **Backup / export / restore** — Requires one custom Rust Tauri command using
  `std::fs::copy()`. The TypeScript side uses the already-installed
  `@tauri-apps/plugin-dialog` (save/open dialogs) and `@tauri-apps/plugin-fs`
  (writeTextFile for JSON export). No new npm or Cargo dependency needed.
- **SQLite file zip wrapping** — If zipping the backup `.db` file for distribution,
  add `fflate` (11.5 kB gzipped). This is optional; bare `.db` copy is simpler
  and sufficient for a single-user local tool.
- **Data health diagnostics** — `PRAGMA integrity_check`, `PRAGMA foreign_key_check`,
  and `SELECT` from `sqlite_master` all work through existing `db.select()`. No new
  library needed.
- **Centralized points resolver** — A pure TypeScript function in `src/lib/`. No
  library. The 5-level COALESCE already lives in SQL; the resolver is a JS wrapper
  that labels the winning source.

---

## Existing Stack (No Changes Needed)

| Layer | Technology | Relevant to v0.2.13 |
|-------|------------|---------------------|
| Desktop shell | Tauri 2 | Rust commands for backup |
| Frontend | React 19 + TypeScript 5 + Vite 6 | All UI |
| Styling | Tailwind v4 + shadcn/ui new-york/zinc | Diagnostics page UI |
| State | React Query 5 + Zustand 5 | Diagnostics queries, Game Day state |
| DB access | @tauri-apps/plugin-sql ^2.4.0 | Transactions, PRAGMA queries |
| File system | @tauri-apps/plugin-fs ^2.5.1 | JSON export writeTextFile |
| Dialog | @tauri-apps/plugin-dialog ^2.7.1 | save() / open() for file picker |
| Rust async | sqlx ^0.8 (already in Cargo.toml) | Not needed for backup; std::fs is synchronous and fine |
| Forms | React Hook Form 7 + Zod 4 | Restore confirmation form |
| Charts | Recharts 3.8.0 | Diagnostics summary panel |
| Test infra | Vitest 4 + better-sqlite3 ^12.10.0 | Extend existing test suite |

---

## Capability-by-Capability Stack Decisions

### 1. Transactional Recipe Graph Save

**Decision: Use existing `db.execute('BEGIN TRANSACTION')` / `COMMIT` / `ROLLBACK` pattern.**

The app already does this in production. `syncedUnitPoints.ts` (Phase 65) uses
`BEGIN TRANSACTION` → loop of `db.execute()` → `COMMIT` / `ROLLBACK on catch`.
This works because `client.ts` maintains a singleton connection — all `execute()`
calls share the same SQLite connection handle, so the transaction is real and the
rollback actually reverts.

The GitHub issue #886 (tauri-apps/plugins-workspace) reporting that ROLLBACK
"doesn't take place" is a connection-pool problem: when `Database.load()` is called
multiple times or the plugin uses a pool, BEGIN and subsequent statements may land
on different connections. The singleton pattern in `client.ts` avoids this entirely.

**Pattern to reuse for recipe graph save:**

```typescript
const db = await getDb();
await db.execute("BEGIN TRANSACTION", []);
try {
  // DELETE removed sections
  // UPDATE existing sections
  // INSERT new sections
  // DELETE removed steps  
  // UPDATE existing steps
  // INSERT new steps
  await db.execute("COMMIT", []);
} catch (e) {
  await db.execute("ROLLBACK", []);
  throw e;
}
```

No new library. No Rust changes. Follows the established pattern exactly.

### 2. Backup / Export / Restore

**Decision: Custom Rust Tauri command for `.db` file copy; TypeScript handles JSON export.**

Three backup formats are in scope:

#### 2a. SQLite File Copy (primary backup)

Use a new `backup_database` Tauri command in `lib.rs`. The command:
1. Receives a destination path string from TypeScript (from the dialog picker)
2. Calls `std::fs::copy(src_path, dst_path)` — synchronous, OS-level copy

**Why custom Rust command over `tauri-plugin-fs`:**
- `tauri-plugin-fs` `copyFile()` requires a `BaseDirectory` enum for both source
  and destination. Copying from `AppLocalData` to an arbitrary user-chosen path
  (e.g., Desktop, Documents, a USB drive) does not map cleanly to a single base
  directory and requires capability scope entries that are overly broad.
- A dedicated Rust command takes the full resolved path from the dialog, which
  already has OS-level access granted by the file picker. This is the pattern
  used by `bulk_sync_rules` and is consistent with the codebase's approach of
  putting Tauri-native operations in `lib.rs`.
- `std::fs::copy()` is a one-liner, safe, and handles Windows paths correctly.

**Why not VACUUM INTO:**
`VACUUM INTO 'path'` produces a smaller, defragmented copy but rewrites every page.
For a desktop hobby app with a ~5 MB database, compaction is irrelevant. A straight
`std::fs::copy()` is byte-faithful (includes WAL if flushed) and runs in
milliseconds. Use `VACUUM INTO` if storage size becomes a concern (unlikely for
this domain).

**TypeScript side (no new library):**

```typescript
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

const destPath = await save({
  title: 'Save HobbyForge Backup',
  defaultPath: `hobbyforge-backup-${todayISO()}.db`,
  filters: [{ name: 'SQLite Database', extensions: ['db'] }],
});
if (!destPath) return; // user cancelled
await invoke('backup_database', { destPath });
```

**Rust side (add to `lib.rs`, no new Cargo dep):**

```rust
#[tauri::command]
async fn backup_database(app: tauri::AppHandle, dest_path: String) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let src = app_data_dir.join("hobbyforge.db");
    std::fs::copy(&src, &dest_path)
        .map(|_| ())
        .map_err(|e| format!("copy failed: {e}"))
}
```

Register with `tauri::generate_handler![bulk_sync_rules, backup_database]`.

#### 2b. JSON Export (data portability)

Read all tables via existing `db.select()` hooks, serialize to JSON, write with
`writeTextFile` from `@tauri-apps/plugin-fs` (already installed). The save dialog
path comes from `@tauri-apps/plugin-dialog` (already installed).

No new library. The JSON export is a React Query + hooks operation in TypeScript.

#### 2c. Restore

Restore from a `.db` file backup requires:
1. `open()` dialog to pick the backup file
2. A `restore_database` Rust command that copies the picked file over `hobbyforge.db`

**Critical:** The app must close the existing DB connection before overwriting the
file, then reinitialize. Use `__resetDbForTesting()`'s approach: `_dbPromise = null`
then call `getDb()` again. This requires exposing a `resetDb()` function from
`client.ts` for production use (rename from test-only).

**No new library.** Pattern follows backup in reverse.

### 3. Data Health Diagnostics Page

**Decision: SQLite PRAGMAs and sqlite_master queries via existing `db.select()`.**

All diagnostic queries use standard SQLite introspection — no library needed:

| Diagnostic | Query |
|-----------|-------|
| File integrity | `PRAGMA integrity_check` |
| FK violations | `PRAGMA foreign_key_check` |
| Table list | `SELECT name, type FROM sqlite_master WHERE type='table'` |
| Row counts | `SELECT COUNT(*) FROM <table>` per table (loop) |
| Orphaned applied_recipe_steps | `SELECT ... WHERE recipe_step_id NOT IN (SELECT id FROM recipe_steps)` |
| Sessions with dead section FK | `SELECT ... WHERE recipe_section_id IS NOT NULL AND recipe_section_id NOT IN (SELECT id FROM recipe_sections)` |

These run through the existing `db.select<T[]>()` pattern. Wire them as React Query
queries with a "Run Diagnostics" button trigger (not auto-run on mount — integrity
check has measurable cost on larger databases).

Results display via existing shadcn/ui components (Table, Badge, Alert). No new UI
library needed. If a summary chart is wanted, Recharts is already installed.

### 4. Centralized Points Resolver

**Decision: Pure TypeScript function in `src/lib/resolvePoints.ts`. No library.**

The existing 5-level COALESCE is in SQL (army list queries). The centralized
resolver is a JavaScript function that mirrors that precedence chain for display
contexts where SQL isn't being called (unit detail headers, diagnostics panel,
Game Day readiness).

```typescript
// src/lib/resolvePoints.ts
export type PointsSource =
  | 'army-list-override'
  | 'user-override'
  | 'synced-wahapedia'
  | 'manual-unit'
  | 'zero';

export interface ResolvedPoints {
  points: number;
  source: PointsSource;
  isFresh: boolean;
}

export function resolvePoints(opts: {
  armyListOverride?: number | null;
  userOverride?: number | null;
  syncedPoints?: number | null;
  unitPoints?: number | null;
  syncedAt?: string | null;
}): ResolvedPoints { ... }
```

This is a pure function — testable with Vitest without any DB or Tauri involvement.
Follows the `computeWorkflowPosition` pattern (pure lib function, tested in
isolation).

### 5. Game Day After-Action Loop

**Decision: Zustand persist (localStorage) for session state; new `battle_log` form fields via existing query/hook/mutation pattern. No new library.**

The after-action loop is:
- End-of-game result entry form: React Hook Form + Zod (existing)
- Auto-populate army list, CP spent from Game Day state: read from Zustand store
- Insert into `battle_logs`: existing `createBattleLog` mutation
- Session recap screen: existing React Query hooks

No new library. Schema may need 1-2 new nullable columns on `battle_logs`
(e.g., `cp_spent INTEGER`, `total_rounds INTEGER`) via an additive migration.

---

## New Dependencies (Summary)

### Production: None Required

No new npm packages needed for any v0.2.13 feature. All capabilities are available
through the existing stack.

**Optional addition: `fflate` for ZIP backup format**

| Property | Value |
|----------|-------|
| Package | `fflate` |
| Version | `^0.8.2` |
| Bundle size | 11.5 kB gzipped |
| Purpose | ZIP the `.db` file for backup distribution |
| Verdict | Defer — a bare `.db` copy is simpler and sufficient for single-user use. Add only if the user explicitly wants zipped backups. |

### Rust: No New Cargo Dependencies

`std::fs::copy()` is in the standard library. The existing `sqlx` in Cargo.toml
is not needed for backup (that's for `bulk_sync_rules`). The new Rust commands
use only `tauri::AppHandle` and `std::fs`.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Third-party transaction library for tauri-plugin-sql | Not needed — `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK` via `db.execute()` already works in the singleton pattern (confirmed in `syncedUnitPoints.ts`) | Existing `db.execute('BEGIN TRANSACTION')` pattern |
| `@bspeckco/tauri-plugin-sqlite` | A fork with explicit transaction methods — unnecessary since the current plugin works for single-connection transactions, and switching plugins would break all existing query code | Existing plugin + BEGIN/COMMIT pattern |
| `tauri-plugin-store` for diagnostics state | Overkill — diagnostics state is ephemeral (run on demand, not persisted) | React Query with `staleTime: 0` for force-refresh on demand |
| `jszip` | 36x larger than `fflate` for equivalent ZIP functionality; main-thread blocking in some scenarios | `fflate` if ZIP is needed |
| `VACUUM INTO` for backup | Rewrites all pages — slower, produces different byte content than the live DB. For a ~5 MB hobby app, the size benefit is irrelevant. | `std::fs::copy()` via Rust command |
| Cross-database JOIN for diagnostics | `ATTACH DATABASE` is documented as a `tauri-plugin-sql` limitation in `PROJECT.md` | Dual-query merge pattern (already established) |
| Drizzle ORM | PROJECT.md Key Decisions: escape hatch only if raw queries become unmanageable. At 28 typed query files, still manageable. | Existing `$1, $2` parameterized queries |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `@tauri-apps/plugin-sql` | ^2.4.0 (current) | `BEGIN TRANSACTION` via `execute()` | Works on single-connection singleton; confirm in `syncedUnitPoints.ts` |
| `@tauri-apps/plugin-dialog` | ^2.7.1 (current) | `save()` with `defaultPath` + `filters` | Returns `string \| null`; null = user cancelled |
| `@tauri-apps/plugin-fs` | ^2.5.1 (current) | `writeTextFile` for JSON export | Requires `fs:default` capability (already granted) |
| `tauri` Rust | 2.x (current) | `std::fs::copy()` | Standard library, no version constraint |
| `sqlx` | 0.8 (current) | Existing `bulk_sync_rules` only | Not used for backup commands |

---

## Tauri Capability Changes Needed

The `backup_database` and `restore_database` Rust commands invoke `std::fs::copy()`
with a user-provided path. The Tauri capability scope does not restrict Rust-side
`std::fs` operations — only frontend JS APIs are scoped. No capability changes are
needed for the Rust backup commands.

The `save()` / `open()` dialog calls are already in use for the sync file picker
(or will be). If not yet present, add to `src-tauri/capabilities/default.json`:

```json
"dialog:default"
```

---

## Sources

- `src/db/queries/syncedUnitPoints.ts` (direct codebase inspection) — confirms `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK` via `db.execute()` works in production on the singleton connection. HIGH confidence.
- `package.json` (direct codebase inspection) — current installed versions of all plugins. HIGH confidence.
- `src-tauri/Cargo.toml` (direct codebase inspection) — `sqlx 0.8`, `tauri-plugin-fs 2`, `tauri-plugin-dialog 2` already present. HIGH confidence.
- [tauri-apps/plugins-workspace issue #886](https://github.com/tauri-apps/plugins-workspace/issues/886) — Transaction rollback failure traced to connection pool (not single-connection) scenario. MEDIUM confidence (issue thread, no official resolution doc).
- [Tauri SQL Plugin docs](https://v2.tauri.app/plugin/sql/) — `execute()`, `select()`, `close()` are the three TypeScript methods. No native transaction API. HIGH confidence.
- [Tauri Dialog reference](https://v2.tauri.app/reference/javascript/dialog/) — `save(options): Promise<string | null>` with `defaultPath`, `filters`, `title`. HIGH confidence.
- [Tauri File System plugin](https://v2.tauri.app/plugin/file-system/) — `copyFile` requires `BaseDirectory` enum for both paths; `writeTextFile` works for JSON export. HIGH confidence.
- [SQLite Backup API](https://sqlite.org/backup.html) — `VACUUM INTO` vs `std::fs::copy()` tradeoffs. `copy()` is byte-faithful; `VACUUM INTO` is compacted. HIGH confidence.
- [fflate npm](https://www.npmjs.com/package/fflate) — 11.5 kB gzipped, TypeScript support, faster than JSZip. HIGH confidence (deferred as optional).
- [SQLite PRAGMA docs](https://sqlite.org/pragma.html) — `integrity_check`, `foreign_key_check`, `quick_check` behavior and performance characteristics. HIGH confidence.

---

*Stack research for: v0.2.13 Data Integrity, Diagnostics & Product Coherence*
*Researched: 2026-05-14*

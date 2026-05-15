# Phase 77: Data Health Page + Backup/Export - Research

**Researched:** 2026-05-15
**Domain:** Tauri 2 desktop app — SQLite diagnostics, VACUUM INTO backup, React Query async loading
**Confidence:** HIGH

## Summary

Phase 77 adds a Data Health page at `/data-health` and a safe database backup feature using SQLite VACUUM INTO. The page surfaces app version, schema migration versions, sync metadata, row counts for key tables, and diagnostic flags (orphaned records, ambiguous matches, stale data). The backup creates a consistent copy of hobbyforge.db via a new Rust command, with the user choosing a destination through the Tauri save dialog.

The technical risk is low. All frontend patterns (new route, sidebar nav item, React Query hooks, query modules) are well-established in the codebase with 27 prior phases as precedent. The only new capability is the Rust `backup_database` command using sqlx's VACUUM INTO, which follows the exact same connection pattern as the existing `bulk_sync_rules` command. The `dialog:allow-save` permission is the only new capability entry needed.

**Primary recommendation:** Implement in two plans: (1) Rust backup command + diagnostics query module + hooks, (2) Data Health page UI with all sections wired up.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: New route at `/data-health` with its own page component, not reusing Settings
- D-02: Add to sidebar under Management group, icon HeartPulse or Activity from Lucide
- D-03: New Rust command `backup_database(destination: String)` in lib.rs using direct sqlx connection (same pattern as bulk_sync_rules)
- D-04: Frontend uses `tauri-plugin-dialog` save dialog, default filename `hobbyforge-backup-{date}.db`
- D-05: Must add `dialog:allow-save` to `src-tauri/capabilities/default.json`
- D-06: Last backup date/path stored in localStorage (not DB)
- D-07: New query file `src/db/queries/diagnostics.ts` with separate async functions per diagnostic group
- D-08: Orphaned progress: LEFT JOIN recipe_steps WHERE rs.id IS NULL
- D-09: Ambiguous points: units in synced_unit_points matching multiple rw_datasheet_points entries; also flag zero matches
- D-10: Stale sync: reuse `getSyncFreshness()` from syncFreshness.ts, threshold >30 days + recent errors
- D-11: Row counts via SELECT COUNT(*) for: units, painting_recipes, unit_recipe_assignments, unit_recipe_step_progress, synced_unit_points
- D-12: Three independent hooks: useTableCounts(), useDiagnosticFlags(), useBackupStatus() (localStorage)
- D-13: Schema version via PRAGMA user_version; app version via @tauri-apps/api/app getVersion()
- D-14: Reuse useRulesSyncMeta + useRulesSyncErrors hooks for sync info
- D-15: Sync error count from existing useRulesSyncErrors hook

### Claude's Discretion
- Page layout and section ordering
- Card styling and visual hierarchy for diagnostic severity
- Whether diagnostic flags link/navigate to affected data
- Loading skeleton design
- Whether to show "Re-run diagnostics" button or auto-refresh

### Deferred Ideas (OUT OF SCOPE)
- Restore from backup (v0.3+)
- Auto-backup on schedule (v0.3+)
- Database export to JSON/CSV
- Diagnostic auto-fix buttons
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DX-01 | Data Health page shows app version, schema versions, last sync date, sync error count | getVersion() from @tauri-apps/api/app [VERIFIED], PRAGMA user_version for schema, reuse useRulesSyncMeta + useRulesSyncErrors |
| DX-02 | Row counts for key tables | Simple COUNT(*) queries in diagnostics.ts, independent React Query hook |
| DX-03 | Flags orphaned progress, ambiguous points, stale sync | Three diagnostic queries: LEFT JOIN for orphans, cross-DB for ambiguous, getSyncFreshness() for stale |
| DX-04 | Diagnostics load without blocking UI | Three independent useQuery hooks load in parallel; page skeleton renders immediately |
| BK-01 | Backup via UI file picker | save() from @tauri-apps/plugin-dialog + invoke('backup_database', { destination }) |
| BK-02 | VACUUM INTO for safe copy | Rust command uses sqlx direct connection, executes VACUUM INTO with user-provided path |
| BK-03 | Backup status displayed | localStorage stores last backup date/path/status; useBackupStatus() hook reads it |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| VACUUM INTO backup | Rust backend | Frontend (invoke) | SQLite VACUUM INTO must run via native sqlx connection, not JS bridge |
| Save file dialog | Frontend (Tauri API) | -- | @tauri-apps/plugin-dialog save() is a frontend API call |
| Diagnostic queries | Frontend (DB queries) | -- | All SELECT queries run through tauri-plugin-sql JS bridge |
| Schema version (PRAGMA) | Frontend (DB queries) | -- | PRAGMA user_version is a standard SELECT-like query via plugin-sql |
| App version | Frontend (Tauri API) | -- | @tauri-apps/api/app getVersion() reads tauri.conf.json version |
| Backup status persistence | Frontend (localStorage) | -- | No DB involvement — file system metadata stored client-side |
| Route + navigation | Frontend (React) | -- | Standard TanStack Router route + sidebar nav item |

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tauri-apps/api | ^2.0.0 | getVersion() for app version display | [VERIFIED: node_modules] Already in package.json |
| @tauri-apps/plugin-dialog | ^2.7.1 | save() for backup file picker | [VERIFIED: node_modules] Already used for open() in JournalTab |
| @tauri-apps/plugin-sql | ^2.4.0 | SELECT queries for diagnostics, PRAGMA user_version | [VERIFIED: node_modules] Core data layer |
| @tanstack/react-query | ^5.100.6 | Async data loading with independent hooks | [VERIFIED: node_modules] Standard state pattern |
| sqlx (Rust) | 0.8 | Direct SQLite connection for VACUUM INTO | [VERIFIED: Cargo.toml] Already used by bulk_sync_rules |
| tauri-plugin-dialog (Rust) | 2 | dialog:allow-save permission | [VERIFIED: Cargo.toml] Already a dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.460.0 | HeartPulse/Activity icon for sidebar, AlertTriangle/Info for diagnostics | [VERIFIED: package.json] |
| sonner | ^2.0.7 | Toast notifications for backup success/failure | [VERIFIED: package.json] |

**No new dependencies needed.** Everything required is already installed.

## Architecture Patterns

### System Architecture Diagram

```
User clicks "Create Backup"
        |
        v
save() dialog (Tauri plugin-dialog)
        |
        v  (returns file path or null)
invoke("backup_database", { destination })
        |
        v
Rust: backup_database command
  - Opens direct sqlx connection to hobbyforge.db
  - Executes VACUUM INTO '{destination}'
  - Returns Ok(()) or Err(message)
        |
        v
Frontend: stores backup status in localStorage
        |
        v
useBackupStatus() re-reads localStorage, UI updates


User navigates to /data-health
        |
        v
DataHealthPage renders skeleton
        |
        v  (three parallel queries)
useTableCounts()     useDiagnosticFlags()     useRulesSyncMeta()
  |                    |                         |
  v                    v                         v
diagnostics.ts       diagnostics.ts            datasheets.ts
(COUNT queries)      (orphan/ambiguous/stale)  (sync meta)
  |                    |                         |
  v                    v                         v
hobbyforge.db        hobbyforge.db +           rules.db
                     rules.db (cross-DB)
```

### Recommended Project Structure

```
src/
  app/
    data-health/
      page.tsx            # DataHealthPage component
  db/
    queries/
      diagnostics.ts      # NEW: getTableCounts, getOrphanedProgress,
                          #       getAmbiguousPoints, getStaleSyncData
  hooks/
    useDiagnostics.ts     # NEW: useTableCounts, useDiagnosticFlags, useBackupStatus
  features/
    data-health/          # NEW: feature module
      VersionInfoSection.tsx
      TableCountsSection.tsx
      DiagnosticsSection.tsx
      BackupSection.tsx
      DiagnosticFlagRow.tsx  # Reusable flag display component
```

### Pattern 1: Rust Command (VACUUM INTO)

**What:** New Tauri command following the exact pattern of `bulk_sync_rules` — direct sqlx connection, not the plugin pool.
**When to use:** When you need to run SQLite pragmas or statements that require a dedicated connection (VACUUM INTO cannot run through the plugin-sql JS bridge because it writes to an external file path).

```rust
// Source: existing bulk_sync_rules in src-tauri/src/lib.rs [VERIFIED: codebase]
#[tauri::command]
async fn backup_database(
    app: tauri::AppHandle,
    destination: String,
) -> Result<(), String> {
    use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions, Connection};
    use std::str::FromStr;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let db_url = format!("sqlite:{}", app_data_dir.join("hobbyforge.db").display());

    let opts = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| format!("opts: {e}"))?
        .create_if_missing(false);

    let mut conn = opts.connect().await.map_err(|e| format!("connect: {e}"))?;

    sqlx::query(&format!("VACUUM INTO '{}'", destination.replace('\'', "''")))
        .execute(&mut conn)
        .await
        .map_err(|e| format!("vacuum: {e}"))?;

    Ok(())
}
```

**Critical:** The destination path must be SQL-escaped (single quotes escaped). VACUUM INTO creates a complete, consistent copy including WAL content — this is the SQLite-recommended backup method. [CITED: sqlite.org/lang_vacuum.html]

### Pattern 2: Independent React Query Hooks

**What:** Multiple useQuery hooks that load independently so the page never blocks.
**When to use:** When a page has multiple data sections that should render progressively.

```typescript
// Source: established pattern in codebase [VERIFIED: useDatasheet.ts, useSyncErrors.ts]
export const TABLE_COUNTS_KEY = ["diagnostics", "table-counts"] as const;
export const DIAGNOSTIC_FLAGS_KEY = ["diagnostics", "flags"] as const;

export function useTableCounts() {
  return useQuery({
    queryKey: TABLE_COUNTS_KEY,
    queryFn: getTableCounts,
    staleTime: 5 * 60 * 1000, // match QueryProvider defaults
  });
}

export function useDiagnosticFlags() {
  return useQuery({
    queryKey: DIAGNOSTIC_FLAGS_KEY,
    queryFn: getDiagnosticFlags,
    staleTime: 5 * 60 * 1000,
  });
}
```

### Pattern 3: Save Dialog with Default Filename

**What:** Tauri save dialog with a suggested filename containing today's date.
**When to use:** For the backup file picker.

```typescript
// Source: @tauri-apps/plugin-dialog type definitions [VERIFIED: node_modules]
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

async function handleBackup() {
  const today = new Date().toISOString().slice(0, 10);
  const destination = await save({
    title: "Save Database Backup",
    defaultPath: `hobbyforge-backup-${today}.db`,
    filters: [{ name: "SQLite Database", extensions: ["db"] }],
  });
  if (!destination) return; // user cancelled

  await invoke("backup_database", { destination });
  // Store in localStorage
  localStorage.setItem("lastBackup", JSON.stringify({
    date: new Date().toISOString(),
    path: destination,
    success: true,
  }));
}
```

### Pattern 4: PRAGMA user_version Query

**What:** Read schema migration version from SQLite.
**When to use:** For displaying schema version on Data Health page.

```typescript
// Source: SQLite PRAGMA documentation [CITED: sqlite.org/pragma.html#pragma_user_version]
import { getDb } from "@/db/client";
import { getRulesDb } from "@/db/rules-client";

export async function getSchemaVersions(): Promise<{
  hobbyforge: number;
  rules: number;
}> {
  const db = await getDb();
  const rulesDb = await getRulesDb();

  const [hfResult] = await db.select<[{ user_version: number }]>(
    "PRAGMA user_version"
  );
  const [rulesResult] = await rulesDb.select<[{ user_version: number }]>(
    "PRAGMA user_version"
  );

  return {
    hobbyforge: hfResult.user_version,
    rules: rulesResult.user_version,
  };
}
```

**Note on PRAGMA user_version:** tauri-plugin-sql manages migrations internally. The `user_version` pragma is set by the plugin after running migrations, so it reflects the current migration version. hobbyforge.db should be at version 28 (28 migrations), rules.db at version 4 (4 migrations). [ASSUMED]

### Pattern 5: Cross-DB Diagnostic Query

**What:** Query both hobbyforge.db and rules.db to detect ambiguous point matches.
**When to use:** For D-09 ambiguous points detection.

```typescript
// Cannot ATTACH in JS bridge — must query each DB separately and compare in JS
import { getDb } from "@/db/client";
import { getRulesDb } from "@/db/rules-client";

export async function getAmbiguousPointMatches(): Promise<DiagnosticFlag[]> {
  const db = await getDb();
  const rulesDb = await getRulesDb();

  // Get all synced unit points
  const syncedUnits = await db.select<{ unit_id: number; unit_name: string }[]>(
    "SELECT sup.unit_id, u.name as unit_name FROM synced_unit_points sup JOIN units u ON u.id = sup.unit_id"
  );

  // Get all datasheet points (rules.db)
  const datasheetPoints = await rulesDb.select<{ datasheet_name: string }[]>(
    "SELECT datasheet_name FROM rw_datasheet_points"
  );

  // Compare in JS to find ambiguous matches
  const pointNames = datasheetPoints.map(r => r.datasheet_name.toLowerCase());
  // ... match logic
}
```

### Anti-Patterns to Avoid
- **Raw file copy for backup:** Never use `std::fs::copy` on a live SQLite database — it can capture a half-written WAL state, producing a corrupt backup. VACUUM INTO is atomic and consistent. [CITED: STATE.md accumulated decisions]
- **VACUUM INTO via JS bridge:** The tauri-plugin-sql JS bridge cannot execute VACUUM INTO because it writes to an external file path outside the plugin's scope. Must use a direct sqlx Rust command. [VERIFIED: STATE.md open blockers]
- **Blocking diagnostic queries:** Do not await all diagnostics before rendering. Use independent useQuery hooks so sections appear progressively.
- **Storing backup status in DB:** Backup metadata describes the file system state, not database state. If the DB is lost, backup status in the DB is also lost — use localStorage instead. [VERIFIED: D-06]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite backup | std::fs::copy or custom page-by-page copy | VACUUM INTO (via sqlx) | Atomic, handles WAL, SQLite-recommended |
| File save dialog | Custom file path input | @tauri-apps/plugin-dialog save() | OS-native dialog, permission-scoped, handles path validation |
| App version | Read tauri.conf.json manually | @tauri-apps/api/app getVersion() | Tauri provides this out of the box |
| Sync freshness | Custom date math | getSyncFreshness() from syncFreshness.ts | Already implemented and tested |
| Sync error count | New query | useRulesSyncErrors() hook | Already provides the data |

## Common Pitfalls

### Pitfall 1: VACUUM INTO Path Escaping
**What goes wrong:** If the user's chosen path contains single quotes or special characters, the SQL statement fails or is vulnerable to injection.
**Why it happens:** VACUUM INTO takes a file path as a string literal in SQL.
**How to avoid:** Use parameterized binding (`sqlx::query("VACUUM INTO ?").bind(&destination)`) or escape single quotes by doubling them. Test with paths containing spaces and special characters.
**Warning signs:** Backup fails silently on paths with quotes/apostrophes.

### Pitfall 2: VACUUM INTO Destination Already Exists
**What goes wrong:** VACUUM INTO fails if the destination file already exists.
**Why it happens:** SQLite VACUUM INTO will not overwrite an existing file — it returns an error.
**How to avoid:** Either (a) check for file existence and delete first, or (b) let the save dialog handle uniqueness, or (c) catch the error and show a user-friendly message. The save dialog on Windows already prompts for overwrite confirmation, so the most robust approach is to delete the existing file before running VACUUM INTO if the user confirmed overwrite.
**Warning signs:** "VACUUM INTO failed: output file already exists" error.

### Pitfall 3: Cross-DB Query Limitations
**What goes wrong:** Attempting to JOIN hobbyforge.db and rules.db tables in a single SQL query.
**Why it happens:** tauri-plugin-sql maintains separate connection pools; ATTACH DATABASE is not available through the JS bridge.
**How to avoid:** Query each database separately and perform the join/comparison in JavaScript. For D-09 ambiguous points, fetch unit names from hobbyforge.db and datasheet_name entries from rules.db, then compare in TypeScript.
**Warning signs:** SQL errors about unknown tables.

### Pitfall 4: PRAGMA user_version Column Name
**What goes wrong:** The result column from `PRAGMA user_version` may not be named consistently across SQLite versions and drivers.
**Why it happens:** PRAGMA results are implementation-defined.
**How to avoid:** Log the actual result shape during development. The column is typically named `user_version` but verify with tauri-plugin-sql's select() method.
**Warning signs:** `undefined` values when reading schema version.

### Pitfall 5: localStorage Not Available in Tests
**What goes wrong:** useBackupStatus() fails in Vitest jsdom environment.
**Why it happens:** jsdom provides a basic localStorage mock, but tests may need to seed it.
**How to avoid:** The jsdom environment does provide localStorage, so this should work. Just ensure tests set up localStorage values before assertions. If mocking is needed, use `vi.stubGlobal('localStorage', ...)`.
**Warning signs:** Tests passing locally but returning null for backup status.

## Code Examples

### Diagnostic Query Module Structure

```typescript
// Source: established pattern in src/db/queries/ [VERIFIED: codebase]
// File: src/db/queries/diagnostics.ts
import { getDb } from "@/db/client";
import { getRulesDb } from "@/db/rules-client";

export interface TableCounts {
  units: number;
  painting_recipes: number;
  unit_recipe_assignments: number;
  unit_recipe_step_progress: number;
  synced_unit_points: number;
}

export interface DiagnosticFlag {
  type: string;
  count: number;
  description: string;
  severity: "warning" | "info";
}

export async function getTableCounts(): Promise<TableCounts> {
  const db = await getDb();
  // Individual COUNT queries — simple and fast
  const [units] = await db.select<[{ c: number }]>("SELECT COUNT(*) as c FROM units");
  const [recipes] = await db.select<[{ c: number }]>("SELECT COUNT(*) as c FROM painting_recipes");
  const [assignments] = await db.select<[{ c: number }]>("SELECT COUNT(*) as c FROM unit_recipe_assignments");
  const [progress] = await db.select<[{ c: number }]>("SELECT COUNT(*) as c FROM unit_recipe_step_progress");
  const [points] = await db.select<[{ c: number }]>("SELECT COUNT(*) as c FROM synced_unit_points");

  return {
    units: units.c,
    painting_recipes: recipes.c,
    unit_recipe_assignments: assignments.c,
    unit_recipe_step_progress: progress.c,
    synced_unit_points: points.c,
  };
}

export async function getOrphanedProgressRows(): Promise<DiagnosticFlag | null> {
  const db = await getDb();
  const [result] = await db.select<[{ c: number }]>(
    `SELECT COUNT(*) as c FROM unit_recipe_step_progress p
     LEFT JOIN recipe_steps rs ON rs.id = p.recipe_step_id
     WHERE rs.id IS NULL`
  );
  if (result.c === 0) return null;
  return {
    type: "orphaned_progress",
    count: result.c,
    description: `${result.c} orphaned progress row${result.c > 1 ? "s" : ""} -- these track completion for recipe steps that no longer exist`,
    severity: "warning",
  };
}
```

### Route Registration

```typescript
// Source: existing router.tsx pattern [VERIFIED: codebase]
import { DataHealthPage } from "./data-health/page";

const dataHealthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data-health",
  component: DataHealthPage,
});

// Add to routeTree children
```

### Sidebar Navigation Entry

```typescript
// Source: existing AppSidebar.tsx pattern [VERIFIED: codebase]
import { HeartPulse } from "lucide-react";

const MANAGEMENT_NAV = [
  { to: "/factions", label: "Factions", icon: Shield },
  { to: "/spending", label: "Spending", icon: Wallet },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/data-health", label: "Data Health", icon: HeartPulse },
] as const;
```

### Invoke Handler Registration

```rust
// Source: existing lib.rs pattern [VERIFIED: codebase]
.invoke_handler(tauri::generate_handler![bulk_sync_rules, backup_database])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.backup()` API (C API) | VACUUM INTO | SQLite 3.27.0 (2019) | Single SQL statement, no external tooling needed |
| std::fs::copy on DB file | VACUUM INTO | Always preferred | Raw copy is unsafe with WAL mode |
| Blocking data load | Independent React Query hooks | TanStack Query v4+ | Progressive rendering, no waterfall |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PRAGMA user_version reflects migration count (28 for hobbyforge, 4 for rules) | Pattern 4 | LOW -- display shows wrong number, but tauri-plugin-sql migration system may use a different version tracking mechanism. Verify at runtime. |
| A2 | VACUUM INTO supports parameterized binding via sqlx | Pitfall 1 | MEDIUM -- if sqlx does not support binding for VACUUM INTO, must use escaped string interpolation. Test during implementation. |
| A3 | tauri-plugin-dialog save() on Windows prompts for overwrite confirmation | Pitfall 2 | LOW -- if not, file existence check needed before VACUUM INTO |

## Open Questions

1. **VACUUM INTO parameterized binding**
   - What we know: VACUUM INTO takes a filename literal. Standard sqlx `?` binding works for VALUES but may not work for VACUUM INTO's filename argument.
   - What's unclear: Whether `sqlx::query("VACUUM INTO ?").bind(&path)` works, or if string interpolation is required.
   - Recommendation: Test during implementation. If binding fails, use escaped string interpolation with single-quote doubling. The CONTEXT.md already anticipates this might need a spike.

2. **PRAGMA user_version vs tauri-plugin-sql migration tracking**
   - What we know: tauri-plugin-sql runs migrations in order. SQLite's `PRAGMA user_version` is commonly used by migration tools.
   - What's unclear: Whether tauri-plugin-sql sets `user_version` or uses its own internal tracking table.
   - Recommendation: Check by running `PRAGMA user_version` in dev. If it returns 0, look for a `_sqlx_migrations` or similar table instead.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 (jsdom) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/data-health/` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DX-01 | Version info section renders app version, schema versions, sync date, error count | unit | `pnpm test -- tests/data-health/VersionInfoSection.test.tsx -x` | Wave 0 |
| DX-02 | Table counts section renders correct counts | unit | `pnpm test -- tests/data-health/TableCountsSection.test.tsx -x` | Wave 0 |
| DX-03 | Diagnostic flags detect orphans, ambiguous, stale | unit | `pnpm test -- tests/data-health/diagnosticQueries.test.ts -x` | Wave 0 |
| DX-04 | Page renders immediately with loading states | unit | `pnpm test -- tests/data-health/DataHealthPage.test.tsx -x` | Wave 0 |
| BK-01 | Backup button triggers save dialog + invoke | unit | `pnpm test -- tests/data-health/BackupSection.test.tsx -x` | Wave 0 |
| BK-02 | VACUUM INTO command (Rust) | manual-only | Requires Tauri runtime -- cannot test in jsdom | N/A |
| BK-03 | Backup status reads from localStorage | unit | `pnpm test -- tests/data-health/useBackupStatus.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/data-health/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/data-health/diagnosticQueries.test.ts` -- covers DX-02, DX-03 (query logic)
- [ ] `tests/data-health/DataHealthPage.test.tsx` -- covers DX-04 (async loading)
- [ ] `tests/data-health/BackupSection.test.tsx` -- covers BK-01, BK-03
- [ ] `tests/data-health/VersionInfoSection.test.tsx` -- covers DX-01

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A -- local desktop app |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A -- single user |
| V5 Input Validation | yes | File path from save dialog is OS-validated; SQL uses parameterized queries |
| V6 Cryptography | no | No encryption in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection in VACUUM INTO path | Tampering | Parameterized binding or single-quote escaping |
| Path traversal in backup destination | Tampering | OS save dialog constrains path; Tauri fs scope limits access |

## Sources

### Primary (HIGH confidence)
- Codebase inspection: lib.rs (bulk_sync_rules pattern), client.ts, rules-client.ts, router.tsx, AppSidebar.tsx
- @tauri-apps/plugin-dialog type definitions (save dialog API, SaveDialogOptions)
- @tauri-apps/api/app type definitions (getVersion() API)
- Cargo.toml (sqlx 0.8, all Tauri plugin versions)
- package.json (all frontend dependency versions)

### Secondary (MEDIUM confidence)
- SQLite VACUUM INTO documentation [CITED: sqlite.org/lang_vacuum.html]
- SQLite PRAGMA user_version documentation [CITED: sqlite.org/pragma.html]

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies already installed, no new packages
- Architecture: HIGH -- follows established codebase patterns exactly (27 prior phases)
- Pitfalls: HIGH -- VACUUM INTO semantics well-documented; cross-DB limitation verified in codebase

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (stable -- no fast-moving dependencies)

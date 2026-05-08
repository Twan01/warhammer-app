# Phase 44: Sync Pipeline Hardening - Research

**Researched:** 2026-05-08
**Domain:** Tauri 2 / Rust (sqlx 0.8) return types, TypeScript CSV validation, React Query cache invalidation, SQLite migration patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Post-sync confirmation UX**
- Replace the current bare `toast.success("Datasheets synced")` with a success toast that includes a summary line of per-table row counts (e.g. "Synced: 847 datasheets, 312 stratagems, 1204 abilities")
- Counts come from Rust (actual INSERT counts), not TypeScript array lengths
- Keep it as a toast — no dialog or inline display; non-disruptive to the user's flow
- On error, show `toast.error` with the error message from the persistent log

**CSV column validation**
- Validate required column headers BEFORE sending data to Rust — fail the entire sync if any CSV is malformed
- Required headers defined per CSV file type (e.g. Factions.csv requires "id" and "name")
- Validation runs after `parseWahapediaCsv` returns rows — check that header keys match expected set
- On validation failure: throw with a descriptive message naming the CSV file and missing columns
- All-or-nothing: if one CSV fails validation, no data is sent to Rust — matches the existing single-transaction model

**Error logging**
- New `sync_errors` table in hobbyforge.db (NOT rules.db — must survive re-syncs)
- Log sync failures only: fetch errors, parse errors, CSV validation errors, Rust transaction errors
- Schema: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `occurred_at TEXT NOT NULL`, `error_type TEXT NOT NULL` (one of: "fetch_failed", "parse_error", "validation_error", "sync_error"), `message TEXT NOT NULL`, `csv_file TEXT` (which file failed, null for global errors)
- Successful syncs are already tracked in `rw_sync_meta` — no need to duplicate success records in the error table
- Error history persists across app restarts and re-syncs
- Write to error table in the `onError` path of the mutation, using hobbyforge.db (main DB client)

**Rust return type change**
- Change `bulk_sync_rules` return from `Result<(), String>` to `Result<SyncResult, String>` where `SyncResult` is a struct with per-table row counts
- Count actual rows inserted (not rows attempted) — use the sqlx execute result's `rows_affected()` for each INSERT loop
- Include all 11 data tables in the counts: factions, sources, datasheets, models, abilities, keywords, wargear, shared_abilities, stratagems, detachments, detachment_abilities
- TypeScript receives counts via the Tauri IPC bridge and uses them directly (replaces the current client-side array length approximations)

**Cache invalidation contract**
- Add prefix-match invalidation (`exact: false`) for all Phase 43 query keys in `useRulesSync.onSuccess`:
  - `["stratagems-by-faction"]`
  - `["detachments-by-faction"]`
  - `["detachment-abilities"]`
  - `["shared-abilities-by-faction"]`
- Keep existing invalidations: `RULES_SYNC_META_KEY`, `["datasheets-by-faction"]`, `["datasheet"]`
- If Phase 43 hooks don't exist yet at implementation time, add the invalidation keys anyway — React Query silently skips keys with no active queries

### Claude's Discretion
- Exact TypeScript validation helper structure (one function per CSV or a map-based approach)
- Whether to add the `rowCounts` missing entries (`shared_abilities`, `detachment_abilities`) now or replace the entire client-side counting with Rust counts
- Migration file number for the `sync_errors` table in hobbyforge.db
- Exact Rust `SyncResult` struct field naming
- Toast message formatting (exact wording, whether to abbreviate table names)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYNC-01 | Rust `bulk_sync_rules` returns per-table row counts after each sync | `rows_affected()` on each sqlx execute call accumulates counts into a `SyncResult` struct; struct serialized via `serde::Serialize` through Tauri IPC |
| SYNC-02 | `useRulesSync` displays per-table row counts in the post-sync confirmation | `mutationFn` receives Rust counts from `invoke()` return value; formats them in the `onSuccess` toast call in `PlaybookTab.tsx` |
| SYNC-03 | CSV column header validation rejects malformed CSVs before insertion | Pure TypeScript — check `Object.keys(rows[0])` against required-column sets before the `invoke("bulk_sync_rules")` call; throw named error on mismatch |
| SYNC-04 | Sync errors are logged to a persistent table with timestamp, error type, and message | New `015_sync_errors.sql` migration for hobbyforge.db; new `src/db/queries/syncErrors.ts` query module; write in `onError` path of `useRulesSync` mutation |
| SYNC-05 | All new rules query hooks are invalidated on sync success (cache invalidation contract) | Add 4 `qc.invalidateQueries` calls with `exact: false` prefix-matching in `useRulesSync.onSuccess` |
</phase_requirements>

---

## Summary

Phase 44 hardens the existing sync pipeline across five tightly-coupled changes: Rust return type extension, TypeScript CSV validation, error persistence, accurate count display, and cache invalidation completeness. All five requirements are achievable with minimal risk — the code paths are already established and the changes are isolated.

The highest-complexity change is SYNC-01: adding `rows_affected()` accumulation per INSERT loop in Rust and surfacing that through the Tauri IPC bridge. This is straightforward but requires care in sqlx 0.8 — `execute()` returns `SqliteQueryResult` and `.rows_affected()` gives a `u64`. SYNC-04 (error persistence) introduces the one net-new infrastructure piece: a new migration and a new query module, both following existing project patterns exactly.

The remaining three requirements (SYNC-02, SYNC-03, SYNC-05) are pure TypeScript mutations to existing files.

**Primary recommendation:** Implement in dependency order — SYNC-01 (Rust return type) first, then SYNC-03 (validation) and SYNC-04 (error table) as parallel wave, then SYNC-02 (toast) and SYNC-05 (invalidation) which depend on the prior work.

---

## Standard Stack

All dependencies are already installed. No new packages required.

### Core (Already in Use)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sqlx | 0.8 | Rust async SQLite — `execute()` + `rows_affected()` for INSERT counts | Already used in `bulk_sync_rules` for all INSERT loops |
| serde / serde_json | 1 | Serialize `SyncResult` struct over Tauri IPC | Already used for `BulkSyncPayload` deserialization |
| @tanstack/react-query | ^5.100.6 | Cache invalidation via `queryClient.invalidateQueries` | Project standard for all server state |
| @tauri-apps/plugin-sql | ^2.4.0 | `getDb()` write path for `sync_errors` table | Already used in `hobbyforge.db` queries |
| sonner | ^2.0.7 | `toast.success()` / `toast.error()` for post-sync feedback | Already used in `PlaybookTab.tsx` `handleSyncClick` |
| vitest | ^4.1.5 | Test framework | Project standard |

### No New Dependencies

This phase requires zero new npm or Cargo packages. All tools are already present.

---

## Architecture Patterns

### Recommended File Layout

```
src-tauri/
  src/lib.rs               # MODIFY: SyncResult struct + bulk_sync_rules return type
  migrations/
    015_sync_errors.sql    # NEW: sync_errors table in hobbyforge.db

src/
  db/
    queries/
      syncErrors.ts        # NEW: insertSyncError() + getSyncErrors() functions
  hooks/
    useRulesSync.ts        # MODIFY: validation, counts from Rust, onSuccess invalidation, onError logging
  lib/
    validateCsvHeaders.ts  # NEW (or inline): CSV header validation logic
  features/
    units/
      PlaybookTab.tsx      # MODIFY: handleSyncClick toast message includes row counts

tests/
  datasheet/
    validateCsvHeaders.test.ts   # NEW: pure unit tests for validation logic
    syncErrorQueries.test.ts     # NEW: unit tests for syncErrors query module
```

### Pattern 1: Rust `SyncResult` Struct via Tauri IPC

**What:** Add `#[derive(serde::Serialize)]` to a new `SyncResult` struct with one `u64` field per synced table. Change `bulk_sync_rules` return from `Result<(), String>` to `Result<SyncResult, String>`.

**When to use:** Anytime Rust needs to return structured data to TypeScript through Tauri IPC.

**Accumulation pattern:**
```rust
// Source: sqlx 0.8 docs — SqliteQueryResult::rows_affected() returns u64
#[derive(serde::Serialize)]
pub struct SyncResult {
    factions: u64,
    sources: u64,
    datasheets: u64,
    models: u64,
    abilities: u64,      // rw_datasheet_abilities
    keywords: u64,
    wargear: u64,
    shared_abilities: u64,
    stratagems: u64,
    detachments: u64,
    detachment_abilities: u64,
}

// Inside each INSERT loop — accumulate instead of individual counters:
let mut counts = SyncResult { factions: 0, ... };
for row in &payload.factions {
    let res = sqlx::query("INSERT INTO rw_factions ...")
        .bind(...)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert faction: {e}"))?;
    counts.factions += res.rows_affected();
}
// ... repeat per table
tx.commit().await.map_err(|e| format!("commit: {e}"))?;
Ok(counts)
```

**TypeScript receives counts:** `invoke<SyncResult>("bulk_sync_rules", { payload })` — the generic type parameter makes the return typed.

### Pattern 2: CSV Header Validation (TypeScript)

**What:** After `parseWahapediaCsv()` returns rows, check that every required column name appears as a key in `rows[0]`. Throw with the filename and missing column names if validation fails.

**Recommended approach:** A map-based validation function — single function with a `Record<filename, string[]>` required-headers map. Avoids 11 separate functions.

```typescript
// Source: project convention — pure function in src/lib/
const REQUIRED_HEADERS: Record<string, string[]> = {
  "Factions.csv":              ["id", "name"],
  "Source.csv":                ["id", "name"],
  "Datasheets.csv":            ["id", "name", "faction_id"],
  "Datasheets_models.csv":     ["datasheet_id", "line"],
  "Datasheets_abilities.csv":  ["datasheet_id", "line", "name"],
  "Datasheets_keywords.csv":   ["datasheet_id", "keyword"],
  "Datasheets_wargear.csv":    ["datasheet_id", "line", "name"],
  "Abilities.csv":             ["id", "name"],
  "Stratagems.csv":            ["id", "name"],
  "Detachments.csv":           ["id", "name"],
  "Detachment_abilities.csv":  ["id", "name"],
};

export function validateCsvHeaders(
  filename: string,
  rows: Record<string, string>[]
): void {
  const required = REQUIRED_HEADERS[filename];
  if (!required) return; // Last_update.csv has no validation requirement
  if (rows.length === 0) {
    throw new Error(`${filename}: CSV is empty or header-only`);
  }
  const present = new Set(Object.keys(rows[0]));
  const missing = required.filter((h) => !present.has(h));
  if (missing.length > 0) {
    throw new Error(
      `${filename}: missing required columns: ${missing.join(", ")}`
    );
  }
}
```

**Placement in `useRulesSync.mutationFn`:** Call immediately after each `parseWahapediaCsv()` call, before the HTML-strip map. Since all parses happen before `invoke()`, any validation failure aborts the entire sync before a single row reaches Rust.

### Pattern 3: `sync_errors` Migration (hobbyforge.db)

**What:** New SQL migration file for hobbyforge.db. Next available number is `015`.

**Critical constraint:** MUST be in hobbyforge.db, not rules.db. rules.db is fully DELETEd on every sync — error history would be lost. Confirmed in ARCHITECTURE-AUDIT.md Section 4.

```sql
-- 015_sync_errors.sql
CREATE TABLE IF NOT EXISTS sync_errors (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at  TEXT NOT NULL,
    error_type   TEXT NOT NULL,  -- "fetch_failed" | "parse_error" | "validation_error" | "sync_error"
    message      TEXT NOT NULL,
    csv_file     TEXT            -- which CSV triggered the error, NULL for global errors
);
```

**Registration:** Add as `version: 15` in `get_migrations()` in `src-tauri/src/lib.rs`.

### Pattern 4: `syncErrors.ts` Query Module

**What:** New query file in `src/db/queries/` following exact project pattern — parameterized queries with `$1, $2` syntax, uses `getDb()` from `src/db/client.ts`.

```typescript
// src/db/queries/syncErrors.ts
import { getDb } from "@/db/client";

export interface SyncError {
  id: number;
  occurred_at: string;
  error_type: string;
  message: string;
  csv_file: string | null;
}

export interface InsertSyncErrorInput {
  occurred_at: string;
  error_type: "fetch_failed" | "parse_error" | "validation_error" | "sync_error";
  message: string;
  csv_file?: string | null;
}

export async function insertSyncError(input: InsertSyncErrorInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO sync_errors (occurred_at, error_type, message, csv_file) VALUES ($1, $2, $3, $4)",
    [input.occurred_at, input.error_type, input.message, input.csv_file ?? null]
  );
}

export async function getSyncErrors(): Promise<SyncError[]> {
  const db = await getDb();
  return db.select<SyncError[]>(
    "SELECT * FROM sync_errors ORDER BY occurred_at DESC"
  );
}
```

### Pattern 5: Cache Invalidation with `exact: false`

**What:** Prefix-match invalidation causes React Query to invalidate ALL queries whose key starts with the given prefix, regardless of additional segments (e.g. the `factionId` parameter).

**Why `exact: false` is required:** The Phase 43 hooks use parameterized keys like `["stratagems-by-faction", "SM"]`. Invalidating with `exact: true` on `["stratagems-by-faction"]` would miss all faction-specific cached entries.

```typescript
// Source: TanStack Query v5 docs — queryClient.invalidateQueries({ queryKey, exact })
onSuccess: () => {
  qc.invalidateQueries({ queryKey: RULES_SYNC_META_KEY });
  qc.invalidateQueries({ queryKey: ["datasheets-by-faction"], exact: false });
  qc.invalidateQueries({ queryKey: ["datasheet"], exact: false });
  // Phase 44 additions:
  qc.invalidateQueries({ queryKey: ["stratagems-by-faction"], exact: false });
  qc.invalidateQueries({ queryKey: ["detachments-by-faction"], exact: false });
  qc.invalidateQueries({ queryKey: ["detachment-abilities"], exact: false });
  qc.invalidateQueries({ queryKey: ["shared-abilities-by-faction"], exact: false });
},
```

**Note:** The existing `["datasheet"]` and `["datasheets-by-faction"]` invalidations in `useRulesSync.onSuccess` currently do NOT specify `exact: false`. They should be confirmed to behave correctly — in TanStack Query v5, the default is `exact: false` when passing an array key, so the existing calls are already prefix-matching. Adding `exact: false` explicitly is clarifying but not a behavioral change.

### Pattern 6: `onError` Error Logging in Mutation

**What:** The `useRulesSync` mutation's `onError` callback calls `insertSyncError()` to write the failure to hobbyforge.db. The error type is inferred from the error message (since all thrown errors include context strings like "Failed to fetch", "missing required columns", etc.).

```typescript
onError: async (err: Error) => {
  const message = err.message ?? "Unknown sync error";
  let error_type: InsertSyncErrorInput["error_type"] = "sync_error";
  if (message.includes("Failed to fetch") || message.includes("HTTP")) {
    error_type = "fetch_failed";
  } else if (message.includes("missing required columns") || message.includes("CSV is empty")) {
    error_type = "validation_error";
  }
  // csv_file extraction: validation errors include the filename in the message
  const csvFileMatch = message.match(/^([A-Za-z_]+\.csv):/);
  await insertSyncError({
    occurred_at: new Date().toISOString(),
    error_type,
    message,
    csv_file: csvFileMatch?.[1] ?? null,
  });
},
```

**Note:** `onError` in `useMutation` is synchronous by contract in React Query — but calling an async function inside it is safe (fire-and-forget). The toast is shown regardless; the DB write is a side effect. Phase 45 (META-04) will add a UI to display error history, but the write path is needed now.

### Pattern 7: `handleSyncClick` Toast Update

**What:** `PlaybookTab.tsx` `handleSyncClick` currently receives no data from the mutation's `onSuccess` callback because `mutate` was called with an inline `onSuccess: () => toast.success(...)`. The mutation returns `{ wahapediaVersion, rowCounts }`. The inline callback must be updated to receive the data.

**Current code (lines 403–411):**
```typescript
function handleSyncClick() {
  rulesSync.mutate(undefined, {
    onSuccess: () => toast.success("Datasheets synced"),
    onError: (err) => {
      console.error("[useRulesSync] sync failed:", err);
      toast.error("Sync failed — check your connection and try again");
    },
  });
}
```

**Updated pattern:**
```typescript
function handleSyncClick() {
  rulesSync.mutate(undefined, {
    onSuccess: (data) => {
      const { rowCounts } = data;
      const summary = [
        `${rowCounts.datasheets} datasheets`,
        `${rowCounts.stratagems} stratagems`,
        `${rowCounts.abilities} abilities`,
      ].join(", ");
      toast.success(`Synced: ${summary}`);
    },
    onError: (err) => {
      console.error("[useRulesSync] sync failed:", err);
      toast.error(`Sync failed: ${err.message}`);
    },
  });
}
```

The exact summary format (which tables, abbreviations) is Claude's discretion per CONTEXT.md.

### Anti-Patterns to Avoid

- **Client-side `rows_affected` approximation:** Using `.length` on the TypeScript arrays before the Rust call counts rows sent, not rows inserted. `INSERT OR IGNORE` can silently skip duplicates — `rows_affected()` is the only accurate source. Do NOT keep the current client-side count fallback after SYNC-01 is implemented.
- **Writing `sync_errors` to rules.db:** rules.db is fully DELETEd on every sync transaction. Errors written there are lost on the next sync. Always use `getDb()` (hobbyforge.db) for error persistence.
- **Throwing inside the HTML-strip map:** Validation must run before HTML stripping, not after. The validation error should cause an early return before any data transformation occurs.
- **Using `exact: true` for Phase 43 query key invalidation:** Parameterized keys (`["stratagems-by-faction", "SM"]`) won't be matched by an exact `["stratagems-by-faction"]` lookup.
- **Nesting onError async without handling rejection:** The `insertSyncError` call in `onError` is fire-and-forget. Do not `await` it in a way that causes the mutation to appear pending — a silent `catch` is acceptable since the toast feedback is the primary user signal.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Row insert counting | Manual counter accumulation in TS | `rows_affected()` on sqlx `SqliteQueryResult` | Only the DB knows which `INSERT OR IGNORE` rows were actually written vs. skipped |
| Error persistence format | Custom file-based logging | SQLite `sync_errors` table via existing `getDb()` | Consistent with project pattern; survives app restarts; queryable for Phase 45 display |
| CSV structural parsing | Custom column detection | Extend existing `parseWahapediaCsv()` output | Parser already normalizes headers from line 0; validation only needs to inspect `rows[0]` keys |
| IPC serialization | Manual JSON encoding of counts | `#[derive(serde::Serialize)]` on `SyncResult` | Tauri IPC handles Rust→TS serialization transparently |

---

## Common Pitfalls

### Pitfall 1: `rows_affected()` for Non-INSERT Statements

**What goes wrong:** Calling `rows_affected()` on DELETE statements during the table-clear pass returns row counts for deleted rows, not inserted rows. Accumulating those counts into the result struct would produce inflated/wrong numbers.

**How to avoid:** Only accumulate `rows_affected()` in the INSERT loops. The DELETE loop is a pre-existing pattern; do not touch it.

### Pitfall 2: Migration Version Collision

**What goes wrong:** The next hobbyforge.db migration is `015_sync_errors.sql` with `version: 15`. The rules.db migrations are numbered separately (rules_001, rules_002) and registered in `get_rules_migrations()`. These are two separate migration series. Do NOT register a hobbyforge.db migration in `get_rules_migrations()` or vice versa.

**How to avoid:** `015_sync_errors.sql` goes in `src-tauri/migrations/` (same directory as all other migrations), registered with `version: 15` in `get_migrations()` (the hobbyforge.db series).

**Verified state:** Current highest hobbyforge.db migration is `014_session_recipe_link.sql`. Next is `015`. No gap.

### Pitfall 3: `mutationFn` Return Type Must Match Mutation Generic

**What goes wrong:** `useRulesSync` is typed as `useMutation<{ wahapediaVersion: string; rowCounts: Record<string, number> }, Error, void>`. After SYNC-01, Rust returns `SyncResult` with `u64` fields, but the TypeScript interface uses `number`. Tauri IPC serializes Rust `u64` as JSON numbers — TypeScript `number` accommodates this (no overflow risk for row counts).

**How to avoid:** Keep the TypeScript type as `number` for all row count fields. The `u64 → JSON number → number` conversion is safe for realistic dataset sizes. Do NOT use `bigint` — sonner toast formatting with `bigint` produces `"847n"` output.

### Pitfall 4: Validation on Empty CSV (Zero Rows)

**What goes wrong:** `parseWahapediaCsv()` returns `[]` for a CSV with only a header line. Checking `rows[0]` on an empty array throws `TypeError: Cannot read property 'id' of undefined`.

**How to avoid:** The validation function must check `rows.length === 0` before accessing `rows[0]`. An empty (header-only) CSV should be treated as a validation error: "CSV is empty or header-only".

### Pitfall 5: `handleSyncClick` Inline vs. Hook-Level `onError`

**What goes wrong:** `insertSyncError` is called in `onError`. But `handleSyncClick` passes its own inline `onError` to `rulesSync.mutate(...)`. In TanStack Query v5, BOTH the mutation-level `onError` (defined in `useMutation`) AND the per-call `onError` (passed to `.mutate()`) fire. If error logging is only in the per-call `onError` in `PlaybookTab`, it won't fire when the sync is triggered from other components.

**How to avoid:** Put `insertSyncError` in the `useMutation`-level `onError` inside `useRulesSync.ts`. The `PlaybookTab` inline `onError` handles only UI feedback (toast). This ensures error logging happens regardless of call site.

### Pitfall 6: `rw_datasheet_keywords` Intra-Sync Duplicates

**What goes wrong:** The ARCHITECTURE-AUDIT.md (Section 1) flags that `rw_datasheet_keywords` has no UNIQUE constraint and uses plain `INSERT` (not `INSERT OR IGNORE`). If Wahapedia's CSV contains duplicate `(datasheet_id, keyword)` rows, both are inserted. `rows_affected()` would count both, inflating the keywords count.

**How to avoid:** SYNC-03 CSV validation should check for duplicate `(datasheet_id, keyword)` pairs in the keywords CSV, or the Rust INSERT for keywords should be changed to `INSERT OR IGNORE`. The CONTEXT.md notes this concern. The simplest fix is changing the Rust keywords INSERT to `INSERT OR IGNORE` (matching all other tables) — no schema change required.

---

## Code Examples

### SyncResult Struct and Return Type Change

```rust
// Source: direct code inspection of src-tauri/src/lib.rs + sqlx 0.8 docs
#[derive(serde::Serialize)]
pub struct SyncResult {
    pub factions: u64,
    pub sources: u64,
    pub datasheets: u64,
    pub models: u64,
    pub abilities: u64,
    pub keywords: u64,
    pub wargear: u64,
    pub shared_abilities: u64,
    pub stratagems: u64,
    pub detachments: u64,
    pub detachment_abilities: u64,
}

#[tauri::command]
async fn bulk_sync_rules(
    app: tauri::AppHandle,
    payload: BulkSyncPayload,
) -> Result<SyncResult, String> {
    // ...existing setup...
    let mut counts = SyncResult { factions: 0, sources: 0, datasheets: 0, models: 0,
        abilities: 0, keywords: 0, wargear: 0, shared_abilities: 0,
        stratagems: 0, detachments: 0, detachment_abilities: 0 };

    for row in &payload.factions {
        let res = sqlx::query("INSERT INTO rw_factions (id, name) VALUES (?, ?)")
            .bind(/* ... */).execute(&mut *tx).await
            .map_err(|e| format!("insert faction: {e}"))?;
        counts.factions += res.rows_affected();
    }
    // repeat per table...
    tx.commit().await.map_err(|e| format!("commit: {e}"))?;
    Ok(counts)
}
```

### TypeScript: Reading Counts from Rust IPC

```typescript
// Source: useRulesSync.ts — mutationFn updated pattern
interface RustSyncResult {
  factions: number;
  sources: number;
  datasheets: number;
  models: number;
  abilities: number;
  keywords: number;
  wargear: number;
  shared_abilities: number;
  stratagems: number;
  detachments: number;
  detachment_abilities: number;
}

const rustResult = await invoke<RustSyncResult>("bulk_sync_rules", { payload: { ... } });

return {
  wahapediaVersion,
  rowCounts: {
    factions: rustResult.factions,
    datasheets: rustResult.datasheets,
    models: rustResult.models,
    abilities: rustResult.abilities,
    keywords: rustResult.keywords,
    wargear: rustResult.wargear,
    shared_abilities: rustResult.shared_abilities,
    stratagems: rustResult.stratagems,
    detachments: rustResult.detachments,
    detachment_abilities: rustResult.detachment_abilities,
  },
};
```

### Migration SQL (015_sync_errors.sql)

```sql
-- Source: project migration pattern, see 014_session_recipe_link.sql structure
CREATE TABLE IF NOT EXISTS sync_errors (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at  TEXT NOT NULL,
    error_type   TEXT NOT NULL CHECK (error_type IN ('fetch_failed', 'parse_error', 'validation_error', 'sync_error')),
    message      TEXT NOT NULL,
    csv_file     TEXT
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Result<(), String>` return from `bulk_sync_rules` | `Result<SyncResult, String>` with per-table counts | Phase 44 | TypeScript gets authoritative INSERT counts, not approximations |
| Client-side `array.length` for row counts | Rust `rows_affected()` per INSERT loop | Phase 44 | `INSERT OR IGNORE` skips are now accurately excluded from counts |
| No CSV validation | Header-presence check before `invoke()` | Phase 44 | Malformed Wahapedia CSVs fail fast with a clear error before any DB write |
| No persistent error log | `sync_errors` table in hobbyforge.db | Phase 44 | Error history survives app restarts; queryable by Phase 45 for display |
| 3 query keys invalidated on sync | 7 query keys invalidated | Phase 44 | Phase 43 hooks for stratagems/detachments/abilities see fresh data after sync |

---

## Open Questions

1. **Keywords CSV duplicate check**
   - What we know: `rw_datasheet_keywords` has no UNIQUE constraint; Rust uses plain INSERT (not INSERT OR IGNORE); Wahapedia CSV may contain duplicate rows
   - What's unclear: Whether Wahapedia's actual CSV data contains duplicate keyword rows in practice
   - Recommendation: Change the Rust `rw_datasheet_keywords` INSERT to `INSERT OR IGNORE` as a safe default (matches all other tables); no schema change required. Optionally add a pre-validation dedup check in TypeScript, but the Rust change is sufficient.

2. **Phase 43 hook existence at implementation time**
   - What we know: Phase 43 (SCHEMA-01 to SCHEMA-05) runs before Phase 44; it creates hooks for `stratagems-by-faction`, `detachments-by-faction`, `detachment-abilities`, `shared-abilities-by-faction`
   - What's unclear: Whether Phase 43 will be complete before Phase 44 implementation begins
   - Recommendation: CONTEXT.md explicitly states "add the invalidation keys anyway — React Query silently skips keys with no active queries." No blocker.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test -- tests/datasheet/` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNC-01 | `bulk_sync_rules` returns per-table counts (Rust) | manual / integration | `pnpm tauri dev` then trigger sync | N/A — Rust |
| SYNC-02 | Post-sync toast shows row counts from Rust data | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | Wave 0 |
| SYNC-03 | `validateCsvHeaders` throws on missing required columns | unit | `pnpm test -- tests/datasheet/validateCsvHeaders.test.ts` | Wave 0 |
| SYNC-04 | `insertSyncError` writes a row to `sync_errors` via `getDb()` mock | unit | `pnpm test -- tests/datasheet/syncErrorQueries.test.ts` | Wave 0 |
| SYNC-05 | `useRulesSync.onSuccess` calls `invalidateQueries` for all 7 keys | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/datasheet/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/datasheet/validateCsvHeaders.test.ts` — covers SYNC-03 (pure function, no mocks needed)
- [ ] `tests/datasheet/syncErrorQueries.test.ts` — covers SYNC-04 (mock `getDb()`, follow `datasheetQueries.test.ts` pattern)
- [ ] `tests/datasheet/useRulesSync.test.ts` — covers SYNC-02 and SYNC-05 (mock `invoke`, mock `queryClient.invalidateQueries`, assert toast call and invalidation calls)

SYNC-01 is Rust-only and cannot be unit-tested in the jsdom/Vitest environment. Manual verification via `pnpm tauri dev` is the correct approach.

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection of `src-tauri/src/lib.rs` (lines 1–437) — full Rust command, BulkSyncPayload, INSERT loop pattern
- Direct code inspection of `src/hooks/useRulesSync.ts` — mutation structure, existing return type, existing invalidation list
- Direct code inspection of `src/features/units/PlaybookTab.tsx` (lines 403–411) — `handleSyncClick` exact code
- Direct code inspection of `src/db/client.ts` and `src/db/rules-client.ts` — `getDb()` / `getRulesDb()` singletons
- Direct code inspection of `src/lib/parseWahapediaCsv.ts` — parser return structure (keys come from line 0)
- `.planning/phases/42-architecture-audit/ARCHITECTURE-AUDIT.md` — gap catalog (SYNC-01 through SYNC-05), migration proposal, critical constraint about rules.db destruction
- Direct inspection of `src-tauri/migrations/` directory — confirmed migration 014 is current highest; next is 015
- `Cargo.toml` — sqlx 0.8 confirmed as current dependency

### Secondary (MEDIUM confidence)

- sqlx 0.8 API: `SqliteQueryResult::rows_affected() -> u64` — consistent with project's existing `execute()` pattern; inferred from sqlx 0.8 type signatures (project already uses `.execute()` throughout `lib.rs`)
- TanStack Query v5 `invalidateQueries({ queryKey, exact: false })` prefix-match behavior — consistent with the existing `["datasheets-by-faction"]` invalidation in `useRulesSync.onSuccess` which correctly invalidates all faction-specific variants

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all tools confirmed present in project
- Architecture: HIGH — all patterns traced directly to existing working code in the same file
- Pitfalls: HIGH — most sourced from ARCHITECTURE-AUDIT.md which was a Phase 42 code-path inspection; one (mutation dual-callback firing) is TanStack Query v5 documented behavior

**Research date:** 2026-05-08
**Valid until:** 2026-08-08 (sqlx 0.8 and TanStack Query v5 are stable; Wahapedia CSV format is unchanged)

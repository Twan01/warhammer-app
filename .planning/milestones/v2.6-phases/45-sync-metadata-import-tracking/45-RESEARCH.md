# Phase 45: Sync Metadata & Import Tracking — Research

**Researched:** 2026-05-08
**Domain:** SQLite migration extensions, TypeScript type evolution, React freshness indicators, pre-sync snapshotting
**Confidence:** HIGH — all findings sourced directly from existing codebase with zero ambiguity

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sync info placement (META-01, META-02, META-03)**
- Extend PlaybookTab's existing sync section — the "Last synced: {date}" text expands to show wahapedia version and per-table row counts
- Row counts and version displayed in a collapsible details area below the sync date line
- Keeps sync info co-located with where users trigger and interact with sync
- Row counts show the same key tables as the post-sync toast (datasheets, stratagems, abilities, wargear, keywords)

**Persistent row count storage (META-02)**
- Extend `rw_sync_meta` via ALTER TABLE in a new rules.db migration to add count columns matching the Rust SyncResult fields (factions, sources, datasheets, models, abilities, keywords, wargear, shared_abilities, stratagems, detachments, detachment_abilities)
- Rust upsert writes counts alongside `last_sync_at` + `wahapedia_version` in the same transaction — single INSERT OR REPLACE
- TypeScript `RulesSyncMeta` type extended with count fields (all nullable — null before first sync)

**Freshness indicator (META-05)**
- Compare `last_sync_at` to current date to determine freshness
- Three tiers: fresh (<7 days, green dot), aging (7–14 days, amber dot), stale (>14 days, red dot)
- Displayed on PlaybookTab near the "Last synced" text as a small color-coded dot with tooltip showing exact age (e.g., "Synced 3 days ago")
- 7-day threshold aligns with Wahapedia's roughly weekly update cadence
- Pure client-side computation — no backend freshness tracking needed

**Error history display (META-04)**
- Uses existing `getSyncErrors()` query from `src/db/queries/syncErrors.ts`
- Collapsible section below sync details in PlaybookTab, only rendered when errors exist
- Shows most recent 10 errors with timestamp, error type badge, and message
- Collapsed by default — expands on click
- Hidden entirely if no sync errors have ever been recorded

**Pre-sync snapshot (META-06)**
- New `rules_snapshot` table in hobbyforge.db (NOT rules.db)
- Schema: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `captured_at TEXT NOT NULL`, `wahapedia_version TEXT`, `table_name TEXT NOT NULL`, `row_count INTEGER NOT NULL`, `snapshot_data TEXT` (JSON array of `{id, name}` pairs)
- One row per table per snapshot capture (11 rows per snapshot)
- Captured BEFORE the DELETE pass — reads current rules.db state, writes to hobbyforge.db, then sync proceeds
- Snapshot capture triggered from TypeScript before calling `bulk_sync_rules`
- JSON `snapshot_data` stores `[{id, name}, ...]` sorted by id — enough for Phase 46 diff
- Keep ~3 most recent snapshots

### Claude's Discretion
- Exact collapsible section styling for sync details and error history
- Whether row counts display as a compact inline list or a mini table
- Migration file numbering for rw_sync_meta extension and rules_snapshot table
- Freshness dot implementation (CSS, icon, or badge component)
- Error history date formatting (relative "2 hours ago" vs absolute)
- Whether snapshot capture runs as a single batch query or per-table sequential reads
- Cleanup strategy for old snapshots (delete on capture or keep N most recent)

### Deferred Ideas (OUT OF SCOPE)
- Auto-sync reminder notification when data is stale
- Sync scheduling (periodic auto-sync)
- Detailed per-row change tracking (not just added/removed)
- Sync progress bar during fetch/insert
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| META-01 | User can see last successful sync date and time in the UI | Already rendered at PlaybookTab line 482–484; `formatSyncDate()` helper exists at line 463; extend with time portion |
| META-02 | User can see per-table row counts from last sync | Rust SyncResult has all 11 counts as `u64`; rw_sync_meta needs 11 new ALTER TABLE columns; TypeScript RulesSyncMeta needs matching nullable fields |
| META-03 | User can see Wahapedia source version/edition | `wahapedia_version` already stored in rw_sync_meta and returned by `useRulesSyncMeta()`; needs surfacing in the expanded collapsible details |
| META-04 | User can view timestamped list of past sync errors | `getSyncErrors()` read path already implemented in `src/db/queries/syncErrors.ts`; needs a `useSyncErrors` hook and collapsible UI section in PlaybookTab |
| META-05 | Freshness indicator on rules-dependent pages | Pure client-side date math on `syncMeta.last_sync_at`; three CSS color tiers; implement as inline component using existing `Badge` or a styled `<span>` with `Tooltip` |
| META-06 | Pre-sync snapshot captured before each re-sync | New `rules_snapshot` table in hobbyforge.db (migration 016); new query functions in `src/db/queries/rulesSnapshot.ts`; snapshot logic in TypeScript immediately before the `invoke("bulk_sync_rules")` call in `useRulesSync.ts` |
</phase_requirements>

---

## Summary

Phase 45 is a surface-and-persist phase: all the underlying data already exists (Rust SyncResult has 11 row counts, wahapedia_version is stored, sync_errors read path exists) but is not yet stored persistently or displayed to the user. The work follows three parallel tracks:

**Track 1 — Persist row counts (META-02).** Extend `rw_sync_meta` via ALTER TABLE (rules.db migration 003 or later), extend the Rust upsert at line 436–444 of `lib.rs` to include all 11 count fields, and extend `RulesSyncMeta` in `src/types/datasheet.ts`.

**Track 2 — Surface metadata UI (META-01, META-02, META-03, META-04, META-05).** Expand the existing PlaybookTab sync section with a collapsible details area showing version + row counts, a freshness dot computed from `last_sync_at`, and a separate collapsible error history. All shadcn components needed (`Collapsible`, `Badge`, `Tooltip`) are already imported or available.

**Track 3 — Pre-sync snapshot (META-06).** Add a new `rules_snapshot` table to hobbyforge.db (migration 016), add query functions to a new `src/db/queries/rulesSnapshot.ts`, and inject a snapshot-capture call in `useRulesSync.mutationFn` immediately before the `invoke("bulk_sync_rules")` call.

**Primary recommendation:** Implement in three waves — migration + Rust changes, then TypeScript query/hook layer, then UI integration.

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | existing | SQLite for both hobbyforge.db and rules.db | Project standard; $1/$2 parameterized query syntax |
| sqlx (Rust) | existing | Native transaction in bulk_sync_rules | Required for real SQLite transactions bypassing plugin pool |
| @tanstack/react-query | existing | Server state for sync meta, sync errors | Project-wide pattern; staleTime:Infinity for rules data |
| shadcn/ui | existing | Collapsible, Badge, Tooltip, Button | Already imported in PlaybookTab; new-york style zinc |
| Tailwind v4 | existing | CSS for freshness dot colors | CSS-first; use text-green-500/amber-500/red-500 inline |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/dates.ts` | project | `relativeDate()` for error timestamps, `todayISO()` | Error history "2 hours ago" display |
| `src/db/client.ts` | project | hobbyforge.db connection for snapshot writes | All writes to `rules_snapshot` table |
| `src/db/rules-client.ts` | project | rules.db connection for snapshot reads | Reading rw_* tables before sync |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src-tauri/migrations/
  rules_003_sync_meta_counts.sql   # ALTER TABLE rw_sync_meta ADD COLUMN ...
  016_rules_snapshot.sql           # CREATE TABLE rules_snapshot (hobbyforge.db)

src/db/queries/
  rulesSnapshot.ts                 # captureSnapshot(), getLatestSnapshots(), cleanOldSnapshots()

src/hooks/
  useSyncErrors.ts                 # useRulesSyncErrors() — wraps getSyncErrors()

src/features/units/
  PlaybookTab.tsx                  # extend sync section with details + freshness + errors
```

### Migration Numbering (CRITICAL)

- **hobbyforge.db migrations** (`get_migrations()`): next version is **16** — file `016_rules_snapshot.sql`
- **rules.db migrations** (`get_rules_migrations()`): next version is **3** — file `rules_003_sync_meta_counts.sql`
- Migration files are append-only and immutable — never edit existing files. New columns go in a new migration via `ALTER TABLE`.

### Pattern 1: ALTER TABLE for rw_sync_meta Count Columns

rw_sync_meta is a singleton row enforced by `CHECK (id = 1)`. Adding 11 count columns via ALTER TABLE is the correct pattern (project convention: new columns always via ALTER TABLE in a new numbered file).

```sql
-- rules_003_sync_meta_counts.sql
ALTER TABLE rw_sync_meta ADD COLUMN factions_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN sources_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN datasheets_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN models_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN abilities_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN keywords_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN wargear_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN shared_abilities_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN stratagems_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN detachments_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN detachment_abilities_count INTEGER;
```

All 11 columns are nullable at the SQL level — the CHECK constraint only enforces `id = 1`, and ALTER TABLE columns default to NULL. This means RulesSyncMeta count fields are nullable in TypeScript (`number | null`), representing "no sync yet."

### Pattern 2: Rust Upsert Extension

The existing upsert at `lib.rs` lines 436–444 uses a positional INSERT OR REPLACE. Extend it to include all 11 count columns. The SyncResult counts are already computed as `u64` fields at this point in the function.

```rust
// Source: src-tauri/src/lib.rs lines 436–444 (current), to be replaced
sqlx::query(
    "INSERT OR REPLACE INTO rw_sync_meta (id, last_sync_at, wahapedia_version,
     factions_count, sources_count, datasheets_count, models_count, abilities_count,
     keywords_count, wargear_count, shared_abilities_count, stratagems_count,
     detachments_count, detachment_abilities_count) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
)
.bind(&payload.last_sync_at)
.bind(&payload.wahapedia_version)
.bind(counts.factions as i64)
.bind(counts.sources as i64)
.bind(counts.datasheets as i64)
.bind(counts.models as i64)
.bind(counts.abilities as i64)
.bind(counts.keywords as i64)
.bind(counts.wargear as i64)
.bind(counts.shared_abilities as i64)
.bind(counts.stratagems as i64)
.bind(counts.detachments as i64)
.bind(counts.detachment_abilities as i64)
.execute(&mut *tx)
.await
.map_err(|e| format!("insert sync_meta: {e}"))?;
```

Note: `sqlx` uses positional `?` not `$1` syntax (this is native sqlx, not the tauri-plugin-sql wrapper). The existing upsert already uses `?` — keep that pattern.

### Pattern 3: Pre-Sync Snapshot in TypeScript

Snapshot capture runs in `useRulesSync.mutationFn` immediately before the `invoke("bulk_sync_rules")` call (line 137 in `useRulesSync.ts`). This is the correct placement because:
1. rules.db is still populated at this point (snapshot reads pre-DELETE state)
2. If snapshot capture fails, we still want sync to proceed (non-blocking — wrap in try/catch)

```typescript
// In mutationFn, immediately before the invoke("bulk_sync_rules") call:
try {
  await capturePreSyncSnapshot();
} catch (e) {
  console.warn("[useRulesSync] snapshot capture failed — proceeding with sync:", e);
  // Non-blocking: snapshot failure must not block sync
}

const rustResult = await invoke<RustSyncResult>("bulk_sync_rules", { payload: { ... } });
```

`capturePreSyncSnapshot()` in `src/db/queries/rulesSnapshot.ts`:
1. Reads each of the 11 rw_* tables from rules.db — `SELECT id, name FROM rw_*` (or the composite key table equivalent)
2. Writes 11 rows to `rules_snapshot` in hobbyforge.db
3. Cleans up snapshots older than the 3 most recent groups (by `captured_at` timestamp)

### Pattern 4: rules_snapshot Table DDL

```sql
-- 016_rules_snapshot.sql (hobbyforge.db, version 16)
CREATE TABLE IF NOT EXISTS rules_snapshot (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    captured_at   TEXT NOT NULL,
    wahapedia_version TEXT,
    table_name    TEXT NOT NULL,
    row_count     INTEGER NOT NULL,
    snapshot_data TEXT  -- JSON array: [{id, name}, ...] sorted by id ASC
);
```

### Pattern 5: Freshness Indicator Component

Pure client-side computation — no backend involvement. Computed from `syncMeta.last_sync_at`:

```typescript
// Inline in PlaybookTab or extracted to a small helper
function getSyncFreshness(lastSyncAt: string | null): "fresh" | "aging" | "stale" | "never" {
  if (!lastSyncAt) return "never";
  const ageMs = Date.now() - new Date(lastSyncAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 7) return "fresh";
  if (ageDays < 14) return "aging";
  return "stale";
}

const FRESHNESS_DOT_CLASS: Record<string, string> = {
  fresh:  "w-2 h-2 rounded-full bg-green-500",
  aging:  "w-2 h-2 rounded-full bg-amber-500",
  stale:  "w-2 h-2 rounded-full bg-red-500",
  never:  "w-2 h-2 rounded-full bg-muted-foreground",
};
```

Displayed as a `<span>` dot with a `TooltipProvider` / `Tooltip` showing exact age text.

### Pattern 6: useSyncErrors Hook

```typescript
// src/hooks/useSyncErrors.ts
export const SYNC_ERRORS_KEY = ["sync-errors"] as const;

export function useRulesSyncErrors() {
  return useQuery({
    queryKey: SYNC_ERRORS_KEY,
    queryFn: getSyncErrors,
    staleTime: 0,  // errors are real-time; always refetch
  });
}
```

Note: `staleTime: 0` (not Infinity) because error history changes after each failed sync. The existing `onError` in `useRulesSync` already calls `insertSyncError` — after that write, `SYNC_ERRORS_KEY` should be invalidated in `onError`.

### Pattern 7: PlaybookTab Sync Section Expansion

The current sync section at lines 479–525 renders `Last synced: {date}` as a plain `<span>`. The expansion adds:

1. A freshness dot `<span>` immediately before the text
2. A `<Collapsible>` below the sync date line for version + row counts (collapsed by default)
3. A second `<Collapsible>` below that for error history (hidden entirely when `syncErrors.length === 0`)

`Collapsible` / `CollapsibleContent` / `CollapsibleTrigger` are already imported at line 7 of PlaybookTab.tsx.

### Anti-Patterns to Avoid

- **Writing snapshot to rules.db:** rules.db is fully DELETEd on every sync — snapshot rows would be lost. Always write to hobbyforge.db via `getDb()`.
- **Cross-DB foreign keys:** SQLite does not support them. `rules_snapshot.table_name` is a plain TEXT copy, not a FK to rules.db.
- **Blocking sync on snapshot failure:** Snapshot is best-effort; wrap in try/catch and proceed regardless.
- **Inline snapshot reads via ATTACH DATABASE:** `tauri-plugin-sql` does not support ATTACH. Use the dual-query pattern (read from rules-client, write to hobbyforge client).
- **Modifying existing migration files:** Append-only — add ALTER TABLE in a new file.
- **staleTime: Infinity for sync errors:** Error data changes after each failed sync; use `staleTime: 0` and invalidate the key in `useRulesSync.onError`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time display | Custom time formatter | `relativeDate()` from `@/lib/dates.ts` | Already handles SQLite datetime strings and edge cases |
| Date age computation | Custom freshness logic | `Date.now() - new Date(iso).getTime()` one-liner | No library needed; keep inline |
| Collapsible sections | Custom accordion | shadcn `Collapsible` / `CollapsibleContent` / `CollapsibleTrigger` | Already imported in PlaybookTab |
| Tooltip for freshness dot | Custom hover state | shadcn `Tooltip` + `TooltipProvider` | Available in `@/components/ui/tooltip` |
| SQLite transactions | Manual multi-query | Existing sqlx transaction pattern in `bulk_sync_rules` | Rust transaction is already the correct boundary |
| JSON serialization | Custom snapshot format | `JSON.stringify(rows.sort(...))` | Standard; deterministic when sorted by id |

---

## Common Pitfalls

### Pitfall 1: sqlx `?` vs tauri-plugin-sql `$1`

**What goes wrong:** The Rust upsert uses sqlx directly (not the plugin pool). sqlx uses positional `?` syntax. The TypeScript query modules use `$1, $2` syntax (tauri-plugin-sql). Mixing these causes runtime errors.

**Why it happens:** Two separate DB access patterns coexist — Rust sqlx for the sync transaction, TypeScript plugin-sql for all reads/writes.

**How to avoid:** Rust code only uses `?`. TypeScript query modules only use `$1, $2`. Keep these separate.

**Warning signs:** "near '?': syntax error" or "no such bind parameter '$1'" in Rust logs.

### Pitfall 2: rw_sync_meta Reads Before Migration

**What goes wrong:** `getRulesSyncMeta()` does `SELECT *` — after the ALTER TABLE adds 11 columns, the SELECT will return them. But before first sync post-migration, the row has `last_sync_at` set from a previous sync and all 11 count columns as NULL. TypeScript code must handle nullable counts gracefully.

**How to avoid:** `RulesSyncMeta` count fields typed as `number | null`. UI displays "—" or hides count rows when null.

### Pitfall 3: Snapshot Capture Timing

**What goes wrong:** If snapshot capture runs AFTER the DELETE pass (inside the Rust transaction), the snapshot reads empty tables.

**Why it happens:** The Rust transaction DELETEs all rows before inserting new ones. Snapshot must read the pre-DELETE state.

**How to avoid:** Snapshot capture is done in TypeScript BEFORE the `invoke("bulk_sync_rules")` call. The invoke is what triggers the DELETE pass.

### Pitfall 4: Tables Without a `name` Column

**What goes wrong:** The snapshot format stores `[{id, name}]` pairs. `rw_datasheet_models`, `rw_datasheet_abilities`, `rw_datasheet_keywords`, `rw_datasheets_wargear` use composite PKs or TEXT-only keys without a top-level `name` column.

**How to avoid:** For tables without a direct `name` field, capture `id` + the most identifying column:
- `rw_datasheet_models` → `SELECT datasheet_id as id, COALESCE(name, datasheet_id) as name`
- `rw_datasheet_abilities` → `SELECT datasheet_id || '-' || line as id, name`
- `rw_datasheet_keywords` → `SELECT datasheet_id || '-' || keyword as id, keyword as name`
- `rw_datasheets_wargear` → `SELECT datasheet_id || '-' || line as id, name`

The row_count field is the critical value for Phase 46 diff; snapshot_data is supplementary.

### Pitfall 5: Cache Invalidation for Sync Errors

**What goes wrong:** `useSyncErrors` has `staleTime: 0` but still reads stale data after a failed sync because the error was written asynchronously in `onError` and the query isn't re-fetched.

**How to avoid:** In `useRulesSync.onError`, after `insertSyncError(...)`, add `qc.invalidateQueries({ queryKey: SYNC_ERRORS_KEY })`. This ensures the error history UI reflects the new error immediately.

### Pitfall 6: Migration Version Collision

**What goes wrong:** Adding a migration with an already-used version number silently overwrites or skips.

**How to avoid:** hobbyforge.db next version is **16** (current max is 15 = `015_sync_errors.sql`). rules.db next version is **3** (current max is 2 = `rules_002_wargear_abilities.sql`). Confirm in `get_migrations()` / `get_rules_migrations()` arrays in `lib.rs` before adding.

---

## Code Examples

### Extended RulesSyncMeta Type

```typescript
// src/types/datasheet.ts — extend existing RulesSyncMeta
export interface RulesSyncMeta {
  id: 1;
  last_sync_at: string | null;
  wahapedia_version: string | null;
  // Phase 45 additions — all nullable until first post-migration sync
  factions_count: number | null;
  sources_count: number | null;
  datasheets_count: number | null;
  models_count: number | null;
  abilities_count: number | null;
  keywords_count: number | null;
  wargear_count: number | null;
  shared_abilities_count: number | null;
  stratagems_count: number | null;
  detachments_count: number | null;
  detachment_abilities_count: number | null;
}
```

### rules_snapshot Query Module Skeleton

```typescript
// src/db/queries/rulesSnapshot.ts
import { getDb } from "@/db/client";
import { getRulesDb } from "@/db/rules-client";

export interface RulesSnapshotRow {
  id: number;
  captured_at: string;
  wahapedia_version: string | null;
  table_name: string;
  row_count: number;
  snapshot_data: string | null;  // JSON string
}

/** Tables to snapshot, with their id+name extraction query */
const SNAPSHOT_TABLES: Array<{ table: string; query: string }> = [
  { table: "rw_factions",              query: "SELECT id, name FROM rw_factions ORDER BY id" },
  { table: "rw_sources",               query: "SELECT id, name FROM rw_sources ORDER BY id" },
  { table: "rw_datasheets",            query: "SELECT id, name FROM rw_datasheets ORDER BY id" },
  { table: "rw_datasheet_models",      query: "SELECT datasheet_id || '-' || line as id, COALESCE(name, datasheet_id) as name FROM rw_datasheet_models ORDER BY datasheet_id, line" },
  { table: "rw_datasheet_abilities",   query: "SELECT datasheet_id || '-' || line as id, name FROM rw_datasheet_abilities ORDER BY datasheet_id, line" },
  { table: "rw_datasheet_keywords",    query: "SELECT datasheet_id || '-' || keyword as id, keyword as name FROM rw_datasheet_keywords ORDER BY datasheet_id, keyword" },
  { table: "rw_datasheets_wargear",    query: "SELECT datasheet_id || '-' || line as id, name FROM rw_datasheets_wargear ORDER BY datasheet_id, line" },
  { table: "rw_abilities",             query: "SELECT id, name FROM rw_abilities ORDER BY id" },
  { table: "rw_stratagems",            query: "SELECT id, name FROM rw_stratagems ORDER BY id" },
  { table: "rw_detachments",           query: "SELECT id, name FROM rw_detachments ORDER BY id" },
  { table: "rw_detachment_abilities",  query: "SELECT id, name FROM rw_detachment_abilities ORDER BY id" },
];

export async function capturePreSyncSnapshot(wahapediaVersion?: string): Promise<void> {
  const rulesDb = await getRulesDb();
  const hobbyDb = await getDb();
  const capturedAt = new Date().toISOString();

  for (const { table, query } of SNAPSHOT_TABLES) {
    const rows = await rulesDb.select<{ id: string; name: string }[]>(query, []);
    const snapshotData = JSON.stringify(rows);
    await hobbyDb.execute(
      "INSERT INTO rules_snapshot (captured_at, wahapedia_version, table_name, row_count, snapshot_data) VALUES ($1, $2, $3, $4, $5)",
      [capturedAt, wahapediaVersion ?? null, table, rows.length, snapshotData],
    );
  }

  // Keep only the 3 most recent snapshot groups (each group = 11 rows sharing captured_at)
  await cleanOldSnapshots(hobbyDb, 3);
}

async function cleanOldSnapshots(db: Awaited<ReturnType<typeof getDb>>, keepCount: number): Promise<void> {
  // Find the nth-most-recent captured_at timestamp
  const cutoffs = await db.select<{ captured_at: string }[]>(
    `SELECT DISTINCT captured_at FROM rules_snapshot ORDER BY captured_at DESC LIMIT $1`,
    [keepCount],
  );
  if (cutoffs.length < keepCount) return; // fewer than N groups, nothing to delete
  const oldestKept = cutoffs[cutoffs.length - 1].captured_at;
  await db.execute(
    "DELETE FROM rules_snapshot WHERE captured_at < $1",
    [oldestKept],
  );
}

export async function getLatestSnapshot(): Promise<RulesSnapshotRow[]> {
  const db = await getDb();
  return db.select<RulesSnapshotRow[]>(
    `SELECT * FROM rules_snapshot
     WHERE captured_at = (SELECT MAX(captured_at) FROM rules_snapshot)
     ORDER BY table_name`,
    [],
  );
}
```

### PlaybookTab Freshness Dot (inline pattern)

```tsx
// In PlaybookTab.tsx — near the "Last synced" text (lines 482-484)
// Uses Tailwind v4 CSS classes; Tooltip from @/components/ui/tooltip
{syncMeta && (() => {
  const ageMs = Date.now() - new Date(syncMeta.last_sync_at ?? 0).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const dotClass = ageDays < 7
    ? "bg-green-500"
    : ageDays < 14
    ? "bg-amber-500"
    : "bg-red-500";
  const ageLabel = ageDays === 0 ? "today" : ageDays === 1 ? "yesterday" : `${ageDays} days ago`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
        </TooltipTrigger>
        <TooltipContent>Synced {ageLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
})()}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Row counts from TypeScript array `.length` | Actual Rust INSERT counts via `SyncResult` u64 fields | Phase 44 | Counts now reflect actual DB state, not input payload size |
| Sync metadata read-only (last_sync_at + version only) | Extended with 11 count columns via ALTER TABLE | Phase 45 | `useRulesSyncMeta()` automatically surfaces new fields |
| No pre-sync snapshot | `rules_snapshot` table in hobbyforge.db | Phase 45 | Enables Phase 46 change diff without any Rust changes |

**Deprecated/outdated in this phase:**
- The architecture audit note "Gap META-02" (rw_sync_meta missing counts) — closed by rules_003_sync_meta_counts.sql migration

---

## Open Questions

1. **Tables with composite PKs in snapshot_data**
   - What we know: SNAPSHOT_TABLES query above synthesizes an `id` string for composite-PK tables using `||` concatenation
   - What's unclear: Whether Phase 46's diff algorithm expects real `id` values from rw_datasheets.id (TEXT, 9-digit Wahapedia strings) vs. synthetic `datasheet_id || '-' || line` strings
   - Recommendation: Use real `id` only for tables that have a single-column TEXT PK (`rw_factions`, `rw_sources`, `rw_datasheets`, `rw_abilities`, `rw_stratagems`, `rw_detachments`, `rw_detachment_abilities`). For the 4 composite-PK tables, store row_count only (set `snapshot_data` to null) — the count delta is sufficient for Phase 46 to detect changes in model lines, wargear entries, abilities, and keywords.

2. **wahapedia_version in snapshot capture**
   - What we know: `capturePreSyncSnapshot` needs to know the current version to store in `rules_snapshot.wahapedia_version`
   - What's unclear: At snapshot capture time, `wahapediaVersion` hasn't been fetched yet (it's parsed from `Last_update.csv` which is fetched in parallel with other CSVs). The snapshot captures the PRE-sync state, so the "current version" is `syncMeta.last_sync_at`-era version.
   - Recommendation: Pass `syncMeta?.wahapedia_version ?? null` from `useRulesSync` context when calling `capturePreSyncSnapshot`. This correctly records "what version we were on BEFORE this sync."

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest inline config) |
| Quick run command | `pnpm test -- tests/datasheet/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| META-01 | `formatSyncDate` renders date+time from ISO string | unit | `pnpm test -- tests/datasheet/syncMetaQueries.test.ts` | ❌ Wave 0 |
| META-02 | `getRulesSyncMeta` returns count fields when present, null when absent | unit | `pnpm test -- tests/datasheet/syncMetaQueries.test.ts` | ❌ Wave 0 |
| META-03 | `wahapedia_version` surfaced in sync details section | unit (component) | `pnpm test -- tests/datasheet/syncMetaDisplay.test.ts` | ❌ Wave 0 |
| META-04 | `getSyncErrors` reads errors DESC; `useSyncErrors` renders error list | unit | `pnpm test -- tests/datasheet/syncErrorQueries.test.ts` | ✅ existing (covers query; needs hook test) |
| META-05 | Freshness dot shows green/amber/red based on age thresholds | unit | `pnpm test -- tests/datasheet/syncFreshness.test.ts` | ❌ Wave 0 |
| META-06 | `capturePreSyncSnapshot` writes 11 rows to hobbyforge.db; reads from rules.db | unit | `pnpm test -- tests/datasheet/rulesSnapshot.test.ts` | ❌ Wave 0 |
| META-06 | `cleanOldSnapshots` deletes rows when >3 capture groups exist | unit | `pnpm test -- tests/datasheet/rulesSnapshot.test.ts` | ❌ Wave 0 |
| META-06 | Snapshot capture called BEFORE `invoke("bulk_sync_rules")` | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ✅ existing (needs snapshot call assertion) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/datasheet/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/datasheet/syncMetaQueries.test.ts` — covers META-01, META-02 (extended RulesSyncMeta with count fields)
- [ ] `tests/datasheet/syncFreshness.test.ts` — covers META-05 (freshness tier computation function)
- [ ] `tests/datasheet/rulesSnapshot.test.ts` — covers META-06 (capturePreSyncSnapshot writes, cleanOldSnapshots, getLatestSnapshot)
- [ ] `tests/datasheet/useRulesSync.test.ts` extension — assert snapshot capture called before invoke (existing file needs new test case)

*(Existing `tests/datasheet/syncErrorQueries.test.ts` covers the getSyncErrors read path. The `useSyncErrors` hook test can be added as a new test case in that file or a new file.)*

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src-tauri/src/lib.rs` (SyncResult struct lines 153–165, Rust upsert lines 436–444)
- Direct codebase inspection — `src/hooks/useRulesSync.ts` (invoke call site line 137)
- Direct codebase inspection — `src/types/datasheet.ts` (RulesSyncMeta lines 67–71)
- Direct codebase inspection — `src/db/queries/datasheets.ts` (getRulesSyncMeta lines 105–115)
- Direct codebase inspection — `src/db/queries/syncErrors.ts` (getSyncErrors fully implemented)
- Direct codebase inspection — `src/hooks/useDatasheet.ts` (useRulesSyncMeta, RULES_SYNC_META_KEY)
- Direct codebase inspection — `src/features/units/PlaybookTab.tsx` (sync section lines 479–525, Collapsible already imported)
- Direct codebase inspection — `src-tauri/migrations/rules_001_schema.sql` (rw_sync_meta DDL)
- Direct codebase inspection — `src-tauri/migrations/015_sync_errors.sql` (migration version 15 confirmed)
- Direct codebase inspection — `.planning/phases/42-architecture-audit/ARCHITECTURE-AUDIT.md` (Section 4 migration proposals)

### Secondary (MEDIUM confidence)
- Architecture Audit migration proposal (Section 4) — validated against actual code; all stated gaps confirmed present

### Tertiary (LOW confidence)
- None — all claims are code-backed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all tools already in use
- Architecture: HIGH — all integration points precisely located in source
- Pitfalls: HIGH — derived from direct inspection of existing migration patterns and Rust/TS boundary
- Migration numbering: HIGH — counted from actual migration files in `src-tauri/migrations/`

**Research date:** 2026-05-08
**Valid until:** Stable until Phase 46 changes rules_snapshot schema (unlikely mid-phase)

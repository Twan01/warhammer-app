# Stack Research

**Domain:** Local-first Windows desktop — HobbyForge v2.6 Rules Sync 2.0 / Rules Data Hub
**Researched:** 2026-05-07
**Confidence:** HIGH — verified against package.json, Cargo.toml, Cargo.lock, lib.rs, all rules migrations, useRulesSync.ts, datasheets.ts, and types/datasheet.ts

---

## Executive Decision: 0 New npm Packages, 0 New Rust Crates

Every v2.6 feature (sync metadata, manual overrides, version comparison/diff) is
solved by the existing stack. The rules sync pipeline is already more complete than
the milestone requirements assumed — all 12 CSVs are fetched, all extended tables
exist in rules_002, and the Rust command already handles every data type. The work
is wiring, schema extension, and UI — not new dependencies.

---

## Current-State Audit (Code-Verified)

This is the most important input for v2.6. Phase 42 (Architecture Audit) confirms
what already exists before any code changes.

### What Already Works (Verified in Source)

| Capability | Where | Status |
|-----------|-------|--------|
| 12-CSV parallel fetch | `useRulesSync.ts` lines 16-29, 57-61 | COMPLETE — fetches all: Factions, Source, Datasheets, Datasheets_models, Datasheets_abilities, Datasheets_keywords, Datasheets_wargear, Abilities, Stratagems, Detachments, Detachment_abilities, Last_update |
| Rust bulk_sync_rules insert | `lib.rs` lines 182-409 | COMPLETE — handles all 11 table types in one atomic transaction |
| rw_factions table | `rules_001_schema.sql` | COMPLETE |
| rw_datasheets + models + abilities + keywords | `rules_001_schema.sql` | COMPLETE |
| rw_sources | `rules_001_schema.sql` | COMPLETE |
| rw_sync_meta | `rules_001_schema.sql` | PARTIAL — only `last_sync_at` + `wahapedia_version`; no row counts, no error log, no source registry |
| rw_datasheets_wargear | `rules_002_wargear_abilities.sql` | COMPLETE — wired in both SQL migration and Rust insert |
| rw_abilities (shared abilities) | `rules_002_wargear_abilities.sql` | COMPLETE — synced in Rust as `shared_abilities` |
| rw_stratagems | `rules_002_wargear_abilities.sql` | COMPLETE — all fields including phase, cp_cost, detachment_id |
| rw_detachments | `rules_002_wargear_abilities.sql` | COMPLETE |
| rw_detachment_abilities | `rules_002_wargear_abilities.sql` | COMPLETE |
| TypeScript types for wargear | `types/datasheet.ts` | COMPLETE — `RwDatasheetWargear`, `RwAbility` defined |
| getFullDatasheet wargear fetch | `db/queries/datasheets.ts` line 93-96 | COMPLETE — returns `wargear[]` in `FullDatasheet` |
| Sync metadata query | `useDatasheet.ts` → `getRulesSyncMeta()` | PARTIAL — returns `last_sync_at` and `wahapedia_version` only |

### What Does NOT Yet Exist (v2.6 Must Build)

| Gap | Phase | Approach |
|-----|-------|---------|
| Row counts per table stored in rw_sync_meta | 45 | ALTER TABLE rw_sync_meta ADD COLUMN; update Rust insert |
| Error/failure log | 45 | New `rw_sync_errors` table in rules migration 003 |
| Source registry (source name, URL, edition) | 45 | Extend `rw_sync_meta` or new `rw_sync_sources` table |
| Freshness indicators in UI | 45 | Derived from `last_sync_at` timestamp comparison |
| Manual override system | 46 | New `rw_overrides` table in rules migration 003 |
| Snapshot table for version comparison | 46 | New `rw_snapshots` table capturing pre-sync state |
| Change detection / diff between syncs | 46 | Pure TypeScript comparison; no diff library needed |
| TypeScript types for stratagems/detachments | 43 | Add `RwStratagem`, `RwDetachment`, `RwDetachmentAbility` to `types/datasheet.ts` |
| Query functions for stratagems/detachments | 43 | Add to `src/db/queries/datasheets.ts` or new file |
| React Query hooks for stratagems/detachments | 43 | Add to `src/hooks/useDatasheet.ts` or new `useRulesData.ts` |
| UI display for stratagems/detachments | 43 | New components in PlaybookTab or new Rules page |

---

## Feature-by-Feature Dependency Analysis

| Feature | New Package Needed? | Justification |
|---------|---------------------|---------------|
| Extended rules tables (wargear, stratagems, detachments, detachment abilities) | NO | Tables already exist in `rules_002`. TypeScript types + query functions + hooks are missing but are pure TypeScript additions following existing patterns in `datasheets.ts` and `useDatasheet.ts`. |
| Sync metadata (row counts, error logs, source registry) | NO | ALTER TABLE on `rw_sync_meta` + new `rw_sync_errors` table in a new migration `rules_003_sync_metadata.sql`. Row counts computed in Rust before `tx.commit()`. Rust already has access to `payload.*vec.len()` for each data type. |
| Freshness indicators (staleness age) | NO | Derived from `last_sync_at` stored as ISO string. `todayISO()` from `@/lib/dates` already exists; date diff is `Math.floor((now - syncDate) / 86400000)` — no library. |
| Manual overrides (points/stats/keywords/abilities) | NO | New `rw_overrides` table with `(table_name, row_id, field_name, override_value, created_at, note)` schema. Queried in TypeScript; override merging at read time (never mutate the `rw_*` tables). Same `src/db/queries/` pattern. |
| Override persistence across re-syncs | NO | Override system stores overrides in a separate table, not in the synced `rw_*` tables. Re-sync replaces `rw_*` rows; `rw_overrides` is never touched by Rust bulk_sync_rules. |
| Version comparison / change detection | NO | Capture a snapshot of key fields before re-sync (a `rw_snapshots` table or a simple JSON blob per sync event). After re-sync, TypeScript compares old vs new and emits a change report. Pure array comparison; no diff library. Use same React Query staleTime: Infinity + invalidate-on-sync pattern. |
| Failure safety (import failure does not corrupt existing data) | NO | Already achieved by existing architecture: Rust runs DELETE + INSERT inside a single `tx`. If `tx.commit()` fails, the entire re-sync is rolled back. The TypeScript side catches the `invoke` rejection and surfaces a toast. |
| Offline / rules data remains available | NO | rules.db is local SQLite. Reading it never requires network. Sync fails gracefully (toast) without touching existing rows if the transaction rolls back. |
| UI for last sync date / data freshness | NO | shadcn `<Badge>` + `<Tooltip>` already installed. Simple text: "Last synced: 3 days ago". Same pattern as the existing `rw_sync_meta` display in PlaybookTab. |

---

## Confirmed Existing Stack — All v2.6 Capabilities Covered

| Technology | Installed Version | v2.6 Role |
|------------|------------------|-----------|
| `tauri-plugin-sql` | ^2.4.0 (Rust 2.4.0) | New rules migrations, ALTER TABLE, rw_overrides CRUD |
| `sqlx` | 0.8.6 (in Cargo.lock) | Rust bulk_sync_rules already uses sqlx directly — ADD row count capture before `tx.commit()` |
| `@tauri-apps/api` | ^2.0.0 | `invoke("bulk_sync_rules", ...)` call — no changes needed |
| `@tanstack/react-query` | ^5.100.6 | New query keys for stratagems, detachments, overrides, sync log |
| `zod` | ^4.4.1 | New schemas for override form (field_name, override_value, note) |
| `react-hook-form` | ^7.74.0 | Override entry form |
| `zustand` | ^5.0.12 | Optional: override filter state (by unit/field) if complex enough |
| `shadcn/ui` | CLI v4 | `<Badge>` for freshness, `<Tooltip>` for override indicators, `<Table>` for change log, `<Dialog>` for override edit |
| Tailwind CSS v4 | 4.2.4 | Override badge, diff highlighting (e.g. `text-amber-400` for changed values) |
| `lucide-react` | ^0.460.0 | `AlertTriangle` for stale warning, `CheckCircle` for fresh, `Pencil` for override |
| `sonner` | ^2.0.7 | Sync success/failure toast with row counts, override save confirmation |
| `@tauri-apps/plugin-http` | ~2.5.9 | Already used for CSV fetch — no changes |

---

## New Schema Requirements (SQL Only — No New npm/Cargo)

Three new migrations for `rules.db`.

### Migration: rules_003_sync_metadata.sql

Extend sync tracking and add override infrastructure.

```sql
-- Extend rw_sync_meta with row counts and error tracking
ALTER TABLE rw_sync_meta ADD COLUMN factions_count      INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN datasheets_count    INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN models_count        INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN abilities_count     INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN keywords_count      INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN wargear_count       INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN stratagems_count    INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN detachments_count   INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN sources_count       INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN sync_duration_ms    INTEGER;

-- Import error log (cleared at sync start, populated on errors)
CREATE TABLE IF NOT EXISTS rw_sync_errors (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    synced_at   TEXT NOT NULL DEFAULT (datetime('now')),
    table_name  TEXT NOT NULL,
    row_id      TEXT,
    error_msg   TEXT NOT NULL
);

-- Source registry (one row per import source URL)
CREATE TABLE IF NOT EXISTS rw_sync_sources (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,         -- e.g. "Wahapedia WH40K 10ed"
    base_url    TEXT NOT NULL,         -- e.g. "https://wahapedia.ru/wh40k10ed"
    last_sync_at TEXT,
    last_version TEXT,                 -- wahapedia_version from Last_update.csv
    edition     TEXT NOT NULL DEFAULT '10ed'
);
```

### Migration: rules_004_overrides.sql

Manual override system that survives re-syncs.

```sql
-- Override table: stores user corrections on top of synced data
-- Never touched by bulk_sync_rules — persists across all re-syncs
CREATE TABLE IF NOT EXISTS rw_overrides (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name      TEXT NOT NULL,   -- e.g. "rw_datasheets", "rw_datasheet_models"
    row_id          TEXT NOT NULL,   -- the Wahapedia TEXT id of the affected row
    field_name      TEXT NOT NULL,   -- column being overridden, e.g. "T", "W", "name"
    override_value  TEXT,            -- user value (NULL = "clear this field override")
    note            TEXT,            -- user explanation
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(table_name, row_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_rw_overrides_lookup
    ON rw_overrides(table_name, row_id);
```

### Migration: rules_005_snapshots.sql

Pre-sync snapshots for version comparison.

```sql
-- Lightweight snapshot: key field JSON per datasheet captured before each sync
-- Used to compute a change report after sync completes
CREATE TABLE IF NOT EXISTS rw_sync_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    captured_at     TEXT NOT NULL DEFAULT (datetime('now')),
    wahapedia_version TEXT,
    snapshot_json   TEXT NOT NULL   -- JSON blob: { datasheets: [{id, name, T, W, ...}] }
);

-- Retain last 5 snapshots max; oldest pruned on insert by application logic
CREATE INDEX IF NOT EXISTS idx_rw_sync_snapshots_date
    ON rw_sync_snapshots(captured_at DESC);
```

**Snapshot strategy:** Capture only fields that change in balance updates — `T`, `W`,
`Sv`, `OC`, wargear `S`/`AP`/`D`/`A`, and `name`. A full snapshot of all 2000+
datasheets costs roughly 200-500 KB as JSON — acceptable for local storage. The
snapshot is captured before the bulk DELETE+INSERT transaction begins so the old data
is still readable. After sync completes, a TypeScript comparison function diffs old vs
new and produces a `SyncChangeSummary` object rendered in the UI.

---

## New TypeScript Additions

### Types to add to `src/types/datasheet.ts`

```typescript
export interface RwStratagem {
  id: string;
  faction_id: string | null;
  name: string;
  type: string | null;
  cp_cost: string | null;
  legend: string | null;
  turn: string | null;
  phase: string | null;
  detachment: string | null;
  detachment_id: string | null;
  description: string | null;
}

export interface RwDetachment {
  id: string;
  faction_id: string | null;
  name: string;
  legend: string | null;
  type: string | null;
}

export interface RwDetachmentAbility {
  id: string;
  faction_id: string | null;
  name: string;
  legend: string | null;
  description: string | null;
  detachment: string | null;
  detachment_id: string | null;
}

export interface RwOverride {
  id: number;
  table_name: string;
  row_id: string;
  field_name: string;
  override_value: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncChangeSummary {
  wahapediaVersionBefore: string | null;
  wahapediaVersionAfter: string;
  syncedAt: string;
  changes: SyncFieldChange[];
  addedDatasheetCount: number;
  removedDatasheetCount: number;
}

export interface SyncFieldChange {
  datasheetId: string;
  datasheetName: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

// Extended RulesSyncMeta with row counts
export interface RulesSyncMetaFull {
  id: 1;
  last_sync_at: string | null;
  wahapedia_version: string | null;
  factions_count: number | null;
  datasheets_count: number | null;
  models_count: number | null;
  abilities_count: number | null;
  keywords_count: number | null;
  wargear_count: number | null;
  stratagems_count: number | null;
  detachments_count: number | null;
  sources_count: number | null;
  sync_duration_ms: number | null;
}
```

### Rust changes to `lib.rs` (additive only)

Extend `BulkSyncPayload` to carry row counts back via return value, and write them
to `rw_sync_meta`. The existing Rust command signature returns `Result<(), String>` —
change to `Result<BulkSyncResult, String>` to return row counts to TypeScript.

```rust
#[derive(serde::Serialize)]
pub struct BulkSyncResult {
    factions_count: usize,
    datasheets_count: usize,
    models_count: usize,
    abilities_count: usize,
    keywords_count: usize,
    wargear_count: usize,
    stratagems_count: usize,
    detachments_count: usize,
    sources_count: usize,
    duration_ms: u128,
}
```

The counts are `payload.factions.len()` etc. — computed before the transaction,
passed into the rw_sync_meta INSERT OR REPLACE. Zero new crates needed; this is
additive Rust logic on existing infrastructure.

---

## Key Integration Patterns (Existing, Reuse Directly)

### Override Read Pattern (merge at query time, not write time)

```typescript
// In src/db/queries/datasheets.ts
export async function getOverridesForDatasheet(
  datasheetId: string
): Promise<RwOverride[]> {
  const db = await getRulesDb();
  return db.select<RwOverride[]>(
    `SELECT * FROM rw_overrides
     WHERE table_name IN ('rw_datasheets', 'rw_datasheet_models')
       AND row_id = $1`,
    [datasheetId]
  );
}

// Apply overrides on top of synced data — never mutate the rw_* tables
export function applyOverrides<T extends Record<string, unknown>>(
  row: T,
  overrides: RwOverride[]
): T {
  const result = { ...row };
  for (const o of overrides) {
    if (o.field_name in result) {
      result[o.field_name as keyof T] = o.override_value as T[keyof T];
    }
  }
  return result;
}
```

This keeps synced data pristine. Override display in UI shows the original vs override
side by side with the user's note. On re-sync, overrides still apply because the
`rw_overrides` table is never touched by `bulk_sync_rules`.

### Change Detection Pattern (TypeScript only, no diff library)

```typescript
// In src/lib/syncDiff.ts — pure function, fully testable
export function computeSyncChanges(
  before: SnapshotDatasheet[],
  after: RwDatasheet[],
  modelsAfter: Map<string, RwDatasheetModel[]>
): SyncFieldChange[] {
  const beforeMap = new Map(before.map(d => [d.id, d]));
  const changes: SyncFieldChange[] = [];

  for (const ds of after) {
    const old = beforeMap.get(ds.id);
    if (!old) continue; // new datasheet — not a change, counted separately
    const watchedFields: (keyof typeof old)[] = ['name', 'role'];
    for (const field of watchedFields) {
      if (String(old[field] ?? '') !== String(ds[field as keyof RwDatasheet] ?? '')) {
        changes.push({ datasheetId: ds.id, datasheetName: ds.name, field, oldValue: String(old[field] ?? ''), newValue: String(ds[field as keyof RwDatasheet] ?? '') });
      }
    }
  }
  return changes;
}
```

Pure function with no external dependencies. The test pattern follows the TDD Wave 0
approach already used for `computeStats`, `relativeTime`, and `kanbanUtils`.

### Stratagem Query Pattern (new query function following existing style)

```typescript
// In src/db/queries/datasheets.ts (or new src/db/queries/rules.ts)
export async function getStratagemsByDetachment(
  detachmentId: string
): Promise<RwStratagem[]> {
  const db = await getRulesDb();
  return db.select<RwStratagem[]>(
    `SELECT * FROM rw_stratagems
     WHERE detachment_id = $1
     ORDER BY phase, cp_cost, name`,
    [detachmentId]
  );
}

export async function getStratagemsByFaction(
  factionId: string
): Promise<RwStratagem[]> {
  const db = await getRulesDb();
  return db.select<RwStratagem[]>(
    `SELECT * FROM rw_stratagems
     WHERE faction_id = $1
     ORDER BY phase, cp_cost, name`,
    [factionId]
  );
}
```

---

## Alternatives Considered

| Our Approach | Alternative | Why We Rejected It |
|--------------|-------------|-------------------|
| Snapshot in `rw_sync_snapshots` as JSON blob | Separate snapshot table mirroring every `rw_*` column | JSON blob is simpler to maintain when the rw schema evolves. The snapshot only needs fields that change in balance updates, not every column. Trade-off: can't query individual fields from the snapshot. Acceptable for a change-display-only use case. |
| Override in separate `rw_overrides` table (merge at read time) | Override columns added directly to `rw_*` tables (e.g. `rw_datasheets.override_T`) | Separate table survives schema migrations. Adding override columns to every synced table creates fragile migration surface and is impossible to do atomically for all tables. The separate table pattern is standard for this class of user annotation system. |
| Pure TypeScript diff computation | `deep-diff` npm package | deep-diff adds a dependency for a task that is 15 lines of TypeScript on a well-defined data shape. The `SyncFieldChange[]` shape is simpler than a generic tree diff. No library needed. |
| Pruning snapshots in application code (keep last 5) | Trigger-based auto-pruning in SQLite | SQLite triggers for cleanup add migration complexity. Application-level pruning on INSERT is simple and testable. Consistent with the project's no-trigger principle. |
| Return `BulkSyncResult` from Rust | Compute row counts in TypeScript from payload length | Rust already has the counts at commit time and is the authoritative source. TypeScript counting the parsed arrays would double-count (parsing could fail rows). Rust-side is more accurate. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `deep-diff` npm package | The sync diff is a flat comparison of known fields. A custom 15-line TypeScript function in `src/lib/syncDiff.ts` is sufficient, fully typed, and testable without a dependency. | Pure TypeScript comparison function |
| `immer` for immutable override merging | `applyOverrides` is a shallow spread + field overwrite — no nested mutation. Immer adds overhead and a learning curve for simple key-value replacement. | Spread + loop: `{ ...row, [field]: value }` |
| Any ORM / query builder (Drizzle etc.) | Already decided in project constraints. The new query functions for stratagems, detachments, and overrides follow the exact same `db.select<T[]>(sql, params)` pattern as the existing 200+ queries. No ORM adds value here. | Raw typed queries in `src/db/queries/` |
| Separate `rules-client-v2.ts` | The existing `getRulesDb()` singleton handles WAL mode and FK enforcement. New queries simply call `getRulesDb()` like every existing query. | Existing `src/db/rules-client.ts` |
| New Rust commands for override CRUD | Overrides are stored in `rules.db` and are small-volume user-created rows. `tauri-plugin-sql` via TypeScript handles INSERT/UPDATE/DELETE for the `rw_overrides` table exactly as it does for `painting_recipes` or `painting_sessions`. Only bulk operations benefit from native Rust. | TypeScript queries via `tauri-plugin-sql` |
| `date-fns` or `dayjs` for freshness computation | Freshness is `Math.floor((Date.now() - new Date(last_sync_at).getTime()) / 86400000)` — one line. The project already has `todayISO()` in `src/lib/dates.ts` for its date needs. | Inline arithmetic + `todayISO()` |

---

## Version Compatibility — No Changes

No new packages means no new compatibility surface. All existing packages stay at
their current locked versions.

| Package | Version | v2.6 Usage | Compatibility |
|---------|---------|------------|---------------|
| `tauri-plugin-sql` | ^2.4.0 | New migrations, ALTER TABLE, override CRUD | Confirmed: additive migrations auto-run at startup |
| `sqlx` | 0.8.6 | Rust `BulkSyncResult` struct (additive) | Confirmed: already in production for bulk_sync_rules |
| `@tanstack/react-query` | ^5.100.6 | New query keys: stratagems, detachments, overrides, sync-log | No API change |
| `zod` | ^4.4.1 | Override form schema | No change to Zod API |
| `react-hook-form` | ^7.74.0 | Override entry form | No change to RHF API |
| `@tauri-apps/plugin-http` | ~2.5.9 | Existing CSV fetch — unchanged | No change |

---

## Sources

- `src/hooks/useRulesSync.ts` — confirmed all 12 CSVs are fetched and all parsed arrays passed to bulk_sync_rules [HIGH confidence]
- `src-tauri/src/lib.rs` lines 130-409 — confirmed BulkSyncPayload includes all 11 data types; all table inserts implemented [HIGH confidence]
- `src-tauri/migrations/rules_001_schema.sql` — confirmed rw_sync_meta columns: id, last_sync_at, wahapedia_version (no row counts) [HIGH confidence]
- `src-tauri/migrations/rules_002_wargear_abilities.sql` — confirmed all 5 extended tables exist: rw_datasheets_wargear, rw_abilities, rw_stratagems, rw_detachments, rw_detachment_abilities [HIGH confidence]
- `src/types/datasheet.ts` — confirmed RwStratagem, RwDetachment, RwDetachmentAbility are NOT yet defined; RwDatasheetWargear and RwAbility ARE defined [HIGH confidence]
- `src/db/queries/datasheets.ts` — confirmed no query functions for stratagems, detachments, or overrides [HIGH confidence]
- `src-tauri/Cargo.lock` — confirmed sqlx 0.8.6, tauri 2.10.3 [HIGH confidence]
- `package.json` — confirmed all npm package versions [HIGH confidence]

---

*Stack research for: HobbyForge v2.6 — Rules Sync 2.0 / Rules Data Hub*
*Researched: 2026-05-07*

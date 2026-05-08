# Architecture Research

**Domain:** Rules Sync 2.0 / Rules Data Hub — HobbyForge v0.2.6 (Phases 42–46)
**Researched:** 2026-05-07
**Confidence:** HIGH (derived from full codebase read + existing V3_ARCHITECTURE_AUDIT.md)

---

## Current State Audit — What Already Exists

### Sync Pipeline Status: Fully Wired

The audit question from v3.0-ROADMAP.md is resolved. The production sync path is:

```
PlaybookTab "Sync" button
  → useRulesSync() hook               [src/hooks/useRulesSync.ts]
    → fetch 12 Wahapedia CSVs         [parallel via tauri-plugin-http]
    → parseWahapediaCsv() + stripHtml()
    → invoke("bulk_sync_rules", payload)
      → Rust bulk_sync_rules           [src-tauri/src/lib.rs]
        → DELETE 11 rw_* tables        [FK checks OFF, single transaction]
        → INSERT all rows              [11 tables, full replacement]
        → INSERT OR REPLACE rw_sync_meta
        → COMMIT
  → React Query invalidation           [sync-meta, datasheets, datasheets-by-faction]
```

Both TypeScript AND Rust are active. TypeScript handles HTTP + parsing. Rust handles the atomic DB transaction. The split is intentional and correct — tauri-plugin-sql does not support multi-statement transactions, so sqlx is used directly in Rust for the sync write path.

### rules.db Table Coverage

| Table | Migration | Synced | Queried | Status |
|-------|-----------|--------|---------|--------|
| `rw_factions` | 001 | YES | YES | Live |
| `rw_datasheets` | 001 | YES | YES | Live |
| `rw_datasheet_models` | 001 | YES | YES | Live |
| `rw_datasheet_abilities` | 001 | YES | YES | Live |
| `rw_datasheet_keywords` | 001 | YES | YES | Live |
| `rw_sources` | 001 | YES | YES | Live |
| `rw_sync_meta` | 001 | YES | YES | Live (last_sync_at, wahapedia_version only) |
| `rw_datasheets_wargear` | 002 | YES | YES | Live (getFullDatasheet) |
| `rw_abilities` | 002 | YES | NO | Dark — data present, zero queries |
| `rw_stratagems` | 002 | YES | NO | Dark — data present, zero queries |
| `rw_detachments` | 002 | YES | NO | Dark — data present, zero queries |
| `rw_detachment_abilities` | 002 | YES | NO | Dark — data present, zero queries |

**Critical finding:** No rules.db schema changes are required for surfacing dark tables. All 12 tables exist and are populated after any sync. v0.2.6 work is: extending `rw_sync_meta` columns, adding override/log tables to `hobbyforge.db`, and surfacing the four dark tables in the UI.

---

## System Overview

### Dual-Database Architecture

```
+-----------------------------------------------------------------------+
|                          UI Layer (React 19)                          |
|  +----------------+  +---------------------+  +--------------------+  |
|  | PlaybookTab    |  | SyncMetadataPanel   |  | OverridesPanel     |  |
|  | (MODIFIED)     |  | (NEW v0.2.6)          |  | (NEW v0.2.6)         |  |
|  +-------+--------+  +----------+----------+  +---------+----------+  |
+----------|--------------------..--------------------------|-----------+
           |         React Query Hooks                      |
+----------|---------------------------------------------------|---------+
|  +-------+------+  +---------------------+  +-------------+---------+  |
|  | useDatasheet |  | useRulesSync        |  | useRulesOverrides     |  |
|  | useRulesSync |  | (MODIFIED v0.2.6)     |  | (NEW v0.2.6)            |  |
|  | Meta (exist) |  |                     |  |                       |  |
|  +--------------+  +----------+----------+  +-------------+---------+  |
+------------------------------|----------------------------|--------------+
                               | Query Modules              |
+------------------------------|----------------------------|--------------+
|  +--------------+  +---------+-----------+  +------------+-----------+  |
|  | datasheets.ts|  | stratagems.ts       |  | rulesOverrides.ts      |  |
|  | (existing)   |  | detachments.ts      |  | (NEW v0.2.6)             |  |
|  |              |  | sharedAbilities.ts  |  |                        |  |
|  |              |  | (NEW v0.2.6)          |  |                        |  |
|  +--------------+  +---------------------+  +------------------------+  |
+--------------------------------------------------------------------------+
           |                                             |
+----------+----------+                      +----------+-----------+
|     rules.db        |                      |    hobbyforge.db     |
|  rw_* tables (all   |                      |  unit_rules_overrides|
|  12 already exist)  |                      |  sync_error_log      |
|  rw_sync_meta       |                      |  (NEW migration 015) |
|  (extended via      |                      |                      |
|   rules_003)        |                      |                      |
+---------------------+                      +----------------------+
         |                                             |
         +-------------------+-------------------------+
                             |
               Tauri plugin-sql + sqlx (Rust)
```

---

## Component Boundaries

### Existing Components (Modify Only)

| Component | File | v0.2.6 Change |
|-----------|------|-------------|
| `useRulesSync` | `src/hooks/useRulesSync.ts` | Extend rowCounts return; add prevVersion capture; invalidate 3 new query keys on success |
| `bulk_sync_rules` + `BulkSyncPayload` | `src-tauri/src/lib.rs` | Extend rw_sync_meta INSERT to write row count columns; write sync_error_log row to hobbyforge.db |
| `get_rules_migrations()` | `src-tauri/src/lib.rs` | Add migration version 3 (rules_003_sync_metadata.sql) |
| `RulesSyncMeta` interface | `src/types/datasheet.ts` | Add row count + duration columns |
| `PlaybookTab` | `src/features/units/PlaybookTab.tsx` | Add stratagem/detachment section below abilities using new hooks |

### New Components (v0.2.6)

| Component | File | Purpose |
|-----------|------|---------|
| `getStratagems()` | `src/db/queries/stratagems.ts` | Query rw_stratagems by faction_id / detachment_id / phase |
| `getDetachments()` | `src/db/queries/detachments.ts` | Query rw_detachments + rw_detachment_abilities by faction_id |
| `getSharedAbilities()` | `src/db/queries/sharedAbilities.ts` | Query rw_abilities by faction_id |
| `getUnitRulesOverrides()` | `src/db/queries/rulesOverrides.ts` | CRUD for unit_rules_overrides in hobbyforge.db |
| `getSyncHistory()` | `src/db/queries/syncHistory.ts` | Read sync_error_log + extended rw_sync_meta |
| `useStratagems()` | `src/hooks/useStratagems.ts` | React Query wrapper; staleTime Infinity; invalidated by sync |
| `useDetachments()` | `src/hooks/useDetachments.ts` | React Query wrapper; staleTime Infinity |
| `useSharedAbilities()` | `src/hooks/useSharedAbilities.ts` | React Query wrapper; staleTime Infinity |
| `useRulesOverrides()` | `src/hooks/useRulesOverrides.ts` | React Query wrapper; mutations for upsert/delete |
| `useSyncHistory()` | `src/hooks/useSyncHistory.ts` | React Query wrapper; staleTime 0 (always fresh) |
| `UnitRulesOverride` | `src/types/rulesOverrides.ts` | Interface + CreateInput + UpdateInput types |
| `SyncLogEntry` | `src/types/rulesOverrides.ts` | Interface matching sync_error_log columns |
| `SyncMetadataPanel` | `src/features/rules/SyncMetadataPanel.tsx` | Row counts, version, freshness, error history |
| `OverridesPanel` | `src/features/rules/OverridesPanel.tsx` | CRUD UI for unit_rules_overrides within PlaybookTab |
| `VersionComparisonPanel` | `src/features/rules/VersionComparisonPanel.tsx` | Prev vs current version, row count deltas |
| `StratagemsList` | `src/features/rules/StratagemsList.tsx` | Stratagem cards grouped by phase/type |
| `DetachmentAbilitiesPanel` | `src/features/rules/DetachmentAbilitiesPanel.tsx` | Detachment ability display |

---

## New Schema

### rules.db Migration 003 (rules_003_sync_metadata.sql)

Extends the single `rw_sync_meta` row with row count tracking per table and sync duration. No new tables — only ALTER TABLE:

```sql
ALTER TABLE rw_sync_meta ADD COLUMN source_url TEXT;
ALTER TABLE rw_sync_meta ADD COLUMN factions_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN datasheets_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN models_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN abilities_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN keywords_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN wargear_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN stratagems_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN detachments_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN detachment_abilities_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN shared_abilities_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN sync_duration_ms INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN had_errors INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rw_sync_meta ADD COLUMN prev_wahapedia_version TEXT;
```

### hobbyforge.db Migration 015 (015_rules_overrides.sql)

Two new tables for override persistence and sync error logging:

```sql
-- Manual user overrides that survive re-sync.
-- Keyed by (unit_id, field). UNIQUE constraint enforces one override per field per unit.
-- field examples: 'points', 'T', 'W', 'Sv', 'keywords', 'ability_reminder'
CREATE TABLE IF NOT EXISTS unit_rules_overrides (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id         INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    field           TEXT NOT NULL,
    value           TEXT NOT NULL,
    note            TEXT,
    override_source TEXT NOT NULL DEFAULT 'manual',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(unit_id, field)
);

-- One row per sync attempt. Written before and updated after each sync.
CREATE TABLE IF NOT EXISTS sync_error_log (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    synced_at           TEXT NOT NULL DEFAULT (datetime('now')),
    outcome             TEXT NOT NULL,  -- 'success' | 'partial' | 'failure'
    wahapedia_version   TEXT,
    error_message       TEXT,
    failed_table        TEXT,
    duration_ms         INTEGER,
    details             TEXT  -- JSON blob for per-table row counts or partial failure map
);
```

### Why No Snapshot Table

A snapshot of all rw_* rows before each sync for line-level diffing would require duplicating ~5000+ rows per sync. For a personal tool, version string delta + row count comparison is sufficient. The `prev_wahapedia_version` column on `rw_sync_meta` captures what changed at the version level. Row count deltas per table are stored in `sync_error_log.details` as JSON. Full content diff deferred.

---

## Data Flow Changes

### Modified Sync Flow

```
useRulesSync.mutationFn()
  1. Capture prevVersion from useRulesSyncMeta cache (before fetch)
  2. Fetch 12 CSVs in parallel — unchanged
  3. Parse + strip HTML — unchanged
  4. invoke("bulk_sync_rules", {
       ...existing payload,
       row_counts: { factions: N, datasheets: N, ... }  // NEW
     })

     Rust bulk_sync_rules:
       a. Resolve hobbyforge.db path, open second sqlx connection
       b. INSERT into sync_error_log (outcome: 'in-progress', synced_at: now)
       c. DELETE 11 rw_* tables — unchanged
       d. INSERT all rows — unchanged
       e. INSERT OR REPLACE rw_sync_meta WITH extended columns (row counts, duration, prev_version)
       f. UPDATE sync_error_log SET outcome = 'success', duration_ms = elapsed
       g. COMMIT rules.db transaction
       h. Update hobbyforge.db sync_error_log via separate connection (outside transaction)

  5. Return { wahapediaVersion, rowCounts, prevVersion }

onSuccess:
  qc.invalidateQueries({ queryKey: RULES_SYNC_META_KEY })
  qc.invalidateQueries({ queryKey: ["datasheets-by-faction"] })
  qc.invalidateQueries({ queryKey: ["datasheet"] })
  qc.invalidateQueries({ queryKey: ["stratagems"] })           // NEW
  qc.invalidateQueries({ queryKey: ["detachments"] })          // NEW
  qc.invalidateQueries({ queryKey: ["shared-abilities"] })     // NEW
  qc.invalidateQueries({ queryKey: ["sync-history"] })         // NEW
```

### Override Persistence Flow

```
PlaybookTab → OverridesPanel
  useRulesOverrides(unitId)
    → getUnitRulesOverrides(unitId)  // hobbyforge.db
    → returns [{ field: 'T', value: '5', note: 'Updated in Balance Dataslate' }]

  User edits override:
    useUpsertRulesOverride().mutate({ unit_id, field, value, note })
      → INSERT OR REPLACE unit_rules_overrides
      → invalidate ["rules-overrides", unitId]

  PlaybookTab stat display:
    const override = overrides?.find(o => o.field === 'T');
    const displayT = override?.value ?? ds?.models[0]?.T?.toString() ?? '-';
    // Show badge if override is active

Override survives re-sync:
  → lives in hobbyforge.db, not rules.db
  → DELETE FROM rw_* only touches rules.db
  → override row untouched
```

### Version Comparison Flow

```
SyncMetadataPanel
  useSyncHistory() → sync_error_log (last 10 entries)
  useRulesSyncMeta() → rw_sync_meta (current + prev version)

  Display:
    - Current: wahapedia_version, last_sync_at
    - Previous: prev_wahapedia_version (if different → "VERSION CHANGED" badge)
    - Row counts per table (e.g. "Datasheets: 2,851")
    - If had_errors = 1 → warning indicator
    - Error log entries with timestamps and outcome

VersionComparisonPanel (shown when version changed):
  - Old version string, new version string
  - Row count delta per table from sync_error_log.details JSON
  - "Review your overrides — data may have changed" advisory
  - Links to OverridesPanel per unit
```

---

## Architectural Patterns

### Pattern 1: Cross-DB Override Resolution at Hook Layer

**What:** Fields that can have both a synced value (rules.db) and a user override (hobbyforge.db) are resolved in the TypeScript hook, not in SQL. The hook fetches both and merges.

**When to use:** Any field in PlaybookTab where the user can override the imported value.

**Trade-offs:** One additional DB call per unit view to read overrides. Acceptable at single-user local scale.

**Example:**
```typescript
// In PlaybookTab, resolve T stat:
const { data: ds } = useDatasheet(unitId);
const { data: overrides } = useRulesOverrides(unitId);
const tOverride = overrides?.find(o => o.field === 'T');
const displayT = tOverride?.value ?? ds?.models[0]?.T?.toString() ?? '-';
```

### Pattern 2: Rust Owns All Sync Writes, TypeScript Owns All Reads

**What:** No sync data is ever written from TypeScript. All multi-table writes for sync go through `bulk_sync_rules` in Rust using a real sqlx transaction. TypeScript reads via `getRulesDb()` (tauri-plugin-sql) after the fact.

**When to use:** Always. This boundary is a hard architectural rule, not a preference.

**Trade-offs:** The hobbyforge.db sync_error_log write from inside Rust requires a second sqlx connection to a different DB file. The pattern is identical — resolve app_data_dir, build URL for hobbyforge.db, write the log row outside the rules.db transaction.

### Pattern 3: Dark Table Surfacing is Query + Hook + Component Only

**What:** rw_abilities, rw_stratagems, rw_detachments, rw_detachment_abilities are already populated. Surfacing them requires no migration. The work is purely: new query functions + hooks + UI components.

**When to use:** Phase 44. The "Extended Rules Schema" phase name is misleading — the rules.db schema is already complete for these tables.

**Trade-offs:** None. Purely additive, no migration risk.

### Pattern 4: UNIQUE(unit_id, field) for Single-Value Overrides

**What:** unit_rules_overrides uses INSERT OR REPLACE on a UNIQUE(unit_id, field) constraint. One override per field per unit. Multi-value fields (like keywords) store a JSON array in the TEXT value column.

**When to use:** All override upserts.

**Trade-offs:** JSON in TEXT is not normalized, but avoids a many-to-many table for a personal tool at negligible scale. Acceptable.

### Pattern 5: staleTime Infinity for All rules.db Queries

**What:** All hooks reading from rules.db use `staleTime: Infinity`. Cache is invalidated explicitly after sync via `qc.invalidateQueries`. This matches the existing `useDatasheet`, `useRulesSyncMeta`, and `useDatasheetsByFaction` behavior.

**When to use:** All new hooks for stratagems, detachments, shared abilities.

**Trade-offs:** If user closes and reopens the app, React Query cache is cold — queries run on first access. This is correct behavior: data is always fresh from DB on app start.

---

## Integration Points Summary

### Existing Features That Gain Data (No API Change)

| Feature | What It Gains |
|---------|---------------|
| PlaybookTab | Stratagem list section, detachment abilities section, override badges on stats |
| Army Lists (v2.7) | Detachment picker backed by rw_detachments (data already present after v0.2.6 sync) |
| Game Day Mode (v2.8) | Stratagems grouped by phase (data already present after v0.2.6 sync) |

### Cache Key Namespace — New Keys for v0.2.6

| Key | Type | Invalidated By |
|-----|------|----------------|
| `["stratagems"]` | prefix | sync success |
| `["stratagems", factionId]` | specific | sync success |
| `["detachments"]` | prefix | sync success |
| `["detachments", factionId]` | specific | sync success |
| `["shared-abilities"]` | prefix | sync success |
| `["shared-abilities", factionId]` | specific | sync success |
| `["rules-overrides", unitId]` | specific | upsert/delete override |
| `["sync-history"]` | prefix | sync attempt (success or failure) |

---

## Build Order (Phase-by-Phase)

### Phase 42 — Architecture Audit (This Document, No Code)

Confirm: all 12 rules.db tables exist and are synced. 4 tables are dark. rw_sync_meta needs extension. hobbyforge.db needs 2 new tables. No rules.db structural changes needed for dark table surfacing.

### Phase 43 — Extended Rules Schema

1. Write `src-tauri/migrations/rules_003_sync_metadata.sql` (ALTER rw_sync_meta)
2. Write `src-tauri/migrations/015_rules_overrides.sql` (CREATE 2 tables in hobbyforge.db)
3. Register rules_003 in `get_rules_migrations()` in lib.rs
4. Register 015 in `get_migrations()` in lib.rs
5. Extend `RulesSyncMeta` TypeScript interface in `src/types/datasheet.ts`
6. Create `src/types/rulesOverrides.ts` with UnitRulesOverride + SyncLogEntry
7. Smoke test: `pnpm tauri dev`, verify new columns and tables exist

Schema first. Types derive from schema. No hooks or UI until schema compiles and runs.

### Phase 44 — Sync Pipeline Extension + Dark Table Queries

1. Extend Rust `bulk_sync_rules` to write row count columns to rw_sync_meta
2. Add hobbyforge.db sync_error_log write in Rust (separate sqlx connection)
3. Update `useRulesSync.ts` onSuccess to invalidate 4 new query keys
4. Create `src/db/queries/stratagems.ts`, `detachments.ts`, `sharedAbilities.ts`
5. Create `src/hooks/useStratagems.ts`, `useDetachments.ts`, `useSharedAbilities.ts`
6. Wire `StratagemsList` + `DetachmentAbilitiesPanel` into PlaybookTab
7. Unit tests for new query functions

### Phase 45 — Sync Metadata & Import Tracking

1. Create `src/db/queries/syncHistory.ts` (read sync_error_log + rw_sync_meta)
2. Create `src/hooks/useSyncHistory.ts`
3. Build `SyncMetadataPanel` with freshness logic (pure utility function, testable)
4. Wire into PlaybookTab or dedicated Rules settings section
5. Unit tests for freshness computation

### Phase 46 — Manual Overrides & Version Comparison

1. Create `src/db/queries/rulesOverrides.ts` (CRUD)
2. Create `src/hooks/useRulesOverrides.ts` (useRulesOverrides + useUpsertRulesOverride + useDeleteRulesOverride)
3. Build `OverridesPanel` component
4. Integrate override resolution in PlaybookTab stat display
5. Build `VersionComparisonPanel`
6. Wire version comparison into SyncMetadataPanel
7. Unit tests for override CRUD + resolution logic + version comparison computation

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Writing Overrides to rules.db

**What people do:** UPDATE rw_datasheet_models SET T = 5 to "fix" an imported stat.

**Why it's wrong:** Every sync runs `DELETE FROM rw_datasheet_models`. Override silently destroyed with no warning.

**Do this instead:** All user-authored data lives in hobbyforge.db via unit_rules_overrides. Resolution happens in TypeScript at read time.

### Anti-Pattern 2: Multi-Statement Transaction from TypeScript

**What people do:** Loop over `getRulesDb().execute()` calls expecting atomicity.

**Why it's wrong:** tauri-plugin-sql auto-commits every execute(). Network failure mid-loop leaves rules.db partially written.

**Do this instead:** All sync writes go through bulk_sync_rules in Rust (real sqlx transaction).

### Anti-Pattern 3: Snapshot Table for Full Content Diff

**What people do:** Mirror all rw_* rows before sync into snapshot tables for row-level diffing.

**Why it's wrong:** Full Wahapedia dataset is 5000+ rows across 11 tables. Doubles storage. Creates migration complexity for a personal tool. Row-level diff is overkill.

**Do this instead:** Compare wahapedia_version strings + row count deltas. Show "4 new datasheets in this sync." Full content diff deferred.

### Anti-Pattern 4: Querying Dark Tables from Components Directly

**What people do:** Call getRulesDb().select() inside a component to get stratagems.

**Why it's wrong:** Bypasses React Query caching and the query -> hook -> component contract. Every render triggers a DB call.

**Do this instead:** stratagems.ts query module -> useStratagems.ts hook -> component. No exceptions.

---

## Sources

- `src-tauri/src/lib.rs` — Full Rust backend, BulkSyncPayload, bulk_sync_rules (read 2026-05-07)
- `src/hooks/useRulesSync.ts` — Current sync hook (read 2026-05-07)
- `src/db/rules-client.ts` — rules.db singleton (read 2026-05-07)
- `src/db/queries/datasheets.ts` — Current rules query module (read 2026-05-07)
- `src/types/datasheet.ts` — Current rules TypeScript types (read 2026-05-07)
- `src/hooks/useDatasheet.ts` — Current datasheet hooks (read 2026-05-07)
- `src-tauri/migrations/rules_001_schema.sql` — rules.db base schema (read 2026-05-07)
- `src-tauri/migrations/rules_002_wargear_abilities.sql` — Extended rules schema (read 2026-05-07)
- `.planning/V3_ARCHITECTURE_AUDIT.md` — Prior architecture audit (read 2026-05-07)
- `.planning/milestones/v3.0-ROADMAP.md` — v0.2.6 requirements (read 2026-05-07)
- `.planning/milestones/v3.0-PHASES.md` — Phase breakdown (read 2026-05-07)

---

*Architecture research for: HobbyForge v0.2.6 Rules Sync 2.0 / Rules Data Hub*
*Researched: 2026-05-07*
*Confidence: HIGH — all findings based on direct codebase reads, zero training-data assumptions*

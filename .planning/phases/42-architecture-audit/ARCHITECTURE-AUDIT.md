# Architecture Audit: Rules Sync Pipeline
**Phase:** 42 — Architecture Audit
**Date:** 2026-05-08
**Scope:** Read-only code-path inspection — no code changes
**Purpose:** Reference document for Phases 43-46 (v2.6 Rules Sync 2.0 / Rules Data Hub)

---

## 1. Schema State

*AUDIT-01 — Confirm all rw_* extended tables exist and are populated after sync.*

### Migration File Inventory

All 12 rw_* tables are defined across two migration files. Both migrations are applied at app start via `tauri-plugin-sql` (registered in `src-tauri/src/lib.rs` `get_rules_migrations()`).

---

#### Migration 001: `src-tauri/migrations/rules_001_schema.sql` (7 tables)

**rw_factions**
```sql
CREATE TABLE IF NOT EXISTS rw_factions (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL
);
```
- PK: `id TEXT`
- No FK references

**rw_sources**
```sql
CREATE TABLE IF NOT EXISTS rw_sources (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    type         TEXT,
    edition      INTEGER,
    version      TEXT,
    errata_date  TEXT
);
```
- PK: `id TEXT`
- No FK references

**rw_datasheets**
```sql
CREATE TABLE IF NOT EXISTS rw_datasheets (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    faction_id          TEXT REFERENCES rw_factions(id),
    source_id           TEXT,
    role                TEXT,
    damaged_w           TEXT,
    damaged_description TEXT
);
```
- PK: `id TEXT`
- FK: `faction_id REFERENCES rw_factions(id)` (no ON DELETE clause)
- `source_id` is TEXT without a formal FK reference

**rw_datasheet_models**
```sql
CREATE TABLE IF NOT EXISTS rw_datasheet_models (
    datasheet_id  TEXT NOT NULL REFERENCES rw_datasheets(id) ON DELETE CASCADE,
    line          INTEGER NOT NULL,
    name          TEXT,
    M             TEXT,
    T             INTEGER,
    Sv            TEXT,
    inv_sv        TEXT,
    W             INTEGER,
    Ld            TEXT,
    OC            INTEGER,
    PRIMARY KEY (datasheet_id, line)
);
```
- PK: composite `(datasheet_id, line)`
- FK: `datasheet_id REFERENCES rw_datasheets(id) ON DELETE CASCADE`
- Note: `M`, `Sv`, `Ld` stored as TEXT (Wahapedia includes suffixes like `"6\""`, `"3+"`, `"6+"`)

**rw_datasheet_abilities**
```sql
CREATE TABLE IF NOT EXISTS rw_datasheet_abilities (
    datasheet_id  TEXT NOT NULL REFERENCES rw_datasheets(id) ON DELETE CASCADE,
    line          INTEGER NOT NULL,
    ability_id    TEXT,
    name          TEXT NOT NULL,
    description   TEXT,
    type          TEXT,
    parameter     TEXT,
    PRIMARY KEY (datasheet_id, line)
);
```
- PK: composite `(datasheet_id, line)`
- FK: `datasheet_id REFERENCES rw_datasheets(id) ON DELETE CASCADE`

**rw_datasheet_keywords** *(anomaly — see note below)*
```sql
CREATE TABLE IF NOT EXISTS rw_datasheet_keywords (
    datasheet_id       TEXT NOT NULL REFERENCES rw_datasheets(id) ON DELETE CASCADE,
    keyword            TEXT NOT NULL,
    is_faction_keyword INTEGER NOT NULL DEFAULT 0
);
```
- **NO PRIMARY KEY**
- **NO UNIQUE constraint**
- FK: `datasheet_id REFERENCES rw_datasheets(id) ON DELETE CASCADE`
- `is_faction_keyword` stored as `0|1` INTEGER (Wahapedia sends `"true"`/`"false"`, converted at sync time)
- **Anomaly:** No deduplication guard. Rust uses plain `INSERT` (not `INSERT OR IGNORE`). Within a single sync, if Wahapedia CSV contains duplicate `(datasheet_id, keyword)` rows, both would be inserted. The full DELETE on re-sync prevents accumulation across syncs, but intra-sync duplicates are possible. **Flag: Phase 44 SYNC-03 validation concern.**

**rw_sync_meta**
```sql
CREATE TABLE IF NOT EXISTS rw_sync_meta (
    id                INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_at      TEXT,
    wahapedia_version TEXT
);
```
- PK: `id INTEGER CHECK(id = 1)` — singleton row design
- Only stores `last_sync_at` and `wahapedia_version`
- **Gap:** Does NOT store per-table row counts, source URL, or edition. **Flag: Phase 45 META-01/META-02/META-03.**

---

#### Migration 002: `src-tauri/migrations/rules_002_wargear_abilities.sql` (5 tables)

**rw_datasheets_wargear**
```sql
CREATE TABLE IF NOT EXISTS rw_datasheets_wargear (
    datasheet_id    TEXT NOT NULL,
    line            INTEGER NOT NULL DEFAULT 1,
    line_in_wargear INTEGER NOT NULL DEFAULT 1,
    dice            TEXT,
    name            TEXT NOT NULL,
    description     TEXT,
    range           TEXT,
    type            TEXT,
    A               TEXT,
    BS_WS           TEXT,
    S               TEXT,
    AP              TEXT,
    D               TEXT,
    PRIMARY KEY (datasheet_id, line, line_in_wargear)
);
```
- PK: composite `(datasheet_id, line, line_in_wargear)`
- No formal FK on `datasheet_id` (deliberate — wargear synced independently)
- `description` contains HTML-stripped special rules text

**rw_abilities** *(shared faction-wide abilities from Abilities.csv)*
```sql
CREATE TABLE IF NOT EXISTS rw_abilities (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    legend      TEXT,
    faction_id  TEXT,
    description TEXT
);
```
- PK: `id TEXT`
- `faction_id` is TEXT without a formal FK reference

**rw_stratagems**
```sql
CREATE TABLE IF NOT EXISTS rw_stratagems (
    id            TEXT PRIMARY KEY,
    faction_id    TEXT,
    name          TEXT NOT NULL,
    type          TEXT,
    cp_cost       TEXT,
    legend        TEXT,
    turn          TEXT,
    phase         TEXT,
    detachment    TEXT,
    detachment_id TEXT,
    description   TEXT
);
```
- PK: `id TEXT`
- `faction_id` and `detachment_id` are TEXT without formal FK references

**rw_detachments**
```sql
CREATE TABLE IF NOT EXISTS rw_detachments (
    id         TEXT PRIMARY KEY,
    faction_id TEXT,
    name       TEXT NOT NULL,
    legend     TEXT,
    type       TEXT
);
```
- PK: `id TEXT`
- `faction_id` is TEXT without a formal FK reference

**rw_detachment_abilities**
```sql
CREATE TABLE IF NOT EXISTS rw_detachment_abilities (
    id            TEXT PRIMARY KEY,
    faction_id    TEXT,
    name          TEXT NOT NULL,
    legend        TEXT,
    description   TEXT,
    detachment    TEXT,
    detachment_id TEXT
);
```
- PK: `id TEXT`
- `faction_id` and `detachment_id` are TEXT without formal FK references

---

### Verification Checklist

Code-path inspection confirms every table has DDL, a Rust DELETE pass, a Rust INSERT loop, and a TypeScript payload field.

| Table | DDL | Rust DELETE | Rust INSERT | TS Payload Field |
|-------|-----|-------------|-------------|------------------|
| rw_factions | rules_001 | YES | YES | `factions` |
| rw_sources | rules_001 | YES | YES | `sources` |
| rw_datasheets | rules_001 | YES | YES | `datasheets` |
| rw_datasheet_models | rules_001 | YES | YES (INSERT OR IGNORE) | `models` |
| rw_datasheet_abilities | rules_001 | YES | YES (INSERT OR IGNORE) | `abilities` |
| rw_datasheet_keywords | rules_001 | YES | YES (plain INSERT) | `keywords` |
| rw_sync_meta | rules_001 | N/A (INSERT OR REPLACE singleton) | YES | `last_sync_at`, `wahapedia_version` |
| rw_datasheets_wargear | rules_002 | YES | YES (INSERT OR IGNORE) | `wargear` |
| rw_abilities | rules_002 | YES | YES (INSERT OR IGNORE) | `shared_abilities` |
| rw_stratagems | rules_002 | YES | YES (INSERT OR IGNORE) | `stratagems` |
| rw_detachments | rules_002 | YES | YES (INSERT OR IGNORE) | `detachments` |
| rw_detachment_abilities | rules_002 | YES | YES (INSERT OR IGNORE) | `detachment_abilities` |

**All 12 tables exist and are populated. The sync WRITE path is complete.**

---

## 2. Sync Data Flow

*AUDIT-02 — Document the full sync data flow from TypeScript fetch to Rust transaction to SQLite.*

```
TypeScript (useRulesSync.ts)
        |
        | Step 1: HTTP fetch (12 CSV files)
        v
Step 1 ─────────────────────────────────────────────────
        |
        | Step 2: Parse + HTML strip
        v
Step 2 ─────────────────────────────────────────────────
        |
        | Step 3: Tauri IPC invoke("bulk_sync_rules")
        v
Rust (lib.rs bulk_sync_rules)
        |
        | Step 4: SQLite transaction
        v
Step 4 ─────────────────────────────────────────────────
        |
        | Ok(()) — no row counts returned
        v
TypeScript (useRulesSync.ts)
        |
        | Step 5: Response + cache invalidation
        v
Step 5 ─────────────────────────────────────────────────
```

### Step 1 — CSV Fetch (`src/hooks/useRulesSync.ts`)

- `Promise.all` of 12 `fetchCsv()` calls via `@tauri-apps/plugin-http`
- Base URL: `https://wahapedia.ru/wh40k10ed/{filename}`
- **12 files fetched:**
  - `Factions.csv`
  - `Source.csv`
  - `Datasheets.csv`
  - `Datasheets_models.csv`
  - `Datasheets_abilities.csv`
  - `Datasheets_keywords.csv`
  - `Datasheets_wargear.csv`
  - `Abilities.csv`
  - `Stratagems.csv`
  - `Detachments.csv`
  - `Detachment_abilities.csv`
  - `Last_update.csv`
- Custom `User-Agent` header set to a standard Chrome string to avoid Wahapedia bot-blocking (`Mozilla/5.0 ...`)
- `fetchCsv()` throws on non-200 responses

### Step 2 — Parsing + HTML Stripping (`src/hooks/useRulesSync.ts`)

- `parseWahapediaCsv()` converts each raw CSV string to `Record<string,string>[]`
- `stripHtml()` applied selectively before Rust invoke:
  - `datasheets.damaged_description`
  - `abilities.name` + `abilities.description` (datasheet abilities)
  - `wargear.description`
  - `sharedAbils.description` (shared faction abilities)
  - `stratagems.description` + `stratagems.legend`
  - `detachAbils.description` + `detachAbils.legend` (detachment abilities)
- `parseLastUpdate()` extracts `wahapediaVersion` from line 2 of `Last_update.csv`

### Step 3 — Tauri IPC (`src/hooks/useRulesSync.ts` → `src-tauri/src/lib.rs`)

- `invoke("bulk_sync_rules", { payload: BulkSyncPayload })`
- `BulkSyncPayload` is a Rust struct (`#[derive(serde::Deserialize)]`) with 13 fields:

```rust
pub struct BulkSyncPayload {
    factions: Vec<JsRow>,
    sources: Vec<JsRow>,
    datasheets: Vec<JsRow>,
    models: Vec<JsRow>,
    abilities: Vec<JsRow>,          // → rw_datasheet_abilities
    keywords: Vec<JsRow>,
    wargear: Vec<JsRow>,            // → rw_datasheets_wargear
    shared_abilities: Vec<JsRow>,   // → rw_abilities
    stratagems: Vec<JsRow>,         // → rw_stratagems
    detachments: Vec<JsRow>,        // → rw_detachments
    detachment_abilities: Vec<JsRow>, // → rw_detachment_abilities
    last_sync_at: String,
    wahapedia_version: String,
}
```

- Payload serialized as JSON over the Tauri IPC bridge

### Step 4 — Rust Transaction (`src-tauri/src/lib.rs` `bulk_sync_rules`)

- Opens a **direct sqlx connection** (NOT the `tauri-plugin-sql` pool) — required for real transactions
- `SqliteConnectOptions`: WAL mode, 30s `busy_timeout`, `create_if_missing = false`
- `PRAGMA foreign_keys = OFF` — allows DELETE in any order without FK violations
- `BEGIN TRANSACTION`
- **DELETE all 11 rw_* data tables** (in this order):
  - `rw_datasheet_keywords`
  - `rw_datasheet_abilities`
  - `rw_datasheet_models`
  - `rw_datasheets_wargear`
  - `rw_datasheets`
  - `rw_sources`
  - `rw_factions`
  - `rw_abilities`
  - `rw_stratagems`
  - `rw_detachment_abilities`
  - `rw_detachments`
- **INSERT loops** for all 11 tables (see verification checklist for INSERT variant per table)
- `INSERT OR REPLACE INTO rw_sync_meta (id=1, last_sync_at, wahapedia_version)` — singleton upsert
- `COMMIT`

### Step 5 — Response + Cache Invalidation (`src/hooks/useRulesSync.ts`)

- `bulk_sync_rules` returns `Result<(), String>` — **no row counts returned from Rust**
- TypeScript constructs `rowCounts` from local array `.length` values (computed before Rust invoke):
  - **Counted (9 tables):** `factions`, `sources`, `datasheets`, `models`, `abilities`, `keywords`, `wargear`, `stratagems`, `detachments`
  - **NOT counted:** `shared_abilities` and `detachment_abilities`
  - **Gap SYNC-02 (Phase 44):** Two synced tables are excluded from `rowCounts`
- Returns `{ wahapediaVersion, rowCounts }`
- `onSuccess` invalidates only **3 query keys**:
  - `RULES_SYNC_META_KEY` (`["rules-sync-meta"]`)
  - `["datasheets-by-faction"]`
  - `["datasheet"]`
  - **Gap SYNC-05 (Phase 44):** No invalidation for `stratagems-by-faction`, `detachments-by-faction`, `detachment-abilities`, `shared-abilities-by-faction` — hooks added in Phase 43 will have stale caches until SYNC-05 is fixed

### Critical Gaps Identified in Step 5

**SYNC-01 (Phase 44):** `bulk_sync_rules` returns `()` (void). The `rowCounts` displayed in the post-sync confirmation are computed from TypeScript array lengths — they reflect what was sent to Rust, NOT what was actually inserted into SQLite. If any INSERTs failed silently (e.g. via `INSERT OR IGNORE` skipping duplicates), the displayed counts would be inaccurate. Phase 44 must change `bulk_sync_rules` to return actual per-table counts from the Rust side.

**SYNC-05 (Phase 44):** After Phase 43 adds hooks for stratagems, detachments, detachment_abilities, and shared abilities, those query keys must also be invalidated in `useRulesSync.onSuccess`. Currently the invalidation list is incomplete for the extended tables.

---

## 3. TypeScript Gaps

*AUDIT-03 — Identify all TypeScript type, query function, and React Query hook gaps for the extended rules tables.*

Gaps are organized by the downstream phase that will close them.

---

### Phase 43 Gaps — Extended Rules Read Layer

Phase 43's job is to make the already-synced extended data queryable from TypeScript. The WRITE path is complete; the READ path is entirely missing for 3 table groups.

#### Types MISSING — add to `src/types/datasheet.ts`

Note: `RwAbility` already exists and correctly maps `rw_abilities` (`id`, `name`, `legend`, `faction_id`, `description`). No new type is needed for shared abilities.

```typescript
// RwStratagem — maps rw_stratagems (11 columns)
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

// RwDetachment — maps rw_detachments (5 columns)
export interface RwDetachment {
  id: string;
  faction_id: string | null;
  name: string;
  legend: string | null;
  type: string | null;
}

// RwDetachmentAbility — maps rw_detachment_abilities (7 columns)
export interface RwDetachmentAbility {
  id: string;
  faction_id: string | null;
  name: string;
  legend: string | null;
  description: string | null;
  detachment: string | null;
  detachment_id: string | null;
}
```

#### Query Functions MISSING — create in new file `src/db/queries/rulesExtended.ts`

- `getStratagemsByFaction(factionId: string): Promise<RwStratagem[]>`
  — `SELECT * FROM rw_stratagems WHERE faction_id = $1 ORDER BY name`
- `getDetachmentsByFaction(factionId: string): Promise<RwDetachment[]>`
  — `SELECT * FROM rw_detachments WHERE faction_id = $1 ORDER BY name`
- `getDetachmentAbilitiesByDetachment(detachmentId: string): Promise<RwDetachmentAbility[]>`
  — `SELECT * FROM rw_detachment_abilities WHERE detachment_id = $1 ORDER BY name`
- `getSharedAbilitiesByFaction(factionId: string): Promise<RwAbility[]>`
  — `SELECT * FROM rw_abilities WHERE faction_id = $1 ORDER BY name`

#### React Query Hooks MISSING — create in new file `src/hooks/useRulesExtended.ts`

All hooks follow the same pattern as `useDatasheetsByFaction`: `staleTime: Infinity`, `enabled` only when param is not `undefined`, return empty array when disabled.

- `useStratagemsByFaction(factionId: string | undefined)`
  — queryKey: `["stratagems-by-faction", factionId]`
- `useDetachmentsByFaction(factionId: string | undefined)`
  — queryKey: `["detachments-by-faction", factionId]`
- `useDetachmentAbilitiesByDetachment(detachmentId: string | undefined)`
  — queryKey: `["detachment-abilities", detachmentId]`
- `useSharedAbilitiesByFaction(factionId: string | undefined)`
  — queryKey: `["shared-abilities-by-faction", factionId]`

---

### Phase 44 Gaps — Sync Pipeline Hardening

- **SYNC-01:** `bulk_sync_rules` returns `()` — must be changed to return per-table INSERT counts so `rowCounts` in TypeScript reflects actual DB state, not client-side array lengths
- **SYNC-02:** `rowCounts` in `useRulesSync` omits `shared_abilities` and `detachment_abilities` counts — both tables are synced but not counted
- **SYNC-03:** CSV column header validation before insertion — `rw_datasheet_keywords` has no UNIQUE constraint, making it vulnerable to intra-sync duplicates if Wahapedia CSV has duplicate rows
- **SYNC-04:** Sync errors need a persistent log table (see Section 4 — `sync_errors` in hobbyforge.db)
- **SYNC-05:** `useRulesSync.onSuccess` must add 4 additional invalidations after Phase 43 hooks exist:
  ```typescript
  qc.invalidateQueries({ queryKey: ["stratagems-by-faction"], exact: false });
  qc.invalidateQueries({ queryKey: ["detachments-by-faction"], exact: false });
  qc.invalidateQueries({ queryKey: ["detachment-abilities"], exact: false });
  qc.invalidateQueries({ queryKey: ["shared-abilities-by-faction"], exact: false });
  ```

---

### Phase 45 Gaps — Sync Metadata

- **META-01:** `rw_sync_meta` needs new columns for per-table row counts (see Section 4)
- **META-02:** TypeScript `RulesSyncMeta` type needs updating to include new count columns
- **META-03:** `rw_sync_meta` needs `source_url` and `edition` columns
- **META-04:** New `sync_errors` table in hobbyforge.db for persistent error history
- **META-05:** Freshness badge logic — compare `last_sync_at` to current date to show "data is N days old" warning
- **META-06:** New `rules_snapshot` table in hobbyforge.db for pre-sync change detection

---

### Phase 46 Gaps — Overrides

- **OVRD-01 to OVRD-04:** New `unit_overrides` table in hobbyforge.db for user-editable points, stats, keywords, and abilities (see Section 4)
- **OVRD-05:** UI changes to visually distinguish overridden values from synced values — no new code gaps; pure UI work
- **OVRD-06 and OVRD-07:** Override change detection — depends on `rules_snapshot` from Phase 45

---

## 4. Migration Proposal

*AUDIT-04 — Propose migration plan for sync_meta extensions and new tables for Phases 45-46.*

> **CRITICAL CONSTRAINT:** rules.db is fully destroyed (all rows DELETEd) on every sync in a single transaction. Any persistent data — error logs, snapshots, user overrides — MUST live in hobbyforge.db. Cross-database foreign keys are not supported in SQLite. References to rules.db entities use TEXT id copies, NOT FK references. This constraint governs every table placement decision below.

Detail level: table name + column sketch + rationale. Full CREATE TABLE DDL is each implementing phase's responsibility.

---

### Group A — rules.db Extensions (rebuilt each sync)

These tables live in rules.db and are emptied on every sync, so they can only hold current-sync state, not history.

```
Table: rw_sync_meta (EXISTING — extend via ALTER TABLE in new migration)
Purpose: Track per-sync metadata including row counts from the actual Rust INSERT pass
Phase: 45
New columns to ADD:
  - source_url TEXT           — base URL synced from (e.g. "https://wahapedia.ru/wh40k10ed")
  - edition TEXT              — Wahapedia edition identifier
  - factions_count INTEGER    — rows inserted into rw_factions
  - datasheets_count INTEGER  — rows inserted into rw_datasheets
  - models_count INTEGER      — rows inserted into rw_datasheet_models
  - abilities_count INTEGER   — rows inserted into rw_datasheet_abilities
  - keywords_count INTEGER    — rows inserted into rw_datasheet_keywords
  - wargear_count INTEGER     — rows inserted into rw_datasheets_wargear
  - shared_abilities_count INTEGER — rows inserted into rw_abilities
  - stratagems_count INTEGER  — rows inserted into rw_stratagems
  - detachments_count INTEGER — rows inserted into rw_detachments
  - detachment_abilities_count INTEGER — rows inserted into rw_detachment_abilities
Rationale: Rust can count actual INSERT successes and write them here inside the same
transaction. TypeScript reads this via getRulesSyncMeta() for accurate post-sync display
(META-01/META-02). Replaces the current client-side array length approximations (SYNC-01).
```

---

### Group B — hobbyforge.db New Tables (persist across re-syncs)

These tables live in hobbyforge.db and survive sync cycles. They reference rules.db entities via TEXT id copies — not FK references.

```
Table: sync_errors (hobbyforge.db — NEW)
Purpose: Persistent sync error history with timestamp (META-04)
Phase: 45
Key columns:
  - id INTEGER PRIMARY KEY AUTOINCREMENT
  - occurred_at TEXT NOT NULL  — ISO 8601 timestamp
  - error_type TEXT NOT NULL   — e.g. "fetch_failed", "parse_error", "insert_error"
  - message TEXT NOT NULL      — human-readable error description
  - wahapedia_version TEXT     — version at time of error (may be null if fetch failed)
  - table_name TEXT            — which table the error occurred on (null for global errors)
Rationale: Must be in hobbyforge.db — rules.db is deleted on each sync. Error history
must survive app restarts and re-syncs so users can see a history of failed sync attempts.
```

```
Table: rules_snapshot (hobbyforge.db — NEW)
Purpose: Pre-sync snapshot for change detection (META-06, OVRD-06, OVRD-07)
Phase: 45
Key columns:
  - id INTEGER PRIMARY KEY AUTOINCREMENT
  - captured_at TEXT NOT NULL  — ISO 8601 timestamp
  - wahapedia_version TEXT     — version at time of capture
  - snapshot_type TEXT NOT NULL — "pre_sync" or "post_sync"
  - table_name TEXT NOT NULL   — which rw_* table this snapshot covers
  - row_count INTEGER          — number of rows in the table at capture time
  - checksum TEXT              — optional hash for quick diff detection
Design question: Full JSON serialization vs. per-table checksums — defer to Phase 45 research.
Rationale: Enables Phase 46 diff view by comparing pre-sync snapshot to post-sync state.
Must live in hobbyforge.db — rules.db is cleared before the new data is written.
```

```
Table: unit_overrides (hobbyforge.db — NEW)
Purpose: User manual overrides for points, stats, keywords, abilities (OVRD-01 to OVRD-04)
Phase: 46
Key columns:
  - id INTEGER PRIMARY KEY AUTOINCREMENT
  - unit_id INTEGER NOT NULL   — FK to units.id in hobbyforge.db (NOT rw_datasheets.id)
  - field_name TEXT NOT NULL   — which field is overridden: "points", "M", "T", "Sv", "W",
                                  "Ld", "OC", "keywords", "abilities"
  - override_value TEXT NOT NULL — the user's custom value (string-encoded)
  - created_at TEXT NOT NULL DEFAULT (datetime('now'))
  - updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  - UNIQUE(unit_id, field_name)
Design question: EAV pattern (one row per field, shown above) vs. wide table (one row per
unit with nullable columns per override type). Defer to Phase 46 research.
Rationale: References units.id in hobbyforge.db — NOT rw_datasheets.id. Cross-database FKs
are not supported. Overrides persist across re-syncs because they live in hobbyforge.db.
The link is to the user's collection unit, not to the Wahapedia datasheet record.
```

---

*Generated by Phase 42 Architecture Audit*
*Reference document for Phases 43-46 (v2.6 Rules Sync 2.0 / Rules Data Hub)*
*All findings sourced from code-path inspection — no runtime testing*

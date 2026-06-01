# Phase 103: Data Acquisition & Schema - Research

**Researched:** 2026-05-29
**Domain:** SQLite schema, Rust Tauri command, Node.js build script, Wahapedia CSV + BSData XML parsing
**Confidence:** HIGH — all findings verified against existing codebase source files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Wahapedia CSV primary source (factions, datasheets, models, abilities, keywords, wargear). BSData XML supplements with points tiers and composition. Build script merges by datasheet name/faction.
- **D-02:** Build script is dev-side only (`scripts/build-unit-db.ts`), never at runtime. Output is `src-tauri/data/unit_database.json`, checked into git, versioned with semver.
- **D-03:** Reuse Wahapedia string IDs verbatim as `udb_units.id` (e.g., `"000000123"`). Annotation continuity with `rules_favorites_notes`.
- **D-04:** Faction IDs reuse Wahapedia text IDs (e.g., `"SM"`, `"NEC"`). Same rationale.
- **D-05:** Single nested JSON (`unit_database.json`) with `version`, `built_at`, and arrays keyed by table name: `factions`, `units`, `models`, `weapons`, `abilities`, `keywords`, `points`, `composition`.
- **D-06:** `import_unit_database` called from Tauri `.setup()` hook on first launch (`udb_meta` empty) or when bundled version is newer than stored version.
- **D-07:** JSON ships as Tauri resource via `tauri.conf.json` `resources` field, read at runtime by Rust command.
- **D-08:** Migration 038 creates FTS5 virtual table (`udb_search`). Import command populates it after inserting all `udb_*` rows (DELETE + INSERT from source tables).
- **D-09:** All 15 `udb_*` tables use the schema defined in `.planning/research/ARCHITECTURE.md` § "Schema Design: Canonical Unit Database Tables".
- **D-10:** Schema in single migration file `038_udb_schema.sql`. No data in migration — only CREATE TABLE and CREATE VIRTUAL TABLE.
- **D-11:** Import follows `bulk_sync_rules` pattern: direct sqlx connection, FK checks OFF during delete pass, single transaction (DELETE then INSERT), FK checks re-enabled after commit.
- **D-12:** WAL checkpoint (`PRAGMA wal_checkpoint(TRUNCATE)`) runs after transaction commits, before returning to frontend.

### Claude's Discretion

- Build script implementation details (parser structure, error handling, intermediate data model)
- Exact Rust error handling patterns in the import command — follow existing `bulk_sync_rules` conventions
- Whether to use `include_bytes!` or runtime file read for the bundled JSON — developer's choice based on binary size tradeoff

### Deferred Ideas (OUT OF SCOPE)

- UI for triggering manual re-import (Phase 104+)
- Collection FK link (`units.udb_unit_id`) — Phase 105
- Army list COALESCE chain simplification — Phase 106
- rules.db removal and dead code cleanup — Phase 107
- Stratagems, detachments, and enhancements in canonical DB — v2 requirements (EXT-01/02/03)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DAS-01 | Dev-side Node.js build script parses Wahapedia CSVs + BSData XML into canonical `unit_database.json` | Wahapedia CSV format verified in `parseWahapediaCsv.ts`; BSData XML format verified in `fetchBsdataPoints.ts` and `parseBsdataExtended.ts`; existing parsers are directly reusable as Node.js modules |
| DAS-02 | Canonical `udb_*` schema in hobbyforge.db with tables for units, models, weapons, abilities, keywords, points tiers, composition | Complete schema in ARCHITECTURE.md verified; migration registration pattern verified in `db-helpers.ts` and `lib.rs` |
| DAS-03 | Rust `import_unit_database` command loads JSON into `udb_*` tables with WAL checkpoint before React Query invalidation | `bulk_sync_rules` pattern (lines 483–792 of lib.rs) is the direct template; WAL checkpoint pattern documented in PITFALLS.md |
| DAS-04 | All 40k 10th edition factions and units present with stats, weapons, abilities, keywords | Wahapedia provides all factions/units; `bsdataCommon.ts` `FACTION_MAP` lists all 28+ faction IDs already mapped |
| DAS-05 | Point tiers with model count brackets per unit (e.g., 5 models: 90pts, 10 models: 180pts) | BSData XML `modifier/condition` pattern verified in `fetchBsdataPoints.ts`; `extractTiers()` function already implements this |
| DAS-06 | Composition data per unit (min/max model counts, default equipment) | BSData XML `constraints` elements provide min/max; `parseBsdataExtended.ts` `BsdataModelCount` interface already captures this |
| DAS-07 | FTS5 full-text search virtual table for cross-faction unit search | FTS5 CREATE VIRTUAL TABLE pattern documented; population strategy (DELETE + INSERT after import) is locked |
| DAS-08 | Pre-built data ships bundled with app, loaded on first launch via Rust setup hook | Tauri `resources` field pattern verified against `tauri.conf.json`; `.setup()` hook pattern confirmed in lib.rs |
</phase_requirements>

---

## Summary

Phase 103 establishes the canonical unit database foundation. This is a pure back-end phase — no UI, no collection changes — focused on three deliverables: a Node.js build script that transforms external data sources into a versioned JSON artifact, a SQL migration that creates 15 `udb_*` tables plus an FTS5 virtual table, and a Rust Tauri command that bulk-loads the JSON into those tables within a single WAL-checkpointed transaction at app startup.

The most important insight from reading the codebase is that almost all required patterns already exist. The `bulk_sync_rules` command (lib.rs lines 483–792) is the direct template for `import_unit_database` — same sqlx direct connection, same FK-off delete pass, same flat `BEGIN/COMMIT` transaction, same `SyncResult` return struct pattern. The Wahapedia CSV parser (`parseWahapediaCsv.ts`) and BSData XML parsers (`fetchBsdataPoints.ts`, `parseBsdataExtended.ts`) already implement all the data extraction logic needed by the build script; the build script reuses this logic in a Node.js context rather than the browser.

The critical risk in this phase is not technical complexity — it is correctness of the data pipeline. The build script must validate completeness before emitting the JSON artifact, because a silent partial dataset (e.g., BSData failing to parse 30% of .cat files) would ship broken data to all users.

**Primary recommendation:** Implement in strict order — SQL migration first, then build script, then Rust command, then Tauri wiring. Test the migration with the parity test before touching Rust.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Unit database schema definition | Database / Storage | — | Pure SQL; additive migration 038 |
| JSON artifact production | Dev tooling (Node.js script) | — | Runs offline, never at runtime |
| Bulk data import | API / Backend (Rust) | — | Needs direct sqlx connection to bypass tauri-plugin-sql pool |
| First-launch import trigger | API / Backend (Rust .setup()) | — | Tauri setup hook runs before React Query can issue queries |
| FTS5 population | API / Backend (Rust) | — | Done inside the same transaction as the bulk insert |
| Version-gated re-import check | API / Backend (Rust) | — | Reads `udb_meta.version`, compares to bundled JSON version field |
| Tauri resource bundling | CDN / Static (bundle config) | — | `tauri.conf.json` `resources` field; no runtime decision |

---

## Standard Stack

### Core (no new packages — all existing)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| better-sqlite3 | (existing, in devDeps) | In-memory DB for migration parity test | Already used in `tests/data-layer/db-helpers.ts` |
| sqlx | (existing Cargo dep) | Direct SQLite connection in Rust command | Already used in `bulk_sync_rules` — must match exactly |
| tauri-plugin-sql | (existing) | Migration registration | Already wired in `lib.rs` |
| serde_json | (existing Cargo dep) | JSON deserialization of `unit_database.json` in Rust | Already used in `BulkSyncPayload` deserialization |
| Node.js built-ins (fs, path) | (runtime) | Build script file I/O | No external dep needed for simple CSV/XML read+write |

### Supporting (build script only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@xmldom/xmldom` or Node.js built-in `DOMParser` | — | XML parsing in Node.js context | The existing browser parsers use `DOMParser` — Node.js does not have this globally; needs a polyfill or alternative |
| TypeScript with `tsx` or `ts-node` | (existing pnpm setup) | Run `scripts/build-unit-db.ts` as TypeScript | Check `package.json` for existing ts-node/tsx |

**IMPORTANT — XML parsing gap:** The existing `fetchBsdataPoints.ts` and `parseBsdataExtended.ts` use `DOMParser` (browser API). In Node.js, `DOMParser` is not available globally. The build script must either:
- Use `@xmldom/xmldom` to polyfill `DOMParser` [ASSUMED — verify package exists on npm]
- OR use Node.js `node:html` / `fast-xml-parser` as an alternative [ASSUMED]
- OR use Node.js built-in `node:vm` to import the browser parsers with a DOMParser shim

The simplest approach: import `@xmldom/xmldom` and pass `new DOMParser()` from it. The existing parser functions already accept a `Document` from `parser.parseFromString()` — the only change is instantiation.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Runtime JSON file read in Rust | `include_bytes!` compile-time embedding | `include_bytes!` increases binary by ~10MB; runtime read keeps binary small but requires file path resolution via `app.path().resource_dir()`. Decision is Claude's discretion. |
| Node.js build script | Rust build.rs script | Rust build.rs runs at compile time but has no access to Wahapedia CSVs; Node.js runs in dev context where CSVs can be fetched/stored |
| FTS5 rebuilt from scratch on import | Incremental FTS5 update | Incremental update requires tracking deltas; wipe-and-rebuild is simpler and correct given the import is already a full wipe-and-replace |

**Installation:** No new packages required at runtime. For the build script:
```bash
# Only if DOMParser is needed in Node.js context (verify before installing):
pnpm add -D @xmldom/xmldom
```

---

## Package Legitimacy Audit

> This phase adds no new runtime packages. The only potential new package is `@xmldom/xmldom` for the dev-side build script. It is tagged [ASSUMED] below pending verification.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| @xmldom/xmldom | npm | [ASSUMED: established] | [ASSUMED: high] | github.com/xmldom/xmldom | [NOT RUN] | [ASSUMED] — verify before installing |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*slopcheck was not run at research time. `@xmldom/xmldom` is tagged [ASSUMED]. The planner must add a `checkpoint:human-verify` task before installing it. Alternative: use Node.js `node:https` + manual XML string parsing to avoid the dependency entirely, since the BSData XML structure is already well-understood from existing parsers.*

---

## Architecture Patterns

### System Architecture Diagram

```
Dev time (not shipped):
  Wahapedia CSVs (downloaded) + BSData .cat XML (downloaded)
      ↓
  scripts/build-unit-db.ts  (Node.js, runs once offline)
      ↓ parseWahapediaCsv() reused
      ↓ parseCatXml() / parseBsdataExtended() reused with DOMParser shim
      ↓ merge by unit name/faction → intermediate in-memory structure
      ↓ validate completeness (faction count, unit count, points coverage)
      ↓
  src-tauri/data/unit_database.json  (checked into git, semver versioned)

App runtime:
  Tauri .setup() hook
      ↓ reads udb_meta (via sqlx direct connection)
      ↓ [first launch OR udb_meta.version < json.version]
      ↓
  import_unit_database Tauri command (Rust)
      ↓ reads unit_database.json from Tauri resource dir
      ↓ serde_json::from_str → UnitDatabasePayload struct
      ↓ sqlx direct connection to hobbyforge.db
      ↓ PRAGMA foreign_keys = OFF
      ↓ BEGIN TRANSACTION
      ↓   DELETE FROM udb_* (child tables first, or all with FK off)
      ↓   INSERT INTO udb_factions
      ↓   INSERT INTO udb_units
      ↓   INSERT INTO udb_unit_models / weapons / abilities / keywords / points / composition
      ↓   INSERT INTO udb_meta (version, built_at, unit_count, faction_count)
      ↓   DELETE FROM udb_search (FTS5 wipe)
      ↓   INSERT INTO udb_search SELECT ... FROM udb_units JOIN ...
      ↓ COMMIT
      ↓ PRAGMA foreign_keys = ON
      ↓ PRAGMA wal_checkpoint(TRUNCATE)
      ↓ return UdbImportResult { factions, units, models, ... }
```

### Recommended Project Structure

```
scripts/
  build-unit-db.ts       # Main entry point: orchestrates parse + merge + validate + write
  parse-wahapedia.ts     # Wahapedia CSV parsing (wraps parseWahapediaCsv + data mapping)
  parse-bsdata.ts        # BSData XML parsing (wraps parseCatXml + parseBsdataExtended)

src-tauri/
  data/
    unit_database.json   # Output artifact (checked into git)
  migrations/
    038_udb_schema.sql   # All udb_* CREATE TABLE + CREATE VIRTUAL TABLE
  src/
    lib.rs               # + import_unit_database command + .setup() hook wiring

tests/
  data-layer/
    migration038.test.ts  # Verifies all udb_* tables created; FTS5 virtual table present
    db-helpers.ts         # MODIFIED: add "038_udb_schema.sql" to HOBBYFORGE_MIGRATIONS
```

### Pattern 1: bulk_sync_rules → import_unit_database mapping

**What:** The `import_unit_database` Rust command is structurally identical to `bulk_sync_rules` with three differences: (1) it reads `unit_database.json` from the app resource dir instead of receiving a JS payload, (2) it targets `hobbyforge.db` instead of `rules.db`, and (3) it runs a WAL checkpoint after commit.

**When to use:** Whenever bulk-loading pre-built data into SQLite from Rust.

```rust
// Source: src-tauri/src/lib.rs lines 483-792 (verified)
// Template for import_unit_database:

#[tauri::command]
async fn import_unit_database(app: tauri::AppHandle) -> Result<UdbImportResult, String> {
    use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions, Connection};
    use std::str::FromStr;

    // 1. Locate hobbyforge.db
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let db_url = format!("sqlite:{}", app_data_dir.join("hobbyforge.db").display());

    // 2. Read unit_database.json from resource dir (D-07)
    let resource_dir = app.path().resource_dir()
        .map_err(|e| format!("resource_dir: {e}"))?;
    let json_path = resource_dir.join("data/unit_database.json");
    let json_str = std::fs::read_to_string(&json_path)
        .map_err(|e| format!("read unit_database.json: {e}"))?;
    let payload: UnitDatabasePayload = serde_json::from_str(&json_str)
        .map_err(|e| format!("parse unit_database.json: {e}"))?;

    // 3. Direct sqlx connection (same as bulk_sync_rules)
    let opts = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| format!("opts: {e}"))?
        .create_if_missing(false)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(30));
    let mut conn = opts.connect().await.map_err(|e| format!("connect: {e}"))?;

    // 4. FK off, transaction, DELETE all, INSERT all, FTS5 rebuild, commit
    sqlx::query("PRAGMA foreign_keys = OFF").execute(&mut conn).await
        .map_err(|e| format!("pragma fk off: {e}"))?;

    let mut tx = conn.begin().await.map_err(|e| format!("begin: {e}"))?;

    // DELETE child tables first (or any order with FK off)
    for table in ["udb_search", "udb_unit_keywords", "udb_unit_points",
                  "udb_unit_composition", "udb_unit_abilities",
                  "udb_unit_weapons", "udb_unit_models", "udb_units",
                  "udb_factions", "udb_meta"] {
        sqlx::query(&format!("DELETE FROM {table}"))
            .execute(&mut *tx).await
            .map_err(|e| format!("delete {table}: {e}"))?;
    }

    // INSERT loops (same pattern as bulk_sync_rules)
    // ... for each table in payload ...

    // FTS5 rebuild inside transaction
    sqlx::query(
        "INSERT INTO udb_search(rowid, unit_id, name, faction_name, keywords)
         SELECT u.rowid, u.id, u.name, f.name, GROUP_CONCAT(k.keyword, ' ')
         FROM udb_units u
         JOIN udb_factions f ON f.id = u.faction_id
         LEFT JOIN udb_unit_keywords k ON k.unit_id = u.id
         GROUP BY u.id"
    ).execute(&mut *tx).await.map_err(|e| format!("fts5 insert: {e}"))?;

    tx.commit().await.map_err(|e| format!("commit: {e}"))?;

    // D-12: WAL checkpoint after commit, before return
    sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .execute(&mut conn).await
        .map_err(|e| format!("wal_checkpoint: {e}"))?;

    Ok(counts)
}
```

### Pattern 2: Tauri .setup() hook for first-launch import

**What:** The `.setup()` closure in `run()` can check `udb_meta` row count and call `import_unit_database` if empty or outdated. However, `.setup()` runs synchronously and `async fn` commands require `tauri::async_runtime::block_on`.

**When to use:** One-time initialization that must happen before the UI renders.

```rust
// Source: src-tauri/src/lib.rs lines 1157–1169 (verified — current setup hook)
// D-06: add udb_meta version check to .setup() closure

.setup(|app| {
    let app_data_dir = app.path().app_data_dir()
        .expect("failed to resolve app_data_dir");
    std::fs::create_dir_all(&app_data_dir).expect("failed to create app_data_dir");

    // Check if udb_meta is empty (first launch) or outdated
    let app_handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        if should_import_unit_database(&app_handle).await {
            match import_unit_database_inner(&app_handle).await {
                Ok(result) => println!("[hobbyforge] udb import: {:?}", result),
                Err(e) => eprintln!("[hobbyforge] udb import failed: {e}"),
            }
        }
    });
    Ok(())
})
```

**Note:** The spawned async task runs concurrently with window initialization. The React app must wait for import completion before querying `udb_*` tables. The frontend's `DbHealthGate` component is the right place to poll `udb_meta` row count before showing the database browser.

### Pattern 3: FTS5 virtual table creation and population

**What:** FTS5 (Full-Text Search version 5) virtual tables in SQLite require a specific CREATE syntax and are populated differently from regular tables.

**When to use:** Any cross-table full-text search requirement.

```sql
-- Source: SQLite FTS5 documentation [CITED: sqlite.org/fts5.html]
-- Creates the virtual table in migration 038

CREATE VIRTUAL TABLE IF NOT EXISTS udb_search USING fts5(
    unit_id UNINDEXED,    -- store but don't index (used for JOIN back to udb_units)
    name,                  -- unit name — indexed and searchable
    faction_name,          -- faction name — indexed
    keywords,              -- space-separated keywords string — indexed
    content='udb_units',  -- content table (optional, for content tables FTS5 variant)
    content_rowid='rowid'
);
```

**Critical FTS5 fact:** The `udb_search` table is a virtual table — it does not auto-populate when rows are inserted into `udb_units`. It must be explicitly populated by the import command. The `content=` option is for "content tables" which query the source table on read; for a standalone FTS5 index that is populated at import time, omit `content=` and do a full INSERT after all `udb_*` rows are loaded.

**Simpler approach (standalone FTS5, recommended):**
```sql
-- Migration 038: standalone FTS5 table (no content= option)
CREATE VIRTUAL TABLE IF NOT EXISTS udb_search USING fts5(
    unit_id UNINDEXED,
    name,
    faction_name,
    keywords
);
```

Then in the import command, after inserting all `udb_units` and `udb_unit_keywords`:
```sql
DELETE FROM udb_search;
INSERT INTO udb_search(unit_id, name, faction_name, keywords)
    SELECT u.id, u.name, f.name,
           COALESCE(GROUP_CONCAT(k.keyword, ' '), '')
    FROM udb_units u
    JOIN udb_factions f ON f.id = u.faction_id
    LEFT JOIN udb_unit_keywords k ON k.unit_id = u.id
    GROUP BY u.id;
```

### Pattern 4: Tauri resource bundling

**What:** JSON files in `src-tauri/data/` must be declared in `tauri.conf.json` `bundle.resources` to be included in the app bundle and accessible via `app.path().resource_dir()` at runtime.

**When to use:** Any static file that ships with the app and is read at runtime.

```json
// Source: tauri.conf.json (verified — current file has no resources field)
// ADD to tauri.conf.json bundle section:
{
  "bundle": {
    "active": true,
    "targets": "all",
    "resources": {
      "data/unit_database.json": "data/unit_database.json"
    }
  }
}
```

**Note:** The Tauri 2 `resources` field maps `source_path → destination_path_in_bundle`. The destination path is relative to the resource directory. Access at runtime via `app.path().resource_dir()?.join("data/unit_database.json")`.

### Pattern 5: Migration 038 registration in lib.rs and db-helpers.ts

**What:** Every new migration must be registered in BOTH `lib.rs` `get_migrations()` AND `tests/data-layer/db-helpers.ts` `HOBBYFORGE_MIGRATIONS`. Missing either causes the migration parity test to fail.

**Critical:** The db-helpers.ts currently lists only 36 migrations (up to `036_unit_form_simplification.sql`). Migration 037 (`037_override_flags.sql`) is already in the migrations folder but NOT in db-helpers.ts — this needs fixing in the same commit as 038.

```typescript
// Source: tests/data-layer/db-helpers.ts lines 12-49 (verified)
// Must add both 037 and 038 to HOBBYFORGE_MIGRATIONS array:
export const HOBBYFORGE_MIGRATIONS = [
  // ... existing 036 migrations ...
  "036_unit_form_simplification.sql",
  "037_override_flags.sql",      // MISSING from db-helpers.ts — add in this phase
  "038_udb_schema.sql",          // NEW — add in this phase
] as const;
```

### Anti-Patterns to Avoid

- **Seeding data via migration:** Never put INSERT statements for unit data in `038_udb_schema.sql`. Any bad row causes an unrecoverable boot loop (Pitfall 3 from PITFALLS.md — real codebase incident).
- **include_bytes! for large JSON:** Using `include_bytes!` for a 5-10MB JSON file increases the binary size permanently. Use runtime file read unless offline-first binary portability is required.
- **Calling import from the TypeScript side at startup:** The import must happen in the Rust `.setup()` hook, not in a React `useEffect`. The setup hook runs before any Tauri command handler is available to the frontend.
- **Using the tauri-plugin-sql pool for the import:** The plugin pool may hold stale WAL snapshots (Pitfall 5 — documented recurring incident). The import MUST use a direct `sqlx` connection, matching `bulk_sync_rules`.
- **Nested transactions in the import:** `tauri-plugin-sql` prohibits nested transactions. The import command must use a single flat `BEGIN/COMMIT` (no helper functions that internally call `BEGIN`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom split logic | `parseWahapediaCsv()` already exists | Handles Wahapedia's pipe-delimiter + trailing pipe + UTF-8 edge cases |
| BSData XML points extraction | New XML parser | `parseCatXml()` already exists | Handles nested modifier/condition hierarchy; `PTS_FIELD_ID` constant already correct |
| BSData extended data extraction | Custom enhancements/model counts parser | `parseBsdataExtended.ts` already exists | `BsdataModelCount`, `BsdataLeaderTarget` interfaces already correct |
| FTS5 search query | Manual LIKE with joins | SQLite FTS5 `MATCH` operator | FTS5 handles tokenization, ranking, prefix matching; LIKE on 2500+ rows is too slow |
| Faction ID mapping | New lookup logic | `FACTION_MAP` in `bsdataCommon.ts` | Already maps 28+ catalogue names to faction IDs |
| Bulk insert transaction | Custom retry/batch logic | sqlx direct connection pattern from `bulk_sync_rules` | Already handles WAL mode, busy timeout, FK toggle |

**Key insight:** The hardest part of this phase (parsing Wahapedia + BSData) is already solved. The build script is primarily a Node.js adapter layer that calls existing parsing functions, merges their outputs, and emits JSON.

---

## Common Pitfalls

### Pitfall 1: Migration 037 is missing from db-helpers.ts

**What goes wrong:** `037_override_flags.sql` exists in the migrations folder but is absent from `HOBBYFORGE_MIGRATIONS` in `db-helpers.ts`. Adding migration 038 without also adding 037 causes the migration parity test's count check to fail (expects 37 but gets 36).

**Why it happens:** The migration file was added to the folder in a prior phase but the db-helpers.ts was not updated.

**How to avoid:** In the same commit that adds `038_udb_schema.sql` to the migration list, also add `037_override_flags.sql` to `HOBBYFORGE_MIGRATIONS` in db-helpers.ts.

**Warning signs:** `migration-parity.test.ts` "lib.rs migration count matches helper count" test fails.

### Pitfall 2: DOMParser is not available in Node.js

**What goes wrong:** The build script imports `fetchBsdataPoints.ts` or `parseBsdataExtended.ts` and calls `parseCatXml(xml, factionId)`. Inside, `new DOMParser()` is called — but `DOMParser` is a browser API and throws `ReferenceError: DOMParser is not defined` in Node.js.

**Why it happens:** The existing parsers were written for browser context (Tauri webview). The build script runs in Node.js.

**How to avoid:** Either (a) install `@xmldom/xmldom` and polyfill `DOMParser` before calling parse functions, or (b) refactor the parsers to accept a `Document` parameter and instantiate `DOMParser` in the caller (easier to test). Option (b) is preferred — existing functions already accept `doc: Document` in their inner helpers.

**Warning signs:** `ReferenceError: DOMParser is not defined` at build script runtime.

### Pitfall 3: WAL stale reads after bulk import (documented recurring incident)

**What goes wrong:** The Rust import command commits thousands of rows, but `tauri-plugin-sql` pool connections may hold stale WAL snapshots. Immediately after import, the React app queries `udb_factions` and gets 0 rows.

**Why it happens:** SQLite WAL mode allows readers to continue from older snapshots while a writer is active. Pool connections are not forced to a new snapshot until they create a new connection.

**How to avoid:** The import command MUST run `PRAGMA wal_checkpoint(TRUNCATE)` after committing and before returning (D-12). This is the same fix applied to `useRulesSync.ts` for the analogous rules.db incident.

**Warning signs:** Database browser shows 0 factions immediately after first launch, correct results after restart.

### Pitfall 4: Migration not registered in lib.rs

**What goes wrong:** `038_udb_schema.sql` is added to the migrations folder but never added to `get_migrations()` in `lib.rs`. The app works on developer machines (tables already exist) but breaks on fresh installs.

**Why it happens:** Tauri plugin-sql does not auto-discover migrations — every migration must be explicitly listed.

**How to avoid:** Add the migration entry to `lib.rs` `get_migrations()` in the same commit as the SQL file. Run the migration parity test immediately.

**Warning signs:** Migration parity test `lib.rs migration count matches helper count` fails.

### Pitfall 5: FTS5 table treated as regular table

**What goes wrong:** FTS5 virtual tables cannot be read with standard `SELECT *` without special handling. They also must not have regular indexes added. Attempting `CREATE INDEX ON udb_search(...)` will fail with "cannot create index on virtual table."

**Why it happens:** FTS5 virtual tables look like regular tables in CREATE syntax but behave differently.

**How to avoid:** Never add regular indexes to `udb_search`. Query using `WHERE udb_search MATCH 'query'` syntax, not `WHERE name LIKE '%query%'`. The FTS5 table has its own internal index.

**Warning signs:** SQL error "cannot create index on virtual table" if indexes are added; incorrect results if LIKE is used instead of MATCH.

### Pitfall 6: .setup() async import races with first React Query

**What goes wrong:** The `.setup()` hook spawns an async import task. If the React app loads and queries `udb_factions` before the import task completes, it gets 0 rows and caches an empty result with `staleTime: Infinity`.

**Why it happens:** Async tasks spawned in `.setup()` run concurrently with UI initialization.

**How to avoid:** The frontend must check `udb_meta` row count before showing the database browser. A dedicated hook (e.g., `useUdbReady()`) that polls `udb_meta` and shows a loading state is the correct UI-side mitigation. Since Phase 103 has no UI, document this as a Wave 0 gap for Phase 104.

**Warning signs:** Database browser (Phase 104) shows empty faction list on first launch.

---

## Code Examples

### Wahapedia CSV format (verified from parseWahapediaCsv.ts comments)

```
// Source: src/lib/parseWahapediaCsv.ts (verified)
// Format: pipe-delimited, UTF-8, trailing pipe on every row
// URL pattern: https://wahapedia.ru/wh40k10ed/*.csv
// Example header: id|name|faction_id|source_id|role|damaged_w|damaged_description|
// Fields match rw_datasheets columns exactly — same field names in udb_units
```

### BSData XML points tier extraction (verified from fetchBsdataPoints.ts)

```typescript
// Source: src/lib/fetchBsdataPoints.ts (verified)
// PTS_FIELD_ID = "51b2-306e-1021-d207" — the fixed ID for the "pts" cost field
// Points tiers are in <modifier type="set" field="PTS_FIELD_ID" value="X">
//   with child <condition childId="model" type="atLeast" value="N">
// extractTiers() returns [{modelCount: 5, points: 90}, {modelCount: 10, points: 180}]
// This is the exact structure needed for udb_unit_points table rows
```

### Build script JSON output structure (locked in D-05)

```typescript
// Required structure for unit_database.json (D-05)
interface UnitDatabaseJson {
  version: string;          // semver, e.g. "1.0.0"
  built_at: string;         // ISO 8601 timestamp
  game_system: string;      // "40k-10th"
  unit_count: number;       // for quick verification
  faction_count: number;    // for quick verification
  factions: UdbFactionRow[];
  units: UdbUnitRow[];
  models: UdbUnitModelRow[];
  weapons: UdbUnitWeaponRow[];
  abilities: UdbUnitAbilityRow[];
  keywords: UdbUnitKeywordRow[];
  points: UdbUnitPointsRow[];
  composition: UdbUnitCompositionRow[];
}
```

### Rust struct for deserialization (mirrors BulkSyncPayload pattern)

```rust
// Source: src-tauri/src/lib.rs lines 444-479 (verified — BulkSyncPayload pattern)
// New struct for import_unit_database:
#[derive(serde::Deserialize)]
pub struct UnitDatabasePayload {
    pub version: String,
    pub built_at: String,
    pub faction_count: Option<u32>,
    pub unit_count: Option<u32>,
    pub factions: Vec<JsRow>,
    pub units: Vec<JsRow>,
    pub models: Vec<JsRow>,
    pub weapons: Vec<JsRow>,
    pub abilities: Vec<JsRow>,
    pub keywords: Vec<JsRow>,
    pub points: Vec<JsRow>,
    pub composition: Vec<JsRow>,
}

#[derive(serde::Serialize)]
pub struct UdbImportResult {
    pub factions: u64,
    pub units: u64,
    pub models: u64,
    pub weapons: u64,
    pub abilities: u64,
    pub keywords: u64,
    pub points: u64,
    pub composition: u64,
}
```

### Migration 038 FTS5 table (standalone variant)

```sql
-- Source: SQLite FTS5 documentation [CITED: sqlite.org/fts5.html] + ARCHITECTURE.md
-- Standalone FTS5 (no content= option): simplest, fully self-contained
CREATE VIRTUAL TABLE IF NOT EXISTS udb_search USING fts5(
    unit_id UNINDEXED,
    name,
    faction_name,
    keywords
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Runtime Wahapedia CSV sync (`bulk_sync_rules`) | Pre-built JSON artifact + `import_unit_database` | Phase 103 | Eliminates WAL/pool timing bugs, offline-first from day one |
| rules.db dual-database architecture | `udb_*` tables in hobbyforge.db | Phase 103 (schema only) | No cross-DB join limitation; FKs work natively |
| Name-based unit matching (`normalizePointsNames`) | Stable Wahapedia text ID as primary key | Phase 103 | Eliminates the 20% mismatch rate documented in PITFALLS.md |
| Per-migration data seeding | Import command separate from migration | Phase 103 | Migration immutability preserved; data can be updated without schema version bump |

**Deprecated/outdated for this phase:**
- `bulk_sync_rules` pattern: Being replaced by `import_unit_database`; structure is reused but not the function itself
- `BulkSyncPayload` struct: Template for `UnitDatabasePayload`; not modified in this phase

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@xmldom/xmldom` is the correct npm package for Node.js DOMParser polyfill | Standard Stack — Supporting | Build script cannot parse BSData XML; need alternative XML approach |
| A2 | `037_override_flags.sql` is missing from `db-helpers.ts` HOBBYFORGE_MIGRATIONS | Pitfall 1 | If already added, the pitfall warning is stale (no harm) |
| A3 | `tsx` or `ts-node` is available in the project devDeps to run `scripts/build-unit-db.ts` | Standard Stack | Build script needs a TypeScript runner; planner must verify `package.json` scripts |
| A4 | Tauri resource_dir() returns the correct path for resources bundled via `bundle.resources` in production builds | Pattern 4 | Resource file not found at runtime on installed app |
| A5 | udb_search FTS5 table uses the rowid of udb_units as its rowid (for content table lookup) | Pattern 3 | FTS5 query returns unit_ids but JOIN back to udb_units may fail if rowid mismatch |

**If this table is empty:** Not empty — 5 assumptions require verification.

---

## Open Questions (RESOLVED)

1. **TypeScript runner for build script**
   - What we know: Project uses pnpm + TypeScript; `pnpm dev` runs Vite
   - What's unclear: Is `tsx` or `ts-node` in devDependencies? Is there a `scripts` entry in package.json for running Node.js scripts?
   - Recommendation: Check `package.json` devDependencies before writing the build script invocation

2. **Migration 037 parity gap**
   - What we know: `037_override_flags.sql` exists in migrations folder; `db-helpers.ts` HOBBYFORGE_MIGRATIONS stops at `036_unit_form_simplification.sql` (line 48)
   - What's unclear: Was 037 intentionally excluded from the test helper, or is this a gap?
   - Recommendation: Plan must include a task to add 037 (and 038) to both `lib.rs` and `db-helpers.ts`

3. **FTS5 rowid strategy for unit_id join**
   - What we know: FTS5 stores rowid by default; `udb_units` has a TEXT primary key (not integer rowid)
   - What's unclear: The most efficient way to join FTS5 results back to `udb_units` given TEXT PK
   - Recommendation: Store `unit_id` as an UNINDEXED column in FTS5 (as shown in Pattern 3). FTS5 MATCH returns rows with `unit_id` value; use `JOIN udb_units ON udb_units.id = udb_search.unit_id`

4. **Wahapedia CSV download mechanism in build script**
   - What we know: `parseWahapediaCsv.ts` shows the URL pattern (`https://wahapedia.ru/wh40k10ed/*.csv`); the build script is dev-side only
   - What's unclear: Should the build script fetch CSVs at runtime (requiring internet), or should CSVs be pre-downloaded to a `scripts/data/` folder?
   - Recommendation: Pre-download CSVs to `scripts/data/` (gitignored large files); build script reads from local files. This is faster, reproducible, and avoids Wahapedia rate limits

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build script execution | ✓ | (project runs pnpm) | — |
| pnpm | Package management | ✓ | (used throughout project) | — |
| better-sqlite3 | migration038.test.ts | ✓ | (in devDeps, used in db-helpers.ts) | — |
| Wahapedia CSV files | Build script data source | ✗ (must download) | — | Must pre-download to scripts/data/ before running build script |
| BSData .cat XML files | Build script data source | ✗ (must download) | — | Must pre-download to scripts/data/ before running build script |
| `@xmldom/xmldom` | Build script XML parsing | ✗ (not yet installed) | — | Manual XML string parsing or restructure parsers to accept Document |

**Missing dependencies with no fallback:**
- Wahapedia CSV files and BSData .cat XML files — these are the input data for the build script. The planner must include a task to download these before the build script can be run.

**Missing dependencies with fallback:**
- `@xmldom/xmldom` — fallback is refactoring the XML parsers to accept pre-parsed Document objects and instantiating DOMParser via a shim in the build script context.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + better-sqlite3 (node environment) |
| Config file | (project vitest.config.ts — check project root) |
| Quick run command | `pnpm test -- tests/data-layer/migration038.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DAS-02 | All 15 `udb_*` tables exist after migration 038 | unit | `pnpm test -- tests/data-layer/migration038.test.ts` | ❌ Wave 0 |
| DAS-02 | FTS5 virtual table `udb_search` exists after migration 038 | unit | same | ❌ Wave 0 |
| DAS-02 | `udb_meta` table has `CHECK (id = 1)` constraint | unit | same | ❌ Wave 0 |
| DAS-03 | Import command inserts correct row counts per table | integration | manual (Tauri command — no jsdom) | manual-only |
| DAS-03 | Re-import produces identical row counts (idempotent) | integration | manual (Tauri command) | manual-only |
| DAS-07 | FTS5 MATCH query returns non-empty results after import | integration | manual | manual-only |
| DAS-02 | Migration parity: lib.rs + db-helpers.ts count matches files | unit | `pnpm test -- tests/data-layer/migration-parity.test.ts` | ✅ (existing) |

**Justification for manual-only:** The Rust `import_unit_database` command requires a real Tauri app handle and a live SQLite file — these cannot be tested in jsdom. Integration is verified by running `pnpm tauri dev` and checking the database browser (Phase 104).

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/data-layer/migration-parity.test.ts tests/data-layer/migration038.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/data-layer/migration038.test.ts` — covers DAS-02 (table existence, FK constraints, FTS5 virtual table)
- [ ] `tests/data-layer/db-helpers.ts` MUST be updated to add `037_override_flags.sql` and `038_udb_schema.sql` to `HOBBYFORGE_MIGRATIONS` before any tests run

---

## Security Domain

> This phase has no user-facing input, no authentication, and no network calls at runtime. The import command reads a bundled resource file — not user input. Standard controls apply.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (build script) | Validate row counts in build script before emitting JSON; reject malformed data |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed `unit_database.json` in resource bundle | Tampering | `serde_json::from_str` will fail loudly on malformed JSON; Rust command returns `Err(String)` |
| Build script producing partial dataset | Information Disclosure | Completeness validation in build script (min faction count, min unit count per faction) |

---

## Sources

### Primary (HIGH confidence — verified by direct source file reading)

- `src-tauri/src/lib.rs` lines 483–792 — `bulk_sync_rules` command (direct template for `import_unit_database`)
- `src-tauri/src/lib.rs` lines 1156–1195 — `.setup()` hook and `invoke_handler!` registration pattern
- `src-tauri/src/lib.rs` lines 444–478 — `BulkSyncPayload` and `SyncResult` struct patterns
- `tests/data-layer/db-helpers.ts` — migration registration pattern; HOBBYFORGE_MIGRATIONS list (confirms 037 gap)
- `tests/data-layer/migration-parity.test.ts` — migration count check pattern
- `src/lib/parseWahapediaCsv.ts` — Wahapedia CSV format (pipe-delimited, UTF-8, URL pattern)
- `src/lib/fetchBsdataPoints.ts` — BSData XML points tier extraction (`PTS_FIELD_ID`, `extractTiers()`)
- `src/lib/parseBsdataExtended.ts` — BSData composition/model counts (`BsdataModelCount`)
- `src/lib/bsdataCommon.ts` — `FACTION_MAP` (28+ faction IDs), BSData GitHub repo location
- `src-tauri/migrations/rules_001_schema.sql` — existing `rw_*` schema (replaced by `udb_*`)
- `src-tauri/tauri.conf.json` — confirms no `resources` field yet; `bundle` section structure
- `.planning/research/ARCHITECTURE.md` — complete `udb_*` schema (15 tables + FTS5)
- `.planning/research/PITFALLS.md` — WAL stale read incident, boot loop risk, migration registration omission

### Secondary (MEDIUM confidence)

- `.planning/research/FEATURES.md` — Wahapedia URL pattern confirmation, BSData GitHub repo confirmation
- `.planning/phases/103-data-acquisition-schema/103-CONTEXT.md` — all locked decisions D-01 through D-12

### Tertiary (LOW confidence — documentation only)

- SQLite FTS5 documentation [CITED: sqlite.org/fts5.html] — CREATE VIRTUAL TABLE syntax, MATCH operator
- Tauri v2 resources documentation [ASSUMED] — `bundle.resources` field format for Tauri 2 config schema

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified in existing codebase
- Architecture: HIGH — patterns verified by direct lib.rs source reading
- Pitfalls: HIGH — three pitfalls (WAL stale reads, migration omission, boot loop) are documented real incidents from this codebase
- Build script data format: HIGH for CSV (parser exists), MEDIUM for BSData XML (parsers exist but Node.js DOMParser gap is an assumption)
- FTS5 setup: MEDIUM — SQLite FTS5 is well-documented but CREATE VIRTUAL TABLE exact syntax for this use case is [CITED] not [VERIFIED]

**Research date:** 2026-05-29
**Valid until:** 2026-07-01 (stable — SQLite FTS5 and Tauri 2 resource bundling are stable APIs)

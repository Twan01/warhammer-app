# Phase 103: Data Acquisition & Schema - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 6 new/modified files
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src-tauri/migrations/038_udb_schema.sql` | migration | batch | `src-tauri/migrations/rules_001_schema.sql` + `033_database_hardening.sql` | role-match |
| `src-tauri/src/lib.rs` | backend command + config | batch | `src-tauri/src/lib.rs` (bulk_sync_rules, lines 483–792) | exact |
| `scripts/build-unit-db.ts` | utility / build script | transform | `scripts/sql-smoke-test.ts` (structure only); `src/lib/parseWahapediaCsv.ts` (data) | partial |
| `src-tauri/data/unit_database.json` | config / static artifact | — | `src-tauri/tauri.conf.json` (resource pattern reference) | no-analog |
| `src-tauri/tauri.conf.json` | config | — | self (existing `bundle` section) | exact |
| `tests/data-layer/migration038.test.ts` | test | — | `tests/data-layer/migration-parity.test.ts` | exact |

---

## Pattern Assignments

### `src-tauri/migrations/038_udb_schema.sql` (migration, batch)

**Analog 1:** `src-tauri/migrations/rules_001_schema.sql` — TEXT PRIMARY KEY pattern, ON DELETE CASCADE FKs, no data seeding
**Analog 2:** `src-tauri/migrations/033_database_hardening.sql` — FK indexes, CHECK constraints, `PRAGMA user_version` at end

**Table creation pattern** (rules_001_schema.sql lines 8–35):
```sql
CREATE TABLE IF NOT EXISTS rw_factions (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rw_datasheets (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    faction_id          TEXT REFERENCES rw_factions(id),
    source_id           TEXT,
    role                TEXT
);

CREATE TABLE IF NOT EXISTS rw_datasheet_models (
    datasheet_id  TEXT NOT NULL REFERENCES rw_datasheets(id) ON DELETE CASCADE,
    line          INTEGER NOT NULL,
    name          TEXT,
    PRIMARY KEY (datasheet_id, line)
);
```

**FK index pattern** (033_database_hardening.sql lines 6–50):
```sql
CREATE INDEX IF NOT EXISTS idx_painting_recipes_faction_id ON painting_recipes(faction_id);
CREATE INDEX IF NOT EXISTS idx_army_list_units_list_id ON army_list_units(list_id);
CREATE INDEX IF NOT EXISTS idx_army_list_units_unit_id ON army_list_units(unit_id);
```

**user_version pattern** (033_database_hardening.sql line 93):
```sql
PRAGMA user_version = 33;
```

**FTS5 virtual table** (standalone pattern — no existing analog, use SQLite docs):
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS udb_search USING fts5(
    unit_id UNINDEXED,
    name,
    faction_name,
    keywords
);
```

**udb_meta singleton CHECK** (from ARCHITECTURE.md):
```sql
CREATE TABLE udb_meta (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    version       TEXT NOT NULL,
    built_at      TEXT NOT NULL,
    game_system   TEXT NOT NULL DEFAULT '40k-10th',
    unit_count    INTEGER,
    faction_count INTEGER
);
```

**Critical rules:**
- File header must state "Migration 038: Unit Database Schema"
- No INSERT/seed statements — migration is DDL only (D-10; seeding via migration caused a boot-loop incident)
- Every FK child table needs `ON DELETE CASCADE`
- `udb_unit_leader_targets`, `udb_shared_abilities`, `udb_detachments`, `udb_detachment_abilities`, `udb_stratagems`, `udb_enhancements` are deferred (EXT-01/02/03) — include only the 9 Phase 103 tables plus `udb_meta` and `udb_search`
- End file with `PRAGMA user_version = 38;`

---

### `src-tauri/src/lib.rs` (backend command + config, batch)

**Analog:** `src-tauri/src/lib.rs` — `bulk_sync_rules` command (lines 483–792), migration registration (lines 6–231), `.setup()` hook (lines 1162–1170), `invoke_handler!` (lines 1183–1192)

**Migration registration pattern** (lines 6–13 + the entry format at lines 218–230):
```rust
fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "core_schema",
            sql: include_str!("../migrations/001_core_schema.sql"),
            kind: MigrationKind::Up,
        },
        // ... existing 37 entries ...
        Migration {
            version: 37,
            description: "override_flags",
            sql: include_str!("../migrations/037_override_flags.sql"),
            kind: MigrationKind::Up,
        },
        // ADD:
        Migration {
            version: 38,
            description: "udb_schema",
            sql: include_str!("../migrations/038_udb_schema.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
```

**Struct pattern** — copy `BulkSyncPayload` + `SyncResult` (lines 444–478); new structs follow the same derive macros:
```rust
type JsRow = HashMap<String, serde_json::Value>;  // line 428 — reuse this type alias

#[derive(serde::Deserialize)]
pub struct BulkSyncPayload {           // lines 444–462
    factions: Vec<JsRow>,
    // ...
    last_sync_at: String,
    wahapedia_version: String,
}

#[derive(serde::Serialize)]
pub struct SyncResult {                // lines 464–478
    pub factions: u64,
    pub sources: u64,
    // ...
}
```
New `UnitDatabasePayload` and `UdbImportResult` structs use identical `#[derive(serde::Deserialize)]` / `#[derive(serde::Serialize)]` respectively.

**Core import command pattern** — direct copy of `bulk_sync_rules` structure (lines 483–792):
```rust
#[tauri::command]
async fn bulk_sync_rules(
    app: tauri::AppHandle,
    payload: BulkSyncPayload,
) -> Result<SyncResult, String> {
    use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions, Connection};
    use std::str::FromStr;

    // 1. Resolve DB path
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let db_url = format!("sqlite:{}", app_data_dir.join("rules.db").display());

    // 2. Direct sqlx connection (not the plugin pool — critical)
    let opts = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| format!("opts: {e}"))?
        .create_if_missing(false)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(30));
    let mut conn = opts.connect().await.map_err(|e| format!("connect: {e}"))?;

    // 3. FK off
    sqlx::query("PRAGMA foreign_keys = OFF")
        .execute(&mut conn).await
        .map_err(|e| format!("pragma fk off: {e}"))?;

    // 4. Begin transaction
    let mut tx = conn.begin().await.map_err(|e| format!("begin: {e}"))?;

    // 5. DELETE all tables (FK off means any order is fine)
    for table in ["rw_datasheet_keywords", "rw_datasheet_abilities", ...] {
        sqlx::query(&format!("DELETE FROM {table}"))
            .execute(&mut *tx).await
            .map_err(|e| format!("delete {table}: {e}"))?;
    }

    // 6. INSERT loops with row counting
    for row in &payload.factions {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query("INSERT INTO rw_factions (id, name) VALUES (?, ?)")
            .bind(&id)
            .bind(str_val(row, "name").unwrap_or_default())
            .execute(&mut *tx).await
            .map_err(|e| format!("insert faction {id}: {e}"))?;
        counts.factions += res.rows_affected();
    }

    // 7. Write meta row inside the same transaction (lines 766–788)
    sqlx::query("INSERT OR REPLACE INTO rw_sync_meta (...) VALUES (1, ...)")
        // ... binds ...
        .execute(&mut *tx).await
        .map_err(|e| format!("insert sync_meta: {e}"))?;

    // 8. Commit
    tx.commit().await.map_err(|e| format!("commit: {e}"))?;
    Ok(counts)
}
```

**Differences for `import_unit_database`:**
- Targets `hobbyforge.db` not `rules.db`
- Reads JSON from resource dir instead of receiving a JS payload:
  ```rust
  let resource_dir = app.path().resource_dir()
      .map_err(|e| format!("resource_dir: {e}"))?;
  let json_str = std::fs::read_to_string(resource_dir.join("data/unit_database.json"))
      .map_err(|e| format!("read unit_database.json: {e}"))?;
  let payload: UnitDatabasePayload = serde_json::from_str(&json_str)
      .map_err(|e| format!("parse unit_database.json: {e}"))?;
  ```
- Adds WAL checkpoint after commit (D-12):
  ```rust
  tx.commit().await.map_err(|e| format!("commit: {e}"))?;
  // D-12: WAL checkpoint before returning — prevents stale read by plugin pool
  sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
      .execute(&mut conn).await
      .map_err(|e| format!("wal_checkpoint: {e}"))?;
  ```
- Adds FTS5 rebuild inside transaction before commit:
  ```rust
  sqlx::query("DELETE FROM udb_search").execute(&mut *tx).await
      .map_err(|e| format!("delete udb_search: {e}"))?;
  sqlx::query(
      "INSERT INTO udb_search(unit_id, name, faction_name, keywords)
       SELECT u.id, u.name, f.name,
              COALESCE(GROUP_CONCAT(k.keyword, ' '), '')
       FROM udb_units u
       JOIN udb_factions f ON f.id = u.faction_id
       LEFT JOIN udb_unit_keywords k ON k.unit_id = u.id
       GROUP BY u.id"
  ).execute(&mut *tx).await
      .map_err(|e| format!("fts5 rebuild: {e}"))?;
  ```

**Helper functions** — reuse `str_val` and `i64_val` already defined at lines 430–443. Do not redefine them.

**setup() hook pattern** (lines 1162–1170):
```rust
.setup(|app| {
    let app_data_dir = app.path().app_data_dir()
        .expect("failed to resolve app_data_dir");
    std::fs::create_dir_all(&app_data_dir).expect("failed to create app_data_dir");
    println!("[hobbyforge] app_data_dir = {}", app_data_dir.display());
    Ok(())
})
```
Extend with a spawned async task (D-06):
```rust
.setup(|app| {
    let app_data_dir = app.path().app_data_dir()
        .expect("failed to resolve app_data_dir");
    std::fs::create_dir_all(&app_data_dir).expect("failed to create app_data_dir");
    println!("[hobbyforge] app_data_dir = {}", app_data_dir.display());

    // D-06: import unit database on first launch or version mismatch
    let app_handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        match import_unit_database_inner(&app_handle).await {
            Ok(result) => println!("[hobbyforge] udb import ok: {:?}", result),
            Err(e) => eprintln!("[hobbyforge] udb import failed: {e}"),
        }
    });
    Ok(())
})
```
Where `import_unit_database_inner` is a standalone `async fn` (not a `#[tauri::command]`) that contains the version check + import logic. This avoids Tauri's command dispatcher overhead in setup.

**invoke_handler registration pattern** (lines 1183–1192):
```rust
.invoke_handler(tauri::generate_handler![
    bulk_sync_rules,
    export_backup,
    validate_backup,
    create_safety_backup,
    get_schema_version,
    restore_from_backup,
    list_safety_backups,
    write_bytes_to_path,
    // ADD:
    import_unit_database,
])
```

---

### `scripts/build-unit-db.ts` (utility, transform)

**Analog:** `scripts/sql-smoke-test.ts` (TypeScript module structure); `src/lib/parseWahapediaCsv.ts` (parser reuse)

**Note:** No `tsx` or `ts-node` is in devDependencies. The build script must be invoked as `node --experimental-strip-types scripts/build-unit-db.ts` (Node.js 22+, which supports TypeScript stripping natively) OR the planner must add `tsx` as a devDependency and use `pnpm tsx scripts/build-unit-db.ts`.

**Module structure pattern** (sql-smoke-test.ts lines 1–28 — file-level JSDoc + named export):
```typescript
/**
 * Build script for unit_database.json.
 * Dev-side only — never imported by app runtime code.
 * Usage: node --experimental-strip-types scripts/build-unit-db.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
```

**Parser reuse pattern** (`src/lib/parseWahapediaCsv.ts` lines 18–28):
```typescript
// Direct import — the parser is a pure function with no browser dependencies
import { parseWahapediaCsv } from "../src/lib/parseWahapediaCsv.ts";

// Usage:
const raw = readFileSync(resolve(dataDir, "Datasheets.csv"), "utf-8");
const rows = parseWahapediaCsv(raw);
```

**JSON output type** (from RESEARCH.md Pattern 5, D-05):
```typescript
interface UnitDatabaseJson {
  version: string;       // semver, e.g. "1.0.0"
  built_at: string;      // ISO 8601 timestamp
  game_system: string;   // "40k-10th"
  unit_count: number;
  faction_count: number;
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

**Validation pattern** (guard before JSON write — from CONTEXT.md specifics):
```typescript
// Validate completeness before emitting
const emptyFactions = output.factions.filter(f =>
  !output.units.some(u => u.faction_id === f.id)
);
if (emptyFactions.length > 0) {
  console.error("Factions with no units:", emptyFactions.map(f => f.id));
  process.exit(1);
}
if (output.units.length < 100) {
  console.error(`Only ${output.units.length} units — likely parse failure`);
  process.exit(1);
}
```

**XML parsing gap:** `DOMParser` is a browser API. BSData parsers (`fetchBsdataPoints.ts`, `parseBsdataExtended.ts`) use it. The build script must polyfill it before importing those modules:
```typescript
// At the very top of build-unit-db.ts, before any other imports:
import { DOMParser } from "@xmldom/xmldom";
// @ts-ignore — global polyfill for browser parsers running in Node.js context
(globalThis as any).DOMParser = DOMParser;
```
This requires `pnpm add -D @xmldom/xmldom`. Planner must include a human-verify checkpoint for this dependency (see RESEARCH.md Package Legitimacy Audit).

---

### `src-tauri/tauri.conf.json` (config)

**Analog:** Self — existing `bundle` section (lines 33–44)

**Current bundle section** (tauri.conf.json lines 33–44):
```json
"bundle": {
  "active": true,
  "targets": "all",
  "icon": [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon.icns",
    "icons/icon.ico"
  ],
  "createUpdaterArtifacts": true
}
```

**Required addition** — add `resources` field inside `bundle` (D-07):
```json
"bundle": {
  "active": true,
  "targets": "all",
  "icon": [ ... ],
  "createUpdaterArtifacts": true,
  "resources": {
    "data/unit_database.json": "data/unit_database.json"
  }
}
```

**Access at Rust runtime:**
```rust
let resource_dir = app.path().resource_dir()
    .map_err(|e| format!("resource_dir: {e}"))?;
let json_path = resource_dir.join("data/unit_database.json");
```

---

### `tests/data-layer/migration038.test.ts` (test)

**Analog:** `tests/data-layer/migration-parity.test.ts` (full file — 45 lines)

**Test file structure pattern** (migration-parity.test.ts lines 1–45):
```typescript
// @vitest-environment node

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createHobbyforgeDb,
  HOBBYFORGE_MIGRATION_COUNT,
} from "./db-helpers";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("migration parity", () => {
  it("all hobbyforge migrations execute without errors (D-04)", () => {
    const db = createHobbyforgeDb();
    db.close();
  });

  it("lib.rs migration count matches helper count (D-06)", () => {
    const libRs = readFileSync(
      resolve(repoRoot, "src-tauri/src/lib.rs"),
      "utf-8",
    );
    const matches = libRs.match(/Migration\s*\{/g);
    expect(matches?.length).toBe(
      HOBBYFORGE_MIGRATION_COUNT + RULES_MIGRATION_COUNT,
    );
  });
});
```

**New test pattern** for `migration038.test.ts` — table existence checks via `better-sqlite3`:
```typescript
// @vitest-environment node

import { describe, it, expect } from "vitest";
import { createHobbyforgeDb } from "./db-helpers";

describe("migration 038: udb schema", () => {
  it("creates all udb_* tables", () => {
    const db = createHobbyforgeDb();
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'udb_%'"
    ).all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain("udb_factions");
    expect(names).toContain("udb_units");
    expect(names).toContain("udb_unit_models");
    expect(names).toContain("udb_unit_weapons");
    expect(names).toContain("udb_unit_abilities");
    expect(names).toContain("udb_unit_keywords");
    expect(names).toContain("udb_unit_points");
    expect(names).toContain("udb_unit_composition");
    expect(names).toContain("udb_meta");
    db.close();
  });

  it("creates udb_search FTS5 virtual table", () => {
    const db = createHobbyforgeDb();
    const vt = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='udb_search'"
    ).get() as { name: string } | undefined;
    expect(vt?.name).toBe("udb_search");
    db.close();
  });

  it("udb_meta enforces CHECK (id = 1)", () => {
    const db = createHobbyforgeDb();
    expect(() => {
      db.prepare(
        "INSERT INTO udb_meta (id, version, built_at) VALUES (2, '1.0.0', '2026-05-29T00:00:00Z')"
      ).run();
    }).toThrow();
    db.close();
  });
});
```

---

### `tests/data-layer/db-helpers.ts` (modified — migration list)

**Analog:** Self — existing `HOBBYFORGE_MIGRATIONS` array (lines 12–49)

**Current state** (db-helpers.ts lines 46–49 — stops at 036):
```typescript
export const HOBBYFORGE_MIGRATIONS = [
  // ... 35 entries ...
  "036_unit_form_simplification.sql",
] as const;

export const HOBBYFORGE_MIGRATION_COUNT = HOBBYFORGE_MIGRATIONS.length; // 33
```

**Required modification** — add 037 (missing gap) and 038 (new):
```typescript
export const HOBBYFORGE_MIGRATIONS = [
  // ... existing 036 entries unchanged ...
  "036_unit_form_simplification.sql",
  "037_override_flags.sql",     // was missing — add in same commit as 038
  "038_udb_schema.sql",         // new
] as const;

export const HOBBYFORGE_MIGRATION_COUNT = HOBBYFORGE_MIGRATIONS.length; // 38
```

The comment on line 59 (`// 33`) is stale — it must be updated to `// 38`.

---

## Shared Patterns

### Direct sqlx Connection (not the plugin pool)
**Source:** `src-tauri/src/lib.rs` lines 497–504
**Apply to:** `import_unit_database` Rust command
```rust
let opts = SqliteConnectOptions::from_str(&db_url)
    .map_err(|e| format!("opts: {e}"))?
    .create_if_missing(false)
    .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
    .busy_timeout(std::time::Duration::from_secs(30));
let mut conn = opts.connect().await.map_err(|e| format!("connect: {e}"))?;
```
**Why:** tauri-plugin-sql pool connections hold stale WAL snapshots (documented incident). All bulk write commands must use a fresh direct connection.

### FK Toggle + Flat Transaction
**Source:** `src-tauri/src/lib.rs` lines 507–512
**Apply to:** `import_unit_database` Rust command
```rust
sqlx::query("PRAGMA foreign_keys = OFF")
    .execute(&mut conn).await
    .map_err(|e| format!("pragma fk off: {e}"))?;
let mut tx = conn.begin().await.map_err(|e| format!("begin: {e}"))?;
// ... all DELETEs and INSERTs use &mut *tx ...
tx.commit().await.map_err(|e| format!("commit: {e}"))?;
// FK is implicitly re-enabled on next connection open; explicitly set if needed
```
**Why:** SQLite FK pragma can be toggled before a transaction. The transaction is flat — no nested BEGIN inside the command (tauri-plugin-sql prohibition documented in PITFALLS.md).

### str_val / i64_val Helpers
**Source:** `src-tauri/src/lib.rs` lines 430–443
**Apply to:** `import_unit_database` INSERT loops
```rust
fn str_val(row: &JsRow, key: &str) -> Option<String> {
    row.get(key).and_then(|v| v.as_str()).filter(|s| !s.is_empty()).map(|s| s.to_string())
}
fn i64_val(row: &JsRow, key: &str) -> Option<i64> {
    row.get(key).and_then(|v| {
        if let Some(n) = v.as_i64() { return Some(n); }
        v.as_str()?.parse().ok()
    })
}
```
These are already defined in the file. Do not duplicate — reference them directly in the new command.

### Error String Pattern
**Source:** `src-tauri/src/lib.rs` lines 543–549
**Apply to:** All new Rust code in `import_unit_database`
```rust
.map_err(|e| format!("insert faction {id}: {e}"))?;
```
All `.map_err` calls include the operation name and key value for diagnosability.

### WAL Checkpoint After Bulk Write
**Source:** RESEARCH.md Pattern 1 (D-12)
**Apply to:** `import_unit_database`, after `tx.commit()`
```rust
sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
    .execute(&mut conn).await
    .map_err(|e| format!("wal_checkpoint: {e}"))?;
```
**Why:** Documented recurring incident — React app queries return 0 rows after bulk import without checkpoint. Same fix applied to `useRulesSync.ts`.

### Migration File Registration Pair
**Source:** `src-tauri/src/lib.rs` lines 6–231 + `tests/data-layer/db-helpers.ts` lines 12–49
**Apply to:** `038_udb_schema.sql` registration
Both files must be updated in the same commit. The migration parity test (`migration-parity.test.ts` line 33–37) will fail if either is missing.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src-tauri/data/unit_database.json` | static artifact | — | First bundled data artifact in the project; no equivalent resource file exists |

The JSON artifact structure is fully specified in RESEARCH.md Pattern 5 (D-05) and CONTEXT.md. Use those as the reference.

---

## Metadata

**Analog search scope:** `src-tauri/src/lib.rs`, `src-tauri/migrations/`, `tests/data-layer/`, `scripts/`, `src/lib/`
**Files scanned:** 8 source files read
**Pattern extraction date:** 2026-05-29

**Open items the planner must resolve:**
1. TypeScript runner for `build-unit-db.ts` — no `tsx` in devDependencies. Add `tsx` as devDep OR use `node --experimental-strip-types` (Node 22+). Verify Node version before choosing.
2. `@xmldom/xmldom` package — not yet installed. Planner must add a human-verify checkpoint before `pnpm add -D @xmldom/xmldom` (per RESEARCH.md Package Legitimacy Audit).
3. BSData .cat XML and Wahapedia CSV files must be pre-downloaded to `scripts/data/` before the build script runs — planner must include a manual download step.
4. `preflight_migration_repair()` in `lib.rs` line 401–424 — no change needed (it reads the migration list at runtime from `get_migrations()`; adding entry 038 there is sufficient).

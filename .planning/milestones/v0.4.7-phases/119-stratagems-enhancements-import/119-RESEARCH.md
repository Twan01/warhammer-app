# Phase 119: Stratagems & Enhancements Import - Research

**Researched:** 2026-06-04
**Domain:** Wahapedia CSV pipeline — TypeScript build script, Rust importer, SQLite migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `udb_stratagems` schema: `id TEXT PK`, `faction_id TEXT REFERENCES udb_factions(id)` (NULLABLE), `detachment_id TEXT REFERENCES udb_detachments(id)` (NULLABLE), `name TEXT NOT NULL`, `type TEXT`, `cp_cost INTEGER NOT NULL`, `turn TEXT`, `phase TEXT`, `description TEXT NOT NULL`
- **D-02:** Nullable FKs for `faction_id` and `detachment_id` on stratagems — universal/core rows (Boarding Actions, Command Re-roll) have empty values in CSV; imported as NULL
- **D-03:** Index `idx_udb_stratagems_faction_id` on `faction_id` and `idx_udb_stratagems_detachment_id` on `detachment_id`
- **D-04:** FK constraints use `ON DELETE SET NULL` — stratagems survive faction/detachment re-import with NULL FK
- **D-05:** `udb_enhancements` schema: `id TEXT PK`, `faction_id TEXT NOT NULL REFERENCES udb_factions(id)`, `detachment_id TEXT REFERENCES udb_detachments(id)` (NULLABLE), `name TEXT NOT NULL`, `cost INTEGER NOT NULL`, `description TEXT NOT NULL`
- **D-06:** `faction_id` NOT NULL for enhancements; `detachment_id` nullable as safety measure
- **D-07:** Index `idx_udb_enhancements_faction_id` and `idx_udb_enhancements_detachment_id`
- **D-08:** FK: `ON DELETE SET NULL` for `detachment_id`, `ON DELETE CASCADE` for `faction_id` on enhancements
- **D-09:** Filter out rows where `legend` column is truthy (consistent with prior phases)
- **D-10:** Add `"Stratagems.csv"` and `"Enhancements.csv"` to `REQUIRED_CSVs` in `build-unit-db.ts`
- **D-11:** Add Steps 12 (Stratagems.csv) and 13 (Enhancements.csv) after Step 11 in build pipeline
- **D-12:** Add `stratagems` and `enhancements` arrays to `UnitDatabaseJson` interface and JSON output
- **D-13:** Add `UdbStratagemRow` and `UdbEnhancementRow` types in `scripts/lib/types.ts`
- **D-14:** Same parsing steps in `update-unit-database.ts`
- **D-15:** Add `stratagems` and `enhancements` fields (`Vec<JsRow>`, `#[serde(default)]`) to `UnitDatabasePayload`
- **D-16:** DELETE both tables before detachments in `import_unit_database_inner()`; INSERT after detachments
- **D-17:** Add `stratagems: u64` and `enhancements: u64` to `UdbImportResult`
- **D-18:** New migration `043_udb_stratagems_enhancements.sql` — both tables in one file, DDL-only

### Claude's Discretion

- HTML sanitization approach for descriptions (keep as-is recommended, consistent with Phase 118)
- Console log format for stratagem/enhancement import stats
- Whether to validate FK references during build (warning vs error)
- Handling of `cp_cost` parsing for stratagems (some may be 0)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STR-01 | Stratagems imported from Stratagems.csv into udb_stratagems table (faction, detachment, name, CP cost, phase, turn, description) | Schema D-01, build pipeline D-10/D-11/D-12/D-13, Rust D-15/D-16/D-17, migration D-18 |
| STR-02 | Universal/core stratagems (empty faction_id) included alongside faction-specific ones | Nullable FK D-02, NULL handling in Rust INSERT verified |
| ENH-01 | Enhancements imported from Enhancements.csv into udb_enhancements table (faction, detachment, name, cost, description) | Schema D-05, build pipeline D-10/D-11/D-12/D-13, Rust D-15/D-16/D-17, migration D-18 |
</phase_requirements>

---

## Summary

Phase 119 is a pure data-pipeline phase: no UI, no new Tauri commands. It extends three existing systems — the TypeScript build script, the TypeScript types module, and the Rust importer — and adds one new SQL migration. All patterns are established by Phase 118 (detachments) and Phase 116 (pipeline foundation); this phase is a direct replication with two new entity types.

The CSV source data is already on disk: `Stratagems.csv` (1482 rows, 11 pipe-delimited columns) and `Enhancements.csv` (927 rows, 8 columns). Both have BOM on the first header, handled by the existing `parseWahapediaCsv()` parser.

**Critical pre-condition:** Migration 042 (`042_udb_detachments.sql`) exists on disk but is NOT yet registered in `get_migrations()` in `lib.rs`. The list currently ends at version 41. Phase 119 must register migration 042 first, then add 043. Skipping this will cause a SQLite schema mismatch at runtime since `udb_detachments` won't exist as the FK target for `udb_stratagems.detachment_id`.

**Primary recommendation:** Follow the Phase 118 detachment pattern exactly. Register migration 042 in lib.rs, add migration 043 for both new tables, extend both build scripts and types.ts, extend UnitDatabasePayload and UdbImportResult in Rust, and add DELETE+INSERT blocks in the correct FK order.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CSV parsing (Stratagems, Enhancements) | Dev-side build script | — | Offline pipeline; no runtime CSV parsing |
| Schema creation (udb_stratagems, udb_enhancements) | SQLite migration | — | DDL-only migration, auto-run at startup |
| JSON payload serialization | TypeScript build script | — | Emits to unit_database.json |
| JSON payload deserialization + DB import | Rust (lib.rs) | — | Tauri command + setup hook |
| Index creation | SQLite migration | — | Part of migration 043 DDL |
| Legends filtering | TypeScript build script | — | Pre-import, dev-side |

---

## Standard Stack

No new packages required for this phase. All tools are already in the project.

### Core (all already installed)
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Node.js `--experimental-strip-types` | runtime | TypeScript build scripts | No tsc compile step needed |
| `scripts/lib/parseCsv.ts` | project | Pipe-delimited CSV parser | BOM fix already in place |
| `scripts/lib/bsdata.ts` | project | `readCsvFile()` wrapper | Used for all CSV reads |
| `sqlx` (Rust) | Cargo.toml | Async SQLite in Rust | Already in scope |
| `serde_json` (Rust) | Cargo.toml | JSON deserialization | Already in scope |

### Package Legitimacy Audit

No new packages are installed in this phase — the entire implementation reuses existing project dependencies.

---

## Architecture Patterns

### System Architecture Diagram

```
scripts/data/Stratagems.csv  ──┐
scripts/data/Enhancements.csv ─┤
                                ↓
                    build-unit-db.ts  (Step 12, 13)
                    update-unit-database.ts (same steps)
                                ↓
                    unit_database.json
                    (adds stratagems[], enhancements[] arrays)
                                ↓
                    Rust: import_unit_database_inner()
                    UnitDatabasePayload deserialization
                                ↓
                    SQLite transaction:
                    DELETE udb_stratagems
                    DELETE udb_enhancements
                    DELETE udb_detachment_abilities
                    DELETE udb_detachments
                    DELETE udb_factions  (etc.)
                                ↓
                    INSERT udb_factions
                    INSERT udb_units  (etc.)
                    INSERT udb_detachments
                    INSERT udb_detachment_abilities
                    INSERT udb_stratagems      ← NEW
                    INSERT udb_enhancements    ← NEW
                    INSERT udb_meta
                    Rebuild FTS5 udb_search
```

### Recommended Project Structure

No new directories. Changes are confined to:

```
scripts/
  build-unit-db.ts           # add REQUIRED_CSVs + Steps 12/13 + output fields
  update-unit-database.ts    # same additions
  lib/
    types.ts                 # add UdbStratagemRow, UdbEnhancementRow, extend UnitDatabaseJson

src-tauri/
  src/lib.rs                 # register migrations 042+043, extend structs + import fn
  migrations/
    042_udb_detachments.sql  # already exists — register in lib.rs
    043_udb_stratagems_enhancements.sql   # NEW
```

### Pattern 1: CSV Parsing Step (replicate from Step 11)

**What:** Read CSV, filter legends, map to typed rows, push to array.

```typescript
// Source: scripts/build-unit-db.ts Step 11 (detachments pattern)
// Step 12: Parse Stratagems.csv
console.log("Step 12: Parsing Stratagems.csv...");
const stratagems_raw = readCsvFile(DATA_DIR, "Stratagems.csv");
const stratagems: UdbStratagemRow[] = [];
let stratagemLegendsSkipped = 0;

for (const row of stratagems_raw) {
  const id = row["id"]?.trim();
  const name = row["name"]?.trim();
  if (!id || !name) continue;

  const isLegend = row["legend"] === "1" || row["legend"] === "true";
  if (isLegend) { stratagemLegendsSkipped++; continue; }

  stratagems.push({
    id,
    faction_id: row["faction_id"]?.trim() || null,     // NULL for universal
    detachment_id: row["detachment_id"]?.trim() || null, // NULL for universal
    name,
    type: row["type"]?.trim() ?? "",
    cp_cost: parseInt(row["cp_cost"]?.trim() ?? "0", 10) || 0,
    turn: row["turn"]?.trim() ?? "",
    phase: row["phase"]?.trim() ?? "",
    description: row["description"]?.trim() ?? "",
  });
}
console.log(`  Parsed ${stratagems.length} stratagems (${stratagemLegendsSkipped} Legends excluded)`);
```

**Key detail:** `faction_id` and `detachment_id` must be converted from empty string to `null` — the CSV delivers `""` for universal stratagems, but the DB schema expects `NULL` for nullable FK columns.

### Pattern 2: TypeScript Row Types (replicate from UdbDetachmentRow)

```typescript
// Source: scripts/lib/types.ts — add after UdbDetachmentAbilityRow

export interface UdbStratagemRow {
  id: string;
  faction_id: string | null;      // NULL for universal/core stratagems
  detachment_id: string | null;   // NULL for universal/core stratagems
  name: string;
  type: string;
  cp_cost: number;
  turn: string;
  phase: string;
  description: string;            // raw HTML — kept as-is per D-09
}

export interface UdbEnhancementRow {
  id: string;
  faction_id: string;             // always populated
  detachment_id: string | null;   // nullable safety measure
  name: string;
  cost: number;
  description: string;            // raw HTML — kept as-is
}
```

### Pattern 3: Migration DDL (replicate from 042_udb_detachments.sql)

```sql
-- src-tauri/migrations/043_udb_stratagems_enhancements.sql
-- DDL only — no INSERTs (boot-loop prevention per migration 038 precedent).

CREATE TABLE IF NOT EXISTS udb_stratagems (
  id            TEXT PRIMARY KEY,
  faction_id    TEXT REFERENCES udb_factions(id) ON DELETE SET NULL,
  detachment_id TEXT REFERENCES udb_detachments(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  type          TEXT,
  cp_cost       INTEGER NOT NULL DEFAULT 0,
  turn          TEXT,
  phase         TEXT,
  description   TEXT NOT NULL,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS udb_enhancements (
  id            TEXT PRIMARY KEY,
  faction_id    TEXT NOT NULL REFERENCES udb_factions(id) ON DELETE CASCADE,
  detachment_id TEXT REFERENCES udb_detachments(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  cost          INTEGER NOT NULL DEFAULT 0,
  description   TEXT NOT NULL,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_udb_stratagems_faction_id
  ON udb_stratagems(faction_id);

CREATE INDEX IF NOT EXISTS idx_udb_stratagems_detachment_id
  ON udb_stratagems(detachment_id);

CREATE INDEX IF NOT EXISTS idx_udb_enhancements_faction_id
  ON udb_enhancements(faction_id);

CREATE INDEX IF NOT EXISTS idx_udb_enhancements_detachment_id
  ON udb_enhancements(detachment_id);
```

**Note on `ON DELETE SET NULL` with `NOT NULL NULLABLE` conflict:** The `ON DELETE SET NULL` on `udb_enhancements.faction_id` cannot coexist with `NOT NULL` — SQLite will reject rows where `faction_id` is NULL due to the NOT NULL constraint. Since ENH rows always have a faction, this combination is fine: `ON DELETE CASCADE` is used instead (D-08) for `faction_id` on enhancements.

### Pattern 4: Rust Struct Extension

```rust
// Source: src-tauri/src/lib.rs — extend UnitDatabasePayload
#[derive(serde::Deserialize)]
pub struct UnitDatabasePayload {
    // ... existing fields ...
    #[serde(default)]
    detachment_abilities: Vec<JsRow>,
    #[serde(default)]
    stratagems: Vec<JsRow>,         // NEW
    #[serde(default)]
    enhancements: Vec<JsRow>,       // NEW
}

// Extend UdbImportResult
#[derive(serde::Serialize, Debug)]
pub struct UdbImportResult {
    // ... existing fields ...
    pub detachment_abilities: u64,
    pub stratagems: u64,            // NEW
    pub enhancements: u64,          // NEW
}
```

### Pattern 5: Rust DELETE/INSERT Order

The FK dependency graph requires this exact order:
- `udb_stratagems` FKs → `udb_factions`, `udb_detachments`
- `udb_enhancements` FKs → `udb_factions`, `udb_detachments`

**DELETE order** (with FK OFF — order doesn't technically matter but convention is leaf-first):
```rust
// Add before existing "udb_detachment_abilities" in the for loop:
"udb_stratagems",
"udb_enhancements",
"udb_detachment_abilities",
"udb_detachments",
// ... rest unchanged
```

**INSERT order** (FK ON after commit — must insert parents before children):
```
INSERT udb_detachments        (existing)
INSERT udb_detachment_abilities (existing)
INSERT udb_stratagems         ← NEW (after detachments)
INSERT udb_enhancements       ← NEW (after detachments)
```

### Pattern 6: Rust INSERT Block for Stratagems

```rust
// INSERT stratagems
for row in &payload.stratagems {
    let id = str_val(row, "id").unwrap_or_default();
    if id.is_empty() { continue; }
    let res = sqlx::query(
        "INSERT INTO udb_stratagems \
         (id, faction_id, detachment_id, name, type, cp_cost, turn, phase, description) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(str_val(row, "faction_id"))           // Option<String> → NULL if None
    .bind(str_val(row, "detachment_id"))         // Option<String> → NULL if None
    .bind(str_val(row, "name").unwrap_or_default())
    .bind(str_val(row, "type"))
    .bind(i64_val(row, "cp_cost").unwrap_or(0))
    .bind(str_val(row, "turn"))
    .bind(str_val(row, "phase"))
    .bind(str_val(row, "description").unwrap_or_default())
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("insert stratagem {id}: {e}"))?;
    counts.stratagems += res.rows_affected();
}
```

**Critical detail:** `str_val()` returns `Option<String>` — it filters empty strings to `None`. Binding `None` via sqlx maps to SQL `NULL`. This is the exact behavior needed for nullable FK columns. No special handling is needed.

### Pattern 7: Migration Registration in lib.rs

```rust
// In get_migrations(), after version 41 (udb_sub_faction_fr):
Migration {
    version: 42,
    description: "udb_detachments",
    sql: include_str!("../migrations/042_udb_detachments.sql"),
    kind: MigrationKind::Up,
},
Migration {
    version: 43,
    description: "udb_stratagems_enhancements",
    sql: include_str!("../migrations/043_udb_stratagems_enhancements.sql"),
    kind: MigrationKind::Up,
},
```

### Anti-Patterns to Avoid

- **Inserting stratagems before detachments:** Even with FK OFF during DELETE, the INSERT phase runs with normal FK enforcement after the transaction commits. Stratagems FK to detachments — insert detachments first.
- **Treating empty string as NULL at the SQL level:** Binding `""` instead of `None` to a nullable FK column will fail the FK check (no faction with id ""). Always use `str_val()` which returns `None` for empty strings.
- **Skipping migration 042 registration:** Migration 043 creates `udb_stratagems` with an FK to `udb_detachments`. If 042 was never applied (because it was never registered), the schema won't have `udb_detachments` and migration 043 will fail. Register 042 and 043 together.
- **Modifying existing migration files:** Never edit `042_udb_detachments.sql` — sqlx stores SHA-384 checksums; any change triggers a boot-loop. If schema adjustments are needed, add a new migration.
- **Legends field in Detachment_abilities.csv vs other CSVs:** The CONTEXT.md notes that the `legend` column in `Detachment_abilities.csv` contains lore text (NOT a boolean flag). This is NOT the case for `Stratagems.csv` and `Enhancements.csv` — those use `legend` as a boolean filter consistent with `Datasheets.csv`. Apply `legend === "1"` filter only for Stratagems and Enhancements.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom parser | `readCsvFile()` + `parseWahapediaCsv()` | BOM handling, pipe-delimiter, already battle-tested |
| NULL FK handling | Manual empty-string check per field | `str_val()` helper | Returns `Option<String>`, binds as SQL NULL automatically |
| Integer parsing from CSV | Custom parseInt per field | `i64_val()` helper | Handles both numeric JSON and string CSV values |
| Atomic import | Multi-statement exec | `conn.begin()` / `tx.commit()` | Single transaction, FK enforcement restored on failure |

---

## Runtime State Inventory

Not applicable — this is a greenfield data-pipeline phase adding new tables, not renaming/refactoring existing state.

---

## Common Pitfalls

### Pitfall 1: Migration 042 Not Registered

**What goes wrong:** Runtime panics with "no such table: udb_detachments" when migration 043 attempts to create FKs referencing it.
**Why it happens:** `get_migrations()` ends at version 41; `042_udb_detachments.sql` exists on disk but is never executed.
**How to avoid:** Add both version 42 and version 43 entries to `get_migrations()` in lib.rs as part of this phase.
**Warning signs:** App startup error mentioning `udb_detachments` or FK constraint failure in migration 043.

### Pitfall 2: Empty String Bound as FK Value

**What goes wrong:** `faction_id = ""` triggers a FK constraint violation on INSERT (no faction with empty ID exists).
**Why it happens:** Universal stratagems have empty `faction_id` in the CSV. If the build script sets `faction_id: ""` instead of `null`, and the Rust code binds `str_val(row, "faction_id").unwrap_or_default()` instead of `str_val(row, "faction_id")`, the result is `""` bound to the column.
**How to avoid:** In TypeScript, convert `row["faction_id"]?.trim() || null`. In Rust, bind `str_val(row, "faction_id")` (no `.unwrap_or_default()`). `str_val()` already filters empty strings to `None`, which sqlx maps to NULL.
**Warning signs:** Import fails with FK constraint error on `udb_stratagems` insert.

### Pitfall 3: UdbImportResult Struct Initialization Misses New Fields

**What goes wrong:** Rust compilation error "missing fields in struct initializer" for `UdbImportResult`.
**Why it happens:** `UdbImportResult` is initialized in two places in lib.rs — the early-return path (version match, lines ~562-567) and the normal path (lines ~578-582). Adding fields to the struct without updating both initializers causes a compile error.
**How to avoid:** Search for all occurrences of `UdbImportResult {` and add `stratagems: 0, enhancements: 0` to all of them.
**Warning signs:** `cargo build` fails with "missing field `stratagems`".

### Pitfall 4: Build Summary Block Doesn't Print New Counts

**What goes wrong:** Build completes but new entity counts aren't visible in build output.
**Why it happens:** The summary `console.log` block in `build-unit-db.ts` (around line 614-626) lists all entity counts. If `stratagems` and `enhancements` are omitted, debugging import failures requires manual JSON inspection.
**How to avoid:** Add summary lines for stratagems and enhancements alongside the existing detachments summary.

### Pitfall 5: Hash Computation Excludes New Arrays

**What goes wrong:** Database re-import is not triggered when only stratagem/enhancement data changes because the content hash misses those arrays.
**Why it happens:** The hash in `build-unit-db.ts` (line ~663) is computed over a hardcoded object literal. Adding `stratagems` and `enhancements` to the JSON output but forgetting to include them in the hash object means the version won't change when stratagem data changes.
**How to avoid:** Include `stratagems` and `enhancements` in the object passed to `createHash`.

### Pitfall 6: update-unit-database.ts Out of Sync

**What goes wrong:** `pnpm update:udb` produces different output than `pnpm build:udb`, causing confusing diffs.
**Why it happens:** Both scripts are parallel implementations. Phase 118 added detachment parsing to both; Phase 119 must do the same.
**How to avoid:** Apply identical changes to both `build-unit-db.ts` and `update-unit-database.ts`. The REQUIRED_CSVs array, parsing steps, and output struct must match exactly.

---

## Code Examples

### Verified: CSV column headers from actual data files

```
# Stratagems.csv (confirmed by head -1):
faction_id|name|id|type|cp_cost|legend|turn|phase|detachment|detachment_id|description

# Enhancements.csv (confirmed by head -1):
faction_id|id|name|cost|detachment|detachment_id|legend|description
```

Key observations: [VERIFIED: direct file read]
- Stratagems: `detachment` is the name string, `detachment_id` is the FK reference. Phase needs `detachment_id`, not `detachment`.
- Enhancements: same pattern — use `detachment_id` column for the FK, ignore `detachment` name column.
- `cp_cost` is the column name for stratagems (not `cost`); `cost` is for enhancements.
- `legend` column position differs between CSVs but name is consistent.
- Universal stratagems have `faction_id = ""` and `detachment_id = ""` in the CSV (confirmed by row 2 of Stratagems.csv: `|EXPLOSIVE CLEARANCE|000009218006|Boarding Actions – Battle Tactic Stratagem|1|...|||`).

### Verified: Data counts

- Stratagems.csv: 1482 data rows (1483 lines - 1 header) [VERIFIED: wc -l]
- Enhancements.csv: 927 data rows (928 lines - 1 header) [VERIFIED: wc -l]

### Verified: Rust `str_val()` returns `Option<String>` — binds as NULL

```rust
// Source: src-tauri/src/lib.rs line ~462-467
fn str_val(row: &JsRow, key: &str) -> Option<String> {
    row.get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())   // empty string → None → SQL NULL
        .map(|s| s.to_string())
}
```

Binding `Option<String>` with `.bind(str_val(row, "faction_id"))` produces SQL NULL when the value is empty. This is the correct pattern for all nullable FK columns.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BSData XML for stratagems | Wahapedia CSV direct import | Phase 116+ | Reliable, structured, offline |
| Runtime CSV sync | Pre-built JSON shipped as Tauri resource | Phase 103+ | No network at runtime |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Migration 042 is not yet registered in `get_migrations()` — confirmed by reading lib.rs which ends at version 41 | Pitfall 1 | If it is registered, adding it again would cause a duplicate version error; easy to verify before implementing |
| A2 | `legend` in Stratagems.csv and Enhancements.csv is a boolean-style filter (same as Datasheets.csv), unlike Detachment_abilities.csv where it is lore text | Architecture Patterns | Stratagems/enhancements with `legend=1` would be included if filtering is skipped — confirmed by CONTEXT.md D-09 |

---

## Open Questions

1. **Does `cp_cost` ever contain non-integer values in the CSV?**
   - What we know: CONTEXT.md notes "some may be 0 for certain types". The CSV shows `1` for the first Boarding Actions stratagem.
   - What's unclear: Whether Wahapedia uses fractional or string values for any CP costs.
   - Recommendation: `parseInt(...) || 0` is safe — any non-numeric value produces 0 rather than NaN.

2. **Should the build script warn when stratagem `faction_id` or `detachment_id` references a faction/detachment not in the current build?**
   - What we know: CONTEXT.md marks this as "Claude's discretion" (warning vs error).
   - Recommendation: Emit a `console.warn` (not error) for unknown FK references — consistent with how units with unknown faction_id are handled in Step 3 (they are skipped with a warn). For stratagems this might be more permissive since universal stratagems have NULL faction_id intentionally.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | TypeScript build scripts | Yes | runtime | — |
| Stratagems.csv | Step 12 parsing | Yes | 1482 rows | `process.exit(1)` via REQUIRED_CSVs check |
| Enhancements.csv | Step 13 parsing | Yes | 927 rows | `process.exit(1)` via REQUIRED_CSVs check |
| Rust/Cargo | lib.rs compilation | Yes | project | — |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| STR-01 | Stratagems CSV parsed and JSON output contains stratagems array | Manual (build script) | `node --experimental-strip-types scripts/build-unit-db.ts` | No unit test needed — build script is the test |
| STR-02 | Universal stratagems (empty faction_id) present in output with null faction_id | Manual (inspect JSON) | `node -e "const d=require('./src-tauri/data/unit_database.json'); console.log(d.stratagems.filter(s=>s.faction_id===null).length)"` | Inspect output JSON post-build |
| ENH-01 | Enhancements CSV parsed and JSON output contains enhancements array | Manual (build script) | Same as STR-01 | |

**Note:** The existing test suite covers React components and hooks — it does not test the build pipeline scripts. Validation for this phase is build-script execution + JSON output inspection + Tauri dev launch confirming no migration errors.

### Wave 0 Gaps

None — no new test files needed. This phase is validated by:
1. Running `pnpm build:udb` successfully with no errors
2. Inspecting the JSON output for `stratagems` and `enhancements` arrays with expected row counts (~1400+ and ~900+)
3. Running `pnpm tauri dev` and confirming no migration panics

---

## Security Domain

This phase has no user-facing inputs, no authentication, and no network calls. The only security-relevant concern is the DDL migration:
- SQL injection: N/A — migration SQL is static, not parameterized
- FK constraints: enforced at the SQLite level via migration DDL
- ASVS V5 (input validation): HTML in description fields is stored as-is (raw Wahapedia HTML) — this is by design; rendering safety is Phase 120's concern

---

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/lib.rs` — read directly: current migration list ends at v41, Rust struct/import patterns
- `src-tauri/migrations/042_udb_detachments.sql` — read directly: DDL pattern to replicate
- `src-tauri/migrations/038_udb_schema.sql` — read directly: udb_* table conventions
- `scripts/build-unit-db.ts` — read directly: Step 11 detachment pattern for Steps 12/13
- `scripts/lib/types.ts` — read directly: existing row type interfaces
- `scripts/lib/parseCsv.ts` — read directly: parser API
- `scripts/data/Stratagems.csv` header + sample row — read directly
- `scripts/data/Enhancements.csv` header + sample row — read directly

### Secondary (MEDIUM confidence)
- `.planning/phases/119-stratagems-enhancements-import/119-CONTEXT.md` — locked decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing project code, directly read
- Architecture: HIGH — direct replication of Phase 118 pattern, code verified
- Pitfalls: HIGH — migration 042 gap confirmed by reading lib.rs; empty-string FK pitfall confirmed by reading str_val() implementation
- CSV column names: HIGH — verified by reading actual file headers

**Research date:** 2026-06-04
**Valid until:** Until next Wahapedia CSV format change (stable, no expiry concern)

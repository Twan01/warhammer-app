# Phase 119: Stratagems & Enhancements Import - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 5 files modified, 1 file created
**Analogs found:** 5 / 6 (new migration has no prior analog — uses DDL-only pattern from 042)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/lib/types.ts` | model (type definitions) | transform | itself — extend existing row types | exact (add to existing) |
| `scripts/build-unit-db.ts` | utility (build pipeline) | batch/transform | itself — Step 11 (detachments, lines 574–609) | exact (replicate pattern) |
| `scripts/update-unit-database.ts` | utility (build pipeline) | batch/transform | itself — same detachment steps | exact (replicate pattern) |
| `src-tauri/src/lib.rs` | service (Rust importer) | batch/CRUD | itself — detachments INSERT block (lines 764–796) | exact (replicate pattern) |
| `src-tauri/migrations/043_udb_stratagems_enhancements.sql` | migration (DDL) | batch | `src-tauri/migrations/042_udb_detachments.sql` | exact (DDL-only pattern) |

---

## Pattern Assignments

### `scripts/lib/types.ts` — Add `UdbStratagemRow`, `UdbEnhancementRow`, extend `UnitDatabaseJson`

**Analog:** `scripts/lib/types.ts` lines 89–154 (existing `UdbDetachmentRow`, `UdbDetachmentAbilityRow`, `UnitDatabaseJson`)

**Existing row type pattern to replicate** (lines 89–101):
```typescript
export interface UdbDetachmentRow {
  id: string;           // Wahapedia detachment_id (TEXT PK)
  faction_id: string;
  name: string;
}

export interface UdbDetachmentAbilityRow {
  id: string;           // Wahapedia ability id (TEXT PK)
  detachment_id: string;
  faction_id: string;
  name: string;
  description: string;  // Raw HTML from Wahapedia — kept as-is for UI rendering (Phase 120)
}
```

**New types to add after `UdbDetachmentAbilityRow`:**
```typescript
export interface UdbStratagemRow {
  id: string;
  faction_id: string | null;      // NULL for universal/core stratagems (Boarding Actions etc.)
  detachment_id: string | null;   // NULL for universal/core stratagems
  name: string;
  type: string;                   // e.g. "Battle Tactic Stratagem", "Epic Deed Stratagem"
  cp_cost: number;
  turn: string;                   // e.g. "Your turn", "Either player's turn"
  phase: string;                  // e.g. "Shooting phase", "Any phase"
  description: string;            // Raw HTML — kept as-is for UI rendering (Phase 120)
}

export interface UdbEnhancementRow {
  id: string;
  faction_id: string;             // always populated (NOT NULL in schema)
  detachment_id: string | null;   // nullable safety measure
  name: string;
  cost: number;
  description: string;            // Raw HTML — kept as-is
}
```

**`UnitDatabaseJson` interface extension** (append after `detachment_abilities` at line 154):
```typescript
// In UnitDatabaseJson interface — add two new array fields after detachment_abilities:
detachments: UdbDetachmentRow[];
detachment_abilities: UdbDetachmentAbilityRow[];
stratagems: UdbStratagemRow[];       // NEW
enhancements: UdbEnhancementRow[];   // NEW
```

Also add to imports at top of `build-unit-db.ts` and `update-unit-database.ts`:
```typescript
import type {
  // ... existing ...
  UdbDetachmentRow,
  UdbDetachmentAbilityRow,
  UdbStratagemRow,    // NEW
  UdbEnhancementRow,  // NEW
  UnitDatabaseJson,
  // ...
} from "./lib/types.ts";
```

---

### `scripts/build-unit-db.ts` — Add Steps 12 and 13, extend REQUIRED_CSVs, summary, hash, output

**Analog:** `scripts/build-unit-db.ts` lines 574–609 (Step 11 detachment parsing), lines 585–596 (DELETE list pattern), lines 613–625 (summary block), lines 662–663 (hash), lines 666–682 (output object)

**REQUIRED_CSVs extension** (lines 62–71 — insert before `as const`):
```typescript
const REQUIRED_CSVs = [
  "Factions.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Datasheets_wargear.csv",
  "Detachment_abilities.csv",
  "Stratagems.csv",    // NEW
  "Enhancements.csv",  // NEW
] as const;
```

**Step 12 — Stratagems parsing (replicate from Step 11 at lines 574–609):**
```typescript
// ---------------------------------------------------------------------------
// Step 12: Parse Stratagems.csv -> udb_stratagems rows
// D-09: Filter Legends. D-02: Empty faction_id/detachment_id → null (nullable FK).
// ---------------------------------------------------------------------------
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
    faction_id: row["faction_id"]?.trim() || null,      // "" → null for universal stratagems
    detachment_id: row["detachment_id"]?.trim() || null, // "" → null for universal stratagems
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

**Step 13 — Enhancements parsing (same pattern):**
```typescript
// ---------------------------------------------------------------------------
// Step 13: Parse Enhancements.csv -> udb_enhancements rows
// D-09: Filter Legends. D-06: faction_id always populated.
// ---------------------------------------------------------------------------
console.log("Step 13: Parsing Enhancements.csv...");
const enhancements_raw = readCsvFile(DATA_DIR, "Enhancements.csv");
const enhancements: UdbEnhancementRow[] = [];
let enhancementLegendsSkipped = 0;

for (const row of enhancements_raw) {
  const id = row["id"]?.trim();
  const name = row["name"]?.trim();
  const faction_id = row["faction_id"]?.trim();
  if (!id || !name || !faction_id) continue;

  const isLegend = row["legend"] === "1" || row["legend"] === "true";
  if (isLegend) { enhancementLegendsSkipped++; continue; }

  enhancements.push({
    id,
    faction_id,
    detachment_id: row["detachment_id"]?.trim() || null,
    name,
    cost: parseInt(row["cost"]?.trim() ?? "0", 10) || 0,
    description: row["description"]?.trim() ?? "",
  });
}
console.log(`  Parsed ${enhancements.length} enhancements (${enhancementLegendsSkipped} Legends excluded)`);
```

**Summary block extension** (lines 614–625 — add after `detachmentAbilities` line):
```typescript
console.log("  Detachments:     " + detachments.length);
console.log("  Det. abilities:  " + detachmentAbilities.length);
console.log("  Stratagems:      " + stratagems.length);     // NEW
console.log("  Enhancements:    " + enhancements.length);   // NEW
```

**Hash computation extension** (line 663 — include new arrays to detect data changes):
```typescript
// Before:
const hash = createHash("sha256").update(JSON.stringify({
  factions, units, weapons, points, abilities, keywords, composition,
  detachments, detachmentAbilities
})).digest("hex").slice(0, 8);

// After (add stratagems and enhancements):
const hash = createHash("sha256").update(JSON.stringify({
  factions, units, weapons, points, abilities, keywords, composition,
  detachments, detachmentAbilities, stratagems, enhancements
})).digest("hex").slice(0, 8);
```

**Output object extension** (lines 666–682 — append two new fields after `detachment_abilities`):
```typescript
const output: UnitDatabaseJson = {
  version: buildVersion,
  built_at: new Date().toISOString(),
  game_system: "40k-10th",
  unit_count: units.length,
  faction_count: factions.length,
  factions,
  units,
  models,
  weapons,
  abilities,
  keywords,
  points,
  composition,
  detachments,
  detachment_abilities: detachmentAbilities,
  stratagems,       // NEW
  enhancements,     // NEW
};
```

---

### `scripts/update-unit-database.ts` — Identical changes to build-unit-db.ts

**Analog:** `scripts/update-unit-database.ts` lines 79–87 (REQUIRED_CSVs) and the buildUnitDatabase() function which mirrors build-unit-db.ts

Apply the exact same changes as build-unit-db.ts:
1. Add `"Stratagems.csv"` and `"Enhancements.csv"` to `REQUIRED_CSVs` (lines 79–87)
2. Add identical Steps 12 and 13 parsing blocks after the detachment parsing step
3. Add `UdbStratagemRow` and `UdbEnhancementRow` to the `import type` block (lines 25–37)
4. Extend the `UnitDatabaseJson` output object with `stratagems` and `enhancements` arrays

The update script's `buildUnitDatabase()` function uses the identical pipeline structure as `build-unit-db.ts` — the detachment parsing step appears at approximately the same relative position.

---

### `src-tauri/src/lib.rs` — Extend structs + DELETE list + INSERT blocks + migration registration

**Analog:** `src-tauri/src/lib.rs` lines 476–517 (structs), lines 585–601 (DELETE loop), lines 764–796 (detachment INSERT blocks)

**`UnitDatabasePayload` struct extension** (lines 476–503 — add after `detachment_abilities` field):
```rust
#[derive(serde::Deserialize)]
pub struct UnitDatabasePayload {
    // ... existing fields unchanged through line 502 ...
    #[serde(default)]
    detachment_abilities: Vec<JsRow>,
    #[serde(default)]
    stratagems: Vec<JsRow>,         // NEW
    #[serde(default)]
    enhancements: Vec<JsRow>,       // NEW
}
```

**`UdbImportResult` struct extension** (lines 505–517 — add after `detachment_abilities` field):
```rust
#[derive(serde::Serialize, Debug)]
pub struct UdbImportResult {
    pub factions: u64,
    pub units: u64,
    pub models: u64,
    pub weapons: u64,
    pub abilities: u64,
    pub keywords: u64,
    pub points: u64,
    pub composition: u64,
    pub detachments: u64,
    pub detachment_abilities: u64,
    pub stratagems: u64,    // NEW
    pub enhancements: u64,  // NEW
}
```

**CRITICAL: Both `UdbImportResult` initializations** must be updated (Pitfall 3 from RESEARCH.md). Search for `UdbImportResult {` — there are two:
- Lines 562–566 (early-return / version-match path)
- Lines 578–582 (normal import path)

Both must gain `stratagems: 0, enhancements: 0`.

**DELETE list extension** (lines 585–601 — add two new tables before `udb_detachment_abilities`):
```rust
for table in [
    "udb_unit_keywords",
    "udb_unit_points",
    "udb_unit_composition",
    "udb_unit_abilities",
    "udb_unit_weapons",
    "udb_unit_models",
    "udb_units",
    "udb_stratagems",           // NEW — before detachment_abilities (FK child)
    "udb_enhancements",         // NEW — before detachment_abilities (FK child)
    "udb_detachment_abilities",
    "udb_detachments",
    "udb_factions",
    "udb_meta",
] {
```

**INSERT block for stratagems** (insert after line 796, after detachment_abilities INSERT block):
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
    .bind(str_val(row, "faction_id"))           // Option<String> — None binds as SQL NULL
    .bind(str_val(row, "detachment_id"))         // Option<String> — None binds as SQL NULL
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

**INSERT block for enhancements** (insert immediately after stratagems block):
```rust
// INSERT enhancements
for row in &payload.enhancements {
    let id = str_val(row, "id").unwrap_or_default();
    if id.is_empty() { continue; }
    let res = sqlx::query(
        "INSERT INTO udb_enhancements \
         (id, faction_id, detachment_id, name, cost, description) \
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(str_val(row, "faction_id").unwrap_or_default())  // NOT NULL — unwrap required
    .bind(str_val(row, "detachment_id"))                    // Option<String> — None → SQL NULL
    .bind(str_val(row, "name").unwrap_or_default())
    .bind(i64_val(row, "cost").unwrap_or(0))
    .bind(str_val(row, "description").unwrap_or_default())
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("insert enhancement {id}: {e}"))?;
    counts.enhancements += res.rows_affected();
}
```

**Migration registration** (lines 248–254 — add after version 41 entry, before the closing `]`):
```rust
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

---

### `src-tauri/migrations/043_udb_stratagems_enhancements.sql` — New migration (DDL only)

**Analog:** `src-tauri/migrations/042_udb_detachments.sql` (full file, 24 lines)

The analog pattern (from 042):
- `CREATE TABLE IF NOT EXISTS` with `TEXT PRIMARY KEY`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))` on each table
- `CREATE INDEX IF NOT EXISTS` for each FK column
- DDL-only — no INSERTs (boot-loop prevention)

**Full content for `043_udb_stratagems_enhancements.sql`:**
```sql
-- Migration 043: Stratagems and Enhancements
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

---

## Shared Patterns

### Legends Filtering (boolean)
**Source:** `scripts/build-unit-db.ts` lines 153–157 (Step 3 units parsing)
**Apply to:** Steps 12 (Stratagems) and 13 (Enhancements)
**Note:** This is different from `Detachment_abilities.csv` where the `legend` column contains lore text. For Stratagems.csv and Enhancements.csv, `legend` is a boolean filter (`"1"` = Legends, skip row).
```typescript
const isLegend = row["legend"] === "1" || row["legend"] === "true";
if (isLegend) { legendsSkipped++; continue; }
```

### Nullable FK — Empty String to null Conversion
**Source:** RESEARCH.md Pattern 1 / Pitfall 2
**Apply to:** `faction_id` and `detachment_id` in stratagem TypeScript parsing
```typescript
faction_id: row["faction_id"]?.trim() || null,      // "" → null
detachment_id: row["detachment_id"]?.trim() || null, // "" → null
```

### Rust str_val() Null Propagation
**Source:** `src-tauri/src/lib.rs` lines 462–467
**Apply to:** All nullable FK `.bind()` calls in Rust INSERT blocks
```rust
fn str_val(row: &JsRow, key: &str) -> Option<String> {
    row.get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())   // empty string → None → SQL NULL
        .map(|s| s.to_string())
}
// Binding pattern for nullable FK:
.bind(str_val(row, "faction_id"))     // Option<String> — sqlx maps None to SQL NULL
// Binding pattern for NOT NULL column:
.bind(str_val(row, "faction_id").unwrap_or_default())
```

### Rust i64_val() for Integer CSV Columns
**Source:** `src-tauri/src/lib.rs` lines 469–474
**Apply to:** `cp_cost` (stratagems) and `cost` (enhancements) in Rust INSERT blocks
```rust
fn i64_val(row: &JsRow, key: &str) -> Option<i64> {
    row.get(key).and_then(|v| {
        if let Some(n) = v.as_i64() { return Some(n); }
        v.as_str()?.parse().ok()
    })
}
// Usage:
.bind(i64_val(row, "cp_cost").unwrap_or(0))
```

### Migration DDL Pattern
**Source:** `src-tauri/migrations/042_udb_detachments.sql` (full file)
**Apply to:** `043_udb_stratagems_enhancements.sql`
- `CREATE TABLE IF NOT EXISTS` only — no INSERTs
- `TEXT PRIMARY KEY` for Wahapedia IDs
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `ON DELETE SET NULL` for optional FKs; `ON DELETE CASCADE` for mandatory FKs
- `CREATE INDEX IF NOT EXISTS` for every FK column used in queries

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| None | — | — | All files are extensions of existing patterns |

All five files follow direct Phase 118 / existing patterns. The migration is a copy of the 042 DDL pattern with new column sets.

---

## Critical Ordering Notes

1. **Register migration 042 before 043** — `get_migrations()` ends at version 41. Both must be added in a single lib.rs edit. Missing 042 causes a boot panic when 043 tries to create FKs referencing `udb_detachments`.
2. **DELETE stratagems/enhancements before detachment_abilities** in the Rust DELETE loop (FK children before parents, even with FK OFF — convention).
3. **INSERT stratagems/enhancements after detachments** in the Rust INSERT section (FK parents must exist first, FK ON during INSERT).
4. **Two `UdbImportResult {` initializations** in lib.rs (lines ~562–566 and ~578–582) — both must gain `stratagems: 0, enhancements: 0`.
5. **Hash in build-unit-db.ts** (line 663) must include `stratagems` and `enhancements` arrays or content-change detection will miss stratagem/enhancement updates.

---

## Metadata

**Analog search scope:** `scripts/`, `src-tauri/src/`, `src-tauri/migrations/`
**Files scanned:** 6 (build-unit-db.ts, update-unit-database.ts, types.ts, lib.rs, 042_udb_detachments.sql, 038_udb_schema.sql referenced but not re-read)
**Pattern extraction date:** 2026-06-04

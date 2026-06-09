# Phase 118: Detachments Import - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 5 (4 modified + 1 new)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src-tauri/migrations/042_udb_detachments.sql` | migration | DDL-only | `src-tauri/migrations/038_udb_schema.sql` | exact |
| `scripts/lib/types.ts` | config/types | transform | existing `UdbUnitAbilityRow` in same file | exact |
| `scripts/build-unit-db.ts` | utility/pipeline | batch-transform | Steps 6–7 in same file (abilities/keywords) | exact |
| `scripts/update-unit-database.ts` | utility/pipeline | batch-transform | `buildUnitDatabase()` in same file | exact |
| `src-tauri/src/lib.rs` | service | batch-import | existing INSERT blocks + structs in same file | exact |

---

## Pattern Assignments

### `src-tauri/migrations/042_udb_detachments.sql` (migration, DDL-only)

**Analog:** `src-tauri/migrations/038_udb_schema.sql`

**Migration header comment pattern** (lines 1–4 of 038):
```sql
-- Migration 038: Unit Database Schema
-- Creates 9 regular tables + 1 FTS5 virtual table for the canonical unit database (udb_*).
-- DDL only — no INSERT/seed data. Seeding via migration caused a documented boot-loop incident.
```

**TEXT PK table pattern** (lines 6–11 of 038):
```sql
CREATE TABLE IF NOT EXISTS udb_factions (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  short_name TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**FK reference + ON DELETE CASCADE pattern** (lines 29–38 of 038):
```sql
CREATE TABLE IF NOT EXISTS udb_unit_models (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id     TEXT    NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  ...
);
```

**FK index pattern** (lines 108–110 of 038):
```sql
CREATE INDEX IF NOT EXISTS idx_udb_units_faction_id
  ON udb_units(faction_id);
```

**Full template for 042_udb_detachments.sql** (from RESEARCH.md):
```sql
-- Migration 042: Detachments and Detachment Abilities
-- DDL only — no INSERTs (boot-loop prevention per migration 038 precedent).

CREATE TABLE IF NOT EXISTS udb_detachments (
  id         TEXT PRIMARY KEY,               -- Wahapedia detachment_id
  faction_id TEXT NOT NULL REFERENCES udb_factions(id),
  name       TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS udb_detachment_abilities (
  id            TEXT PRIMARY KEY,            -- Wahapedia ability row id
  detachment_id TEXT NOT NULL REFERENCES udb_detachments(id) ON DELETE CASCADE,
  faction_id    TEXT NOT NULL REFERENCES udb_factions(id),
  name          TEXT NOT NULL,
  description   TEXT
);

CREATE INDEX IF NOT EXISTS idx_udb_detachments_faction_id
  ON udb_detachments(faction_id);

CREATE INDEX IF NOT EXISTS idx_udb_detachment_abilities_detachment_id
  ON udb_detachment_abilities(detachment_id);
```

**Critical:** Check `src-tauri/migrations/` for the highest existing number before naming the file. Current highest confirmed is `041_udb_sub_faction_fr.sql`. If Phase 117 has since created a `042_*.sql`, use `043_udb_detachments.sql` instead.

---

### `scripts/lib/types.ts` (config/types, transform)

**Analog:** Existing `UdbUnitAbilityRow` and `UnitDatabaseJson` in `scripts/lib/types.ts`

**Existing row interface pattern** (lines 82–91):
```typescript
export interface UdbUnitAbilityRow {
  unit_id: string;
  line_order: number;
  name: string;
  description: string;
  ability_type: string;
  name_fr: string | null;
  description_fr: string | null;
}
```

**UnitDatabaseJson extension pattern** (lines 153–167):
```typescript
export interface UnitDatabaseJson {
  version: string;
  built_at: string;
  game_system: string;
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

**New interfaces to add** (after `UdbUnitCompositionRow`, before coverage report types):
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

**UnitDatabaseJson additions** (append to the interface after `composition`):
```typescript
  detachments: UdbDetachmentRow[];
  detachment_abilities: UdbDetachmentAbilityRow[];
```

---

### `scripts/build-unit-db.ts` (utility/pipeline, batch-transform)

**Analog:** Steps 3, 6, 7 in same file.

**REQUIRED_CSVs pattern** (lines 76–83):
```typescript
const REQUIRED_CSVs = [
  "Factions.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Datasheets_wargear.csv",
] as const;
```
Add `"Detachment_abilities.csv"` to this array.

**Import pattern for new types** (lines 34–47):
```typescript
import type {
  UdbFactionRow,
  UdbUnitRow,
  ...
  UdbUnitCompositionRow,
  UnitDatabaseJson,
  ...
} from "./lib/types.ts";
```
Add `UdbDetachmentRow` and `UdbDetachmentAbilityRow` to these imports.

**factionIds set** (line 189 — already exists, reuse as-is):
```typescript
const factionIds = new Set(factions.map((f) => f.id));
```

**Closest analog — Step 3 Legends+faction-warn pattern** (lines 198–228):
```typescript
for (const row of datasheetsRaw) {
  const id = row["id"]?.trim();
  const factionId = row["faction_id"]?.trim();
  const name = row["name"]?.trim();
  if (!id || !name) continue;

  const isLegend = row["legend"] === "1" || row["legend"] === "true";
  if (isLegend) {
    legendsSkipped++;
    continue;
  }

  if (factionId && !factionIds.has(factionId)) {
    console.warn(`  WARNING: Skipping unit "${name}" (id=${id}) — unknown faction_id "${factionId}"`);
    continue;
  }
  ...
}
```

**Closest analog — Step 7 dedup-via-Set pattern** (lines 322–341):
```typescript
const seenKeywords = new Set<string>();
for (const row of keywordsRaw) {
  const dupeKey = unitId + ":" + keyword;
  if (seenKeywords.has(dupeKey)) continue;
  seenKeywords.add(dupeKey);
  keywords.push({ ... });
}
```

**New Step N to add** (after Step 8 / BSData processing, before Step 9 completeness check):
```typescript
// Step N: Parse Detachment_abilities.csv -> udb_detachments + udb_detachment_abilities rows
console.log("Step N: Parsing Detachment_abilities.csv...");
const detachAbilitiesRaw = readCsvFile(DATA_DIR, "Detachment_abilities.csv");
const detachments: UdbDetachmentRow[] = [];
const detachmentAbilities: UdbDetachmentAbilityRow[] = [];
const seenDetachmentIds = new Set<string>();

for (const row of detachAbilitiesRaw) {
  const detachmentId = row["detachment_id"]?.trim();
  const factionId = row["faction_id"]?.trim();
  const abilityId = row["id"]?.trim();
  const detachmentName = row["detachment"]?.trim();
  const abilityName = row["name"]?.trim();

  if (!detachmentId || !factionId || !abilityId || !abilityName) continue;

  // NOTE: No Legends filter — the `legend` column in Detachment_abilities.csv
  // contains lore/flavor text, NOT a boolean flag (unlike Datasheets.csv).

  if (factionId && !factionIds.has(factionId)) {
    console.warn(`  WARNING: Skipping detachment ability "${abilityName}" — unknown faction_id "${factionId}"`);
    continue;
  }

  // Collect unique detachments (first occurrence wins) — D-02: PK = detachment_id TEXT
  if (!seenDetachmentIds.has(detachmentId)) {
    seenDetachmentIds.add(detachmentId);
    detachments.push({ id: detachmentId, faction_id: factionId, name: detachmentName ?? "" });
  }

  // Collect abilities — D-03: PK = ability id TEXT
  detachmentAbilities.push({
    id: abilityId,
    detachment_id: detachmentId,
    faction_id: factionId,
    name: abilityName,
    description: row["description"]?.trim() ?? "",
  });
}
console.log(`  Parsed ${detachments.length} detachments, ${detachmentAbilities.length} detachment abilities`);
```

**Hash and output assembly** (lines 775–793) — extend both:
```typescript
// Line 776: add detachments and detachment_abilities to hash input
const hash = createHash("sha256")
  .update(JSON.stringify({ factions, units, weapons, points, abilities, keywords, composition, detachments, detachmentAbilities }))
  .digest("hex").slice(0, 8);

// Lines 779–793: add to output object
const output: UnitDatabaseJson = {
  ...
  composition,
  detachments,          // NEW
  detachment_abilities: detachmentAbilities,  // NEW
};
```

---

### `scripts/update-unit-database.ts` (utility/pipeline, batch-transform)

**Analog:** `buildUnitDatabase()` function in same file; mirrors `build-unit-db.ts` exactly.

**REQUIRED_CSVs** (lines 86–93): Same addition as `build-unit-db.ts` — add `"Detachment_abilities.csv"`.

**Import additions** (lines 33–43): Add `UdbDetachmentRow` and `UdbDetachmentAbilityRow` to the `import type` block.

**buildUnitDatabase return type** (line 98): Already returns `Promise<UnitDatabaseJson>` — the type will enforce adding the new arrays once `UnitDatabaseJson` is extended.

**Hash** (line 339):
```typescript
const hash = crypto.createHash("sha256")
  .update(JSON.stringify({ factions: filteredFactions, units, weapons, points, abilities, keywords, composition, detachments, detachmentAbilities }))
  .digest("hex").slice(0, 8);
```

**Return value** (lines 342–356): Add `detachments` and `detachment_abilities: detachmentAbilities` to the returned object, consistent with all other array fields.

The parse step code is **identical** to what's added in `build-unit-db.ts` — copy exactly.

---

### `src-tauri/src/lib.rs` (service, batch-import)

**Analog:** Existing `UnitDatabasePayload`, `UdbImportResult`, `import_unit_database_inner` in same file.

**JsRow type and helpers** (lines 460–474):
```rust
type JsRow = HashMap<String, serde_json::Value>;

fn str_val(row: &JsRow, key: &str) -> Option<String> {
    row.get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}
```

**UnitDatabasePayload struct pattern** (lines 476–499) — append after `composition`:
```rust
#[derive(serde::Deserialize)]
pub struct UnitDatabasePayload {
    version: String,
    built_at: String,
    game_system: Option<String>,
    faction_count: Option<u32>,
    unit_count: Option<u32>,
    #[serde(default)]
    factions: Vec<JsRow>,
    // ... existing fields ...
    #[serde(default)]
    composition: Vec<JsRow>,
    // NEW — add these two:
    #[serde(default)]
    detachments: Vec<JsRow>,
    #[serde(default)]
    detachment_abilities: Vec<JsRow>,
}
```

**UdbImportResult struct** (lines 501–511) — append after `composition`:
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
    // NEW:
    pub detachments: u64,
    pub detachment_abilities: u64,
}
```

**Early-return path** (lines 556–560) — must also add new zero fields:
```rust
return Ok(UdbImportResult {
    factions: 0, units: 0, models: 0, weapons: 0,
    abilities: 0, keywords: 0, points: 0, composition: 0,
    detachments: 0, detachment_abilities: 0,  // NEW
});
```

**counts initializer** (lines 571–574) — same addition:
```rust
let mut counts = UdbImportResult {
    factions: 0, units: 0, models: 0, weapons: 0,
    abilities: 0, keywords: 0, points: 0, composition: 0,
    detachments: 0, detachment_abilities: 0,  // NEW
};
```

**DELETE list** (lines 577–592) — insert new tables BEFORE `udb_factions`:
```rust
for table in [
    "udb_unit_keywords",
    "udb_unit_points",
    "udb_unit_composition",
    "udb_unit_abilities",
    "udb_unit_weapons",
    "udb_unit_models",
    "udb_units",
    // NEW — abilities before detachments (child before parent):
    "udb_detachment_abilities",
    "udb_detachments",
    "udb_factions",
    "udb_meta",
] {
```

**INSERT pattern — factions block** (lines 594–609, closest analog for TEXT PK insert):
```rust
for row in &payload.factions {
    let id = str_val(row, "id").unwrap_or_default();
    if id.is_empty() { continue; }
    let res = sqlx::query(
        "INSERT INTO udb_factions (id, name, short_name, name_fr) VALUES (?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(str_val(row, "name").unwrap_or_default())
    .bind(str_val(row, "short_name"))
    .bind(str_val(row, "name_fr"))
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("insert faction {id}: {e}"))?;
    counts.factions += res.rows_affected();
}
```

**New INSERT blocks** (add after the `composition` block, before the `udb_meta` INSERT):
```rust
// INSERT detachments
for row in &payload.detachments {
    let id = str_val(row, "id").unwrap_or_default();
    if id.is_empty() { continue; }
    let res = sqlx::query(
        "INSERT INTO udb_detachments (id, faction_id, name) VALUES (?, ?, ?)",
    )
    .bind(&id)
    .bind(str_val(row, "faction_id").unwrap_or_default())
    .bind(str_val(row, "name").unwrap_or_default())
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("insert detachment {id}: {e}"))?;
    counts.detachments += res.rows_affected();
}

// INSERT detachment_abilities
for row in &payload.detachment_abilities {
    let id = str_val(row, "id").unwrap_or_default();
    if id.is_empty() { continue; }
    let res = sqlx::query(
        "INSERT INTO udb_detachment_abilities (id, detachment_id, faction_id, name, description) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(str_val(row, "detachment_id").unwrap_or_default())
    .bind(str_val(row, "faction_id").unwrap_or_default())
    .bind(str_val(row, "name").unwrap_or_default())
    .bind(str_val(row, "description"))
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("insert detachment_ability {id}: {e}"))?;
    counts.detachment_abilities += res.rows_affected();
}
```

---

## Shared Patterns

### CSV Reading
**Source:** `scripts/lib/bsdata.ts` — `readCsvFile()`
**Apply to:** The new `Detachment_abilities.csv` parse step in both build scripts
```typescript
const detachAbilitiesRaw = readCsvFile(DATA_DIR, "Detachment_abilities.csv");
// Returns Record<string, string>[] with headers as keys, BOM already stripped by parseWahapediaCsv()
```

### Unknown faction_id Warning (non-fatal)
**Source:** `scripts/build-unit-db.ts` lines 211–213
**Apply to:** Detachment ability loop in both build scripts
```typescript
if (factionId && !factionIds.has(factionId)) {
  console.warn(`  WARNING: Skipping unit "${name}" (id=${id}) — unknown faction_id "${factionId}"`);
  continue;
}
```

### DDL-only Migration Rule
**Source:** `src-tauri/migrations/038_udb_schema.sql` line 3
**Apply to:** `042_udb_detachments.sql`
> "DDL only — no INSERT/seed data. Seeding via migration caused a documented boot-loop incident."

### `#[serde(default)]` on Vec Fields
**Source:** `src-tauri/src/lib.rs` lines 483–498
**Apply to:** Both new fields on `UnitDatabasePayload`
> Without this, an existing `unit_database.json` without `detachments`/`detachment_abilities` keys causes a serde parse failure and prevents app startup.

---

## No Analog Found

None — all files have exact analogs within the existing pipeline.

---

## Critical Pitfalls (from RESEARCH.md)

| Pitfall | Prevention |
|---|---|
| `legend` column misinterpretation | Do NOT apply the boolean Legends filter — the column in this CSV is lore text, not a flag |
| Migration number conflict with Phase 117 | Check `src-tauri/migrations/` for current highest number before naming the file |
| DELETE order (child before parent) | `udb_detachment_abilities` → `udb_detachments` → `udb_factions` |
| Missing `#[serde(default)]` | Both new `Vec<JsRow>` fields must have the attribute |
| Hash not updated | Add `detachments` and `detachment_abilities` to the `JSON.stringify({...})` hash input in both scripts |
| `update-unit-database.ts` not updated | TypeScript strict mode (`noUnusedLocals`) will surface missing fields on `UnitDatabaseJson` immediately |

---

## Metadata

**Analog search scope:** `src-tauri/migrations/`, `scripts/lib/types.ts`, `scripts/build-unit-db.ts`, `scripts/update-unit-database.ts`, `src-tauri/src/lib.rs`
**Files scanned:** 5
**Pattern extraction date:** 2026-06-04

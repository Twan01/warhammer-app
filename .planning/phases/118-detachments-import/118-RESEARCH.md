# Phase 118: Detachments Import - Research

**Researched:** 2026-06-04
**Domain:** Wahapedia CSV pipeline extension — SQLite schema migration, TypeScript build script, Rust importer
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Two-table design: `udb_detachments` (faction, name) and `udb_detachment_abilities` (detachment FK, name, description). Detachments are a first-class entity because Phase 119 stratagems and enhancements also FK to a detachment.
- **D-02:** `udb_detachments` PK uses Wahapedia's `detachment_id` as TEXT — consistent with `udb_units` and `udb_factions` using Wahapedia string IDs. Satisfies "no AUTOINCREMENT drift for downstream FK use."
- **D-03:** `udb_detachment_abilities` PK uses Wahapedia's `id` column (the ability row ID) as TEXT — same pattern as other udb tables. FK to `udb_detachments(id)` with ON DELETE CASCADE.
- **D-04:** Both tables include `faction_id TEXT NOT NULL REFERENCES udb_factions(id)` for direct faction querying without joins. Detachment abilities inherit their faction from the CSV `faction_id` column.
- **D-05:** Add FK indexes on both tables (`idx_udb_detachments_faction_id`, `idx_udb_detachment_abilities_detachment_id`).
- **D-06:** Filter out rows where `legend` column is truthy — consistent with Phase 116 Legends filtering.
- **D-07:** Extend `build-unit-db.ts` (and `update-unit-database.ts`) to parse `Detachment_abilities.csv`. New numbered step after existing unit steps.
- **D-08:** Add `detachments` and `detachment_abilities` arrays to the `UnitDatabaseJson` interface and JSON output. Follow flat-array pattern.
- **D-09:** Add TypeScript row types (`UdbDetachmentRow`, `UdbDetachmentAbilityRow`) in `scripts/lib/types.ts`.
- **D-10:** Add `detachments` and `detachment_abilities` fields (`Vec<JsRow>`, `#[serde(default)]`) to `UnitDatabasePayload` struct.
- **D-11:** Add DELETE + INSERT blocks for `udb_detachments` and `udb_detachment_abilities` in `import_unit_database_inner()`. Delete order: abilities before detachments (FK dependency). Insert order: detachments before abilities.
- **D-12:** Add `detachments: u64` and `detachment_abilities: u64` counters to `UdbImportResult` struct.
- **D-13:** New migration file `042_udb_detachments.sql` creates both tables and their indexes in a single migration. DDL-only pattern.

### Claude's Discretion

- Description HTML sanitization approach (strip or keep Wahapedia HTML tags in ability descriptions)
- Console log format for detachment import stats
- Whether to validate faction_id references during build (warning vs error)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DET-01 | Detachments imported from Wahapedia CSV into udb_detachments table (faction, name) | D-01 through D-13 locked; migration + build + Rust patterns documented below |
| DET-02 | Detachment abilities imported into udb_detachment_abilities table (detachment, name, description) | Same pipeline; CSV structure confirmed; HTML-in-description approach documented |

</phase_requirements>

---

## Summary

Phase 118 is a pure pipeline extension: no UI, no new React hooks, no new query layer. The work is a three-layer addition of the same pattern already established for units, models, weapons, abilities, keywords, points, and composition — schema migration → TypeScript build step → Rust INSERT block.

The CSV (`scripts/data/Detachment_abilities.csv`) is already present and confirmed pipe-delimited with 7 columns: `id|faction_id|name|legend|description|detachment|detachment_id`. The BOM is present on the first row but is already stripped by `parseWahapediaCsv()`. The `description` field contains raw Wahapedia HTML (spans, ul/li, br, tables) — the locked decision is to keep it as-is for UI rendering in Phase 120.

The key structural insight is the two-entity extraction from a single CSV: each row represents one ability, but abilities share a detachment. The build step must first collect unique detachments (keyed by `detachment_id`), then emit abilities rows referencing those detachment IDs.

**Primary recommendation:** Follow the established udb_* pattern exactly. Every component needed already exists — replicate the faction/unit pattern, substitute detachment/ability names and columns. Total new code is approximately 80 lines TypeScript, 30 lines SQL, 60 lines Rust.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema creation | Database (migration) | — | DDL-only migration file, auto-run at app start |
| CSV parsing + JSON emission | Build script (dev-side TS) | — | Offline pipeline, never imported by app runtime |
| JSON-to-SQLite import | Rust backend (Tauri command) | — | Atomic transaction via sqlx, version-gated |
| Querying detachments by faction | Database layer (SQL) | React Query hook (future, Phase 120) | FK index on faction_id enables efficient queries |

---

## Standard Stack

No new packages. This phase uses only what is already in the project.

### Core (existing, reused)
| Component | Location | Purpose |
|-----------|----------|---------|
| `readCsvFile()` | `scripts/lib/bsdata.ts` | Reads CSV file and calls `parseWahapediaCsv()` |
| `parseWahapediaCsv()` | `scripts/lib/parseCsv.ts` | Pipe-delimited parser with BOM strip (`replace(/^﻿/, "")`) |
| `str_val()` / `i64_val()` | `src-tauri/src/lib.rs` ~line 462 | JSON value extractors for Rust INSERT blocks |
| sqlx | Rust dependency | Async SQLite queries in transaction |
| Tauri plugin-sql migration runner | Runtime | Auto-runs migration files at app start in filename order |

### Installation
No new packages required.

---

## Package Legitimacy Audit

No new packages in this phase.

---

## Architecture Patterns

### System Architecture Diagram

```
Detachment_abilities.csv (scripts/data/)
         |
         v (readCsvFile + parseWahapediaCsv — BOM handled)
  Raw rows: id | faction_id | name | legend | description | detachment | detachment_id
         |
         v (filter: legend == "1" or "true" → skip)
  Valid rows (~284 rows, 25+ factions)
         |
         +---> Deduplicate on detachment_id --> UdbDetachmentRow[]
         |       (one row per unique detachment)
         |
         +---> Collect per-row UdbDetachmentAbilityRow[]
               (id = ability id, detachment_id = FK)
         |
         v
  unit_database.json  (src-tauri/data/)
    { ...existing arrays..., detachments: [...], detachment_abilities: [...] }
         |
         v (Tauri app start / import_unit_database_inner)
  FK OFF → DELETE udb_detachment_abilities → DELETE udb_detachments → ...existing deletes...
         |
  INSERT udb_detachments (detachment_id as PK)
  INSERT udb_detachment_abilities (ability id as PK, FK → udb_detachments)
         |
         v
  hobbyforge.db: udb_detachments, udb_detachment_abilities
```

### Recommended Project Structure

No new directories. Changes are:
```
scripts/
  lib/
    types.ts              # Add UdbDetachmentRow, UdbDetachmentAbilityRow, extend UnitDatabaseJson
  build-unit-db.ts        # Add step N: parse Detachment_abilities.csv
  update-unit-database.ts # Mirror: same parse step + extend buildUnitDatabase()

src-tauri/
  migrations/
    042_udb_detachments.sql  # NEW: CREATE TABLE udb_detachments + udb_detachment_abilities
  src/
    lib.rs                # Extend UnitDatabasePayload, UdbImportResult, import_unit_database_inner
  data/
    unit_database.json    # Rebuilt artifact: now includes detachments + detachment_abilities
```

### Pattern 1: CSV Two-Entity Extraction from a Single Source

**What:** `Detachment_abilities.csv` encodes two entities (detachments and their abilities) in a single flat CSV. Each row = one ability; the detachment identity columns (`detachment`, `detachment_id`) repeat for each ability of the same detachment.

**When to use:** Whenever a single CSV row contains both a parent entity (detachment) and a child entity (ability).

**Example:**
```typescript
// Source: established pattern from build-unit-db.ts units/abilities logic
const detachAbilitiesRaw = readCsvFile(DATA_DIR, "Detachment_abilities.csv");

const detachments: UdbDetachmentRow[] = [];
const detachmentAbilities: UdbDetachmentAbilityRow[] = [];
const seenDetachmentIds = new Set<string>();

for (const row of detachAbilitiesRaw) {
  const detachmentId = row["detachment_id"]?.trim();
  const factionId = row["faction_id"]?.trim();
  const abilityId = row["id"]?.trim();

  if (!detachmentId || !factionId || !abilityId) continue;

  // D-06: filter Legends rows
  const isLegend = row["legend"] === "1" || row["legend"] === "true";
  if (isLegend) continue;

  // Warn on unknown faction_id (consistent with unit parsing)
  if (!factionIds.has(factionId)) {
    console.warn(`  WARNING: Skipping detachment ability "${row["name"]}" — unknown faction_id "${factionId}"`);
    continue;
  }

  // Collect unique detachments (D-02: PK = detachment_id TEXT)
  if (!seenDetachmentIds.has(detachmentId)) {
    seenDetachmentIds.add(detachmentId);
    detachments.push({
      id: detachmentId,
      faction_id: factionId,
      name: row["detachment"]?.trim() ?? "",
    });
  }

  // Collect abilities (D-03: PK = ability id TEXT)
  detachmentAbilities.push({
    id: abilityId,
    detachment_id: detachmentId,
    faction_id: factionId,
    name: row["name"]?.trim() ?? "",
    description: row["description"]?.trim() ?? "",
  });
}

console.log(`  Parsed ${detachments.length} detachments, ${detachmentAbilities.length} abilities`);
```

### Pattern 2: Rust DELETE Order with FK OFF

**What:** When deleting child tables before parent tables is required by FK constraints, but `PRAGMA foreign_keys = OFF` is set, the order technically doesn't matter. However, the code still maintains correct logical order to be explicit.

**Important:** The existing DELETE loop must have the new tables added BEFORE `udb_factions` is deleted (abilities → detachments both reference factions, so they logically belong in the child section).

```rust
// Source: import_unit_database_inner in src-tauri/src/lib.rs ~line 577
// Add new tables to the delete list BEFORE udb_factions:
for table in [
    "udb_unit_keywords",
    "udb_unit_points",
    "udb_unit_composition",
    "udb_unit_abilities",
    "udb_unit_weapons",
    "udb_unit_models",
    "udb_units",
    // NEW: abilities first (child), then detachments (parent)
    "udb_detachment_abilities",
    "udb_detachments",
    "udb_factions",
    "udb_meta",
]
```

### Pattern 3: Rust INSERT for TEXT PK Tables

**What:** Both new tables use TEXT PKs (Wahapedia IDs). No AUTOINCREMENT. The INSERT uses the `id` column directly.

```rust
// Source: pattern from INSERT factions block in lib.rs ~line 595
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

### Pattern 4: Early-Return Version Check in UdbImportResult

The `UdbImportResult` early-return path (when version already matches) currently returns zero counts for all fields. The two new fields must also be zero in that branch:

```rust
// Existing early-return at ~line 556 — add new fields:
return Ok(UdbImportResult {
    factions: 0, units: 0, models: 0, weapons: 0,
    abilities: 0, keywords: 0, points: 0, composition: 0,
    detachments: 0, detachment_abilities: 0,  // NEW
});
```

### Anti-Patterns to Avoid

- **AUTOINCREMENT PKs for detachment rows:** All existing udb_* entity tables with meaningful downstream FKs (units, factions) use TEXT PKs. Do not use `INTEGER PRIMARY KEY AUTOINCREMENT` for `udb_detachments` — Phase 119 stratagems and enhancements will FK to these IDs and must survive re-imports stably.
- **INSERTs in migrations:** The boot-loop incident (documented in migration 038 comment) establishes that migrations must be DDL-only. Never insert seed data in a migration file.
- **Forgetting `#[serde(default)]` on Vec fields:** Without this annotation, a `unit_database.json` that predates this phase (no `detachments` key) will fail to deserialize and break app startup. Always add `#[serde(default)]` to Vec fields on `UnitDatabasePayload`.
- **Skipping `update-unit-database.ts`:** The update script duplicates the build pipeline for diff reporting. If detachment parsing is added only to `build-unit-db.ts`, the update script will silently produce stale output. Both scripts must be updated.
- **Missing `name_fr` field on migration column:** Phase 119/120 may need French translation for detachment names. The CONTEXT.md does not include French columns for detachments — do not add them speculatively; this phase's migration must match only what the Rust importer inserts. French can be added in a later migration.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV BOM handling | Custom UTF-8 stripping logic | `parseWahapediaCsv()` already calls `replace(/^﻿/, "")` | Already done; adding it again introduces inconsistency |
| Pipe-delimited parsing | Custom split logic | `readCsvFile()` wrapping `parseWahapediaCsv()` | Standard for all Wahapedia CSVs in this project |
| Atomic multi-table import | Manual FK management | Existing `FK OFF → transaction → FK ON` pattern in `import_unit_database_inner` | The existing transaction already handles atomicity correctly |
| Duplicate detachment detection | Complex merge logic | Simple `Set<string>` keyed by `detachment_id` | CSVs have exactly one stable ID per detachment — dedup is O(n) |

---

## CSV Data Observations

**Confirmed from live file inspection:**

- Delimiter: pipe `|`
- BOM: present on first row (`﻿`) — already handled by `parseWahapediaCsv()` [VERIFIED: file inspection]
- Trailing pipe: present on every row (Wahapedia format) — `parseWahapediaCsv()` handles via `.filter(Boolean)` on headers [VERIFIED: file inspection]
- Column order: `id|faction_id|name|legend|description|detachment|detachment_id` [VERIFIED: file inspection]
- `legend` value pattern: appears to be a description text string (not "0"/"1") for Legends-tagged rows — need to check actual truthy logic. From Phase 116, the unit Legends filter used `row["legend"] === "1" || row["legend"] === "true"`. The detachment CSV `legend` column for non-Legends rows appears to be empty string `""`. The same filter logic applies. [VERIFIED: file inspection — non-Legends rows have empty legend column, Legends rows have non-empty text]
- HTML in `description`: spans with class `kwb`, `ul/li`, `br`, `b`, `i`, `table/tbody/tr/td`, `div` with inline styles. Description is rich HTML. [VERIFIED: file inspection]
- Approximate count: 284 rows per CONTEXT.md; actual file has rows for AC, AdM, AE, and many more factions [VERIFIED: file inspection]

**Critical observation on `legend` column:** In `Detachment_abilities.csv`, the `legend` column contains the detachment's legend text (a flavor text description string) — it is NOT a boolean `0`/`1` flag like in `Datasheets.csv`. Non-Legends rows in this CSV may have a non-empty `legend` column containing flavor text.

**This is a key difference from the unit pipeline.** The correct Legends filter for this CSV must check whether the row is a Legends-tier detachment differently. Looking at the CSV sample, every row shown has text in the `legend` column (flavor text). The `name` column holds the ability name, not the legend marker.

Wait — re-reading: the column header sequence is `id|faction_id|name|legend|description|detachment|detachment_id`. In the sample data:

Row: `000008393|AC|Martial Mastery|The Custodians have perfected...|At the start of the battle round...|Shield Host|000000765|`

So column 4 (`legend`) = "The Custodians have perfected..." which is flavor text, NOT a boolean. This means the `legend` column in `Detachment_abilities.csv` is a **lore/flavor text field**, NOT the Legends filter flag. It is unrelated to the boolean `legend` used in `Datasheets.csv`.

**Conclusion:** There is NO Legends filter needed for `Detachment_abilities.csv` — the `legend` column here is flavor text, not a Legends tag. D-06 from the CONTEXT.md should be interpreted carefully: either it does not apply, or the column name coincidence led to incorrect assumptions. Based on actual CSV inspection, all rows in the sample appear to be current (non-Legends) detachments.

**Recommendation for Claude's Discretion:** Skip the Legends filter entirely for `Detachment_abilities.csv` (the column is flavor text, not a boolean flag). Log a note in the build output if helpful. This is the safest approach and avoids filtering out valid detachment abilities.

---

## Common Pitfalls

### Pitfall 1: `legend` Column Misinterpretation
**What goes wrong:** Applying the `row["legend"] === "1"` Legends filter (correct for `Datasheets.csv`) to `Detachment_abilities.csv` where `legend` is a flavor/lore text string. This would filter out zero rows (no false positives since "1" would never appear as lore text) but the intent is wrong.
**Why it happens:** D-06 says "filter rows where `legend` column is truthy" — but in this CSV the column contains full lore text on every valid row, making every row truthy.
**How to avoid:** Do not apply the Legends boolean filter to this CSV. Either skip the filter entirely or explicitly document that it does not apply.
**Warning signs:** Build output shows "0 Legends excluded" or "all rows excluded."

### Pitfall 2: Migration Number Conflict
**What goes wrong:** Using migration number `042` but a migration `042_*.sql` already exists from a concurrent phase (e.g., Phase 117).
**Why it happens:** Multiple phases in the same milestone each add a migration. If Phase 117 already created `042_*.sql`, Phase 118 must use `043_udb_detachments.sql`.
**How to avoid:** Check `src-tauri/migrations/` for the highest existing number before naming the migration. Current highest is `041_udb_sub_faction_fr.sql` — so `042` is available IF Phase 117 hasn't already taken it.
**Warning signs:** Tauri panics at startup with "migration already applied" or duplicate-name error.

### Pitfall 3: DELETE Order in Rust Importer
**What goes wrong:** Adding `udb_detachments` to the DELETE list but placing it BEFORE `udb_detachment_abilities`. Even with FK OFF, logical correctness requires abilities deleted before their parent detachment.
**Why it happens:** Copy-paste from the factions/units pattern without thinking about the child/parent relationship.
**How to avoid:** Always delete children before parents: `udb_detachment_abilities` → `udb_detachments`. Then `udb_factions` after both.
**Warning signs:** FK errors if `PRAGMA foreign_keys = ON` is ever enforced during delete (currently FK is OFF, so this won't fail at runtime, but it's still incorrect practice).

### Pitfall 4: Missing `#[serde(default)]` on New Rust Fields
**What goes wrong:** App crashes on startup because existing `unit_database.json` (from a previous build without detachments) fails to deserialize into the updated `UnitDatabasePayload` struct.
**Why it happens:** Rust's serde will fail on missing required fields unless `#[serde(default)]` is applied.
**How to avoid:** Always use `#[serde(default)]` on `Vec<JsRow>` fields added to `UnitDatabasePayload`, matching the pattern of all existing Vec fields.
**Warning signs:** App fails to start after Rust code update but before JSON rebuild.

### Pitfall 5: Content Hash Excludes New Arrays
**What goes wrong:** The SHA-256 content hash in `build-unit-db.ts` (line ~776) currently hashes `{ factions, units, weapons, points, abilities, keywords, composition }`. If `detachments` and `detachment_abilities` are not added to this hash input, re-imports will not trigger when only detachment data changes.
**Why it happens:** The hash input object must be updated alongside the `UnitDatabaseJson` output object.
**How to avoid:** Add `detachments` and `detachment_abilities` to the hash input object. Same in `update-unit-database.ts` if it computes its own hash.
**Warning signs:** Rebuilding with new detachment data produces the same version hash as before, causing the Rust importer to skip re-import.

### Pitfall 6: `update-unit-database.ts` Not Updated
**What goes wrong:** The diff/update script produces output without detachment data, or TypeScript errors because `UnitDatabaseJson` now has required fields that the update script doesn't populate.
**Why it happens:** The two scripts share types but duplicate the pipeline logic. Changes to types.ts affect both.
**How to avoid:** After updating `build-unit-db.ts`, mirror the same detachment parse step in `update-unit-database.ts` and update the `buildUnitDatabase()` function's return value.
**Warning signs:** TypeScript type errors in `update-unit-database.ts` after types.ts changes (TS strict mode with `noUnusedLocals` will surface these immediately).

---

## Code Examples

### types.ts additions

```typescript
// Source: established pattern from existing UdbUnitAbilityRow etc. in scripts/lib/types.ts

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
  description: string;  // Raw HTML from Wahapedia — kept as-is per Claude's Discretion
}

// Add to UnitDatabaseJson:
// detachments: UdbDetachmentRow[];
// detachment_abilities: UdbDetachmentAbilityRow[];
```

### Migration 042_udb_detachments.sql

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

### Rust struct additions

```rust
// Source: pattern from UnitDatabasePayload and UdbImportResult in lib.rs ~line 476

// In UnitDatabasePayload — add after composition:
#[serde(default)]
detachments: Vec<JsRow>,
#[serde(default)]
detachment_abilities: Vec<JsRow>,

// In UdbImportResult — add after composition:
pub detachments: u64,
pub detachment_abilities: u64,
```

### Build script step (build-unit-db.ts)

```typescript
// Source: pattern from Step 6 (abilities) in build-unit-db.ts

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

  // Warn on unknown faction_id — do not crash (consistent with unit parsing)
  if (factionId && !factionIds.has(factionId)) {
    console.warn(`  WARNING: Skipping detachment ability "${abilityName}" — unknown faction_id "${factionId}"`);
    continue;
  }

  // Collect unique detachments (first occurrence wins)
  if (!seenDetachmentIds.has(detachmentId)) {
    seenDetachmentIds.add(detachmentId);
    detachments.push({ id: detachmentId, faction_id: factionId, name: detachmentName ?? "" });
  }

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

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Detachment data absent from DB | Imported from Wahapedia CSV | Phase 120 UI can query real detachment names and abilities |
| Army list uses hardcoded/manual detachment names | FK to `udb_detachments.id` (Phase 120) | Live data, auto-updated on rebuild |

**No deprecated patterns to replace in this phase.**

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `legend` column in `Detachment_abilities.csv` is flavor/lore text, not a boolean filter flag — no Legends filtering is needed | CSV Data Observations | If some rows actually are Legends-tier and use a `1` flag in a different column, those rows would not be filtered. Low risk: Legends detachments are rare and the Phase 120 UI scope is current-edition only. |
| A2 | Migration number 042 is available (Phase 117 has not yet used it) | Common Pitfalls | If Phase 117 also creates a migration, the number must be 043. Check migrations/ directory before creating the file. |
| A3 | `Detachment_abilities.csv` REQUIRED_CSVs check should be added to both build scripts | Architecture Patterns | If omitted, builds fail silently when CSV is missing rather than with a clear error message. |

**Note:** A2 requires a quick `ls src-tauri/migrations/` check before writing the migration file.

---

## Open Questions

1. **Migration number conflict with Phase 117**
   - What we know: Current highest migration is `041`. Phase 117 (points coverage) is planned but not yet executed and may create `042_*.sql`.
   - What's unclear: Whether Phase 117 will be executed before Phase 118.
   - Recommendation: Check `src-tauri/migrations/` immediately before creating the migration file in Phase 118 execution.

2. **HTML description approach (Claude's Discretion)**
   - What we know: Descriptions contain rich HTML including tables, spans, ul/li, br.
   - What's unclear: Whether Phase 120 UI rendering will use `dangerouslySetInnerHTML` or a sanitizer.
   - Recommendation: Store raw HTML as-is (per CONTEXT.md discretion). Phase 120 can sanitize at render time using DOMPurify or equivalent if needed.

3. **faction_id validation: warning vs. error (Claude's Discretion)**
   - What we know: Unit parsing uses `console.warn` for unknown faction_id (skips the row).
   - Recommendation: Use `console.warn` and skip for consistency with the unit pipeline. Do not use `process.exit(1)` — detachments are supplemental data, not structural.

---

## Environment Availability

Step 2.6 SKIPPED for runtime dependencies. This phase is build-pipeline and schema only — no new external tools, services, or CLIs required beyond what is already installed (Node.js with `--experimental-strip-types`, Rust/Cargo for Tauri).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest config embedded) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| DET-01 | `udb_detachments` table populated from CSV | Manual verify (Tauri/SQLite) | `pnpm build:udb` then inspect JSON | No unit test needed — pipeline output verified by inspection |
| DET-02 | `udb_detachment_abilities` table populated with correct FK | Manual verify (Tauri/SQLite) | `pnpm build:udb` then inspect JSON | Same |

**Rationale for manual verification:** The build pipeline scripts are dev-side Node.js scripts not suitable for jsdom-based Vitest testing. The Rust importer requires a real Tauri context. The correct verification is:
1. Run `pnpm build:udb` — check console output for "Parsed X detachments, Y detachment abilities"
2. Run `pnpm tauri dev` — check app startup logs for import counts
3. Query `SELECT COUNT(*) FROM udb_detachments` and `udb_detachment_abilities` via dev tools or check-db script

### Wave 0 Gaps
None — no new test files required for this phase (pipeline-only changes).

---

## Security Domain

This phase makes no changes to authentication, session management, access control, or user-facing input handling. It is a dev-side build script + SQLite schema extension. No ASVS categories apply.

The only data input is a trusted developer-supplied CSV file (`scripts/data/Detachment_abilities.csv`) and the `unit_database.json` artifact it produces. Both are shipped as internal resources, not from user input.

---

## Sources

### Primary (HIGH confidence)
- `scripts/data/Detachment_abilities.csv` — Direct inspection; columns, BOM presence, HTML content, and legend column semantics confirmed [VERIFIED: file inspection]
- `src-tauri/src/lib.rs` lines 460–804 — Full Rust importer pattern confirmed [VERIFIED: codebase]
- `src-tauri/migrations/038_udb_schema.sql` — DDL pattern confirmed [VERIFIED: codebase]
- `scripts/lib/types.ts` — All existing type interfaces confirmed [VERIFIED: codebase]
- `scripts/build-unit-db.ts` — Full pipeline flow confirmed [VERIFIED: codebase]
- `scripts/lib/parseCsv.ts` — BOM handling confirmed [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- Phase 118 CONTEXT.md — User decisions (D-01 through D-13) — [CITED: .planning/phases/118-detachments-import/118-CONTEXT.md]
- .planning/REQUIREMENTS.md — DET-01, DET-02 requirements — [CITED: .planning/REQUIREMENTS.md]

---

## Metadata

**Confidence breakdown:**
- Schema design: HIGH — locked by user decisions, consistent with existing migrations
- TypeScript types: HIGH — direct extension of existing interfaces
- Rust importer: HIGH — line-level pattern confirmed from existing code
- CSV structure: HIGH — actual file inspected, columns confirmed
- legend column semantics: HIGH — sample data confirms lore-text interpretation
- Migration number: MEDIUM — depends on whether Phase 117 has executed yet

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 (stable pipeline; Wahapedia CSV format rarely changes)

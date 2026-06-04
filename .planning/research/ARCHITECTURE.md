# Architecture Patterns

**Domain:** Wahapedia-only pipeline & full data import — v0.4.7
**Researched:** 2026-06-04
**Confidence:** HIGH (all findings from direct source inspection)

---

## System Overview (Current — v0.4.5)

```
DEV-SIDE BUILD PIPELINE
  Wahapedia CSVs (6 files)  +  BSData .cat XML (bsdata/)  +  aliases.json
                                        ↓
                         scripts/build-unit-db.ts
                                        ↓
                     src-tauri/data/unit_database.json
                                        ↓
RUNTIME IMPORT (Rust — lib.rs)
  import_unit_database_inner()
    → DELETE udb_* tables
    → INSERT factions, units, models, weapons, abilities, keywords, points, composition
    → Rebuild FTS5 udb_search
                                        ↓
APP RUNTIME (React)
  UI → React Query hooks → src/db/queries/unitDatabase.ts → hobbyforge.db udb_* tables
```

---

## What Changes in v0.4.7

Three parallel changes that must integrate cleanly:

1. **Replace BSData with Wahapedia-only points** — `Datasheets_models_cost.csv` has complete coverage; BSData XML (~60%) is the structural bottleneck that caps coverage now
2. **Add new entity types** — stratagems, enhancements, detachment abilities to canonical database
3. **Auto-download CSVs** — dev-side fetch so no manual file placement

---

## New Database Tables Required

### Existing udb_* Tables (unchanged)
`udb_factions`, `udb_units`, `udb_unit_models`, `udb_unit_weapons`, `udb_unit_abilities`, `udb_unit_keywords`, `udb_unit_points`, `udb_unit_composition`, `udb_meta`, `udb_search` (FTS5)

### New udb_* Tables

**udb_detachments** — one row per detachment rule card
```sql
CREATE TABLE IF NOT EXISTS udb_detachments (
  id          TEXT PRIMARY KEY,        -- Wahapedia string ID (e.g., "000000456")
  faction_id  TEXT NOT NULL REFERENCES udb_factions(id),
  name        TEXT NOT NULL,
  legend      TEXT,                    -- flavour text / detachment rule description
  type        TEXT,                    -- "Detachment Rule" | NULL
  name_fr     TEXT                     -- French locale overlay
);
CREATE INDEX IF NOT EXISTS idx_udb_detachments_faction_id ON udb_detachments(faction_id);
```

**udb_stratagems** — one row per stratagem
```sql
CREATE TABLE IF NOT EXISTS udb_stratagems (
  id            TEXT PRIMARY KEY,      -- Wahapedia string ID
  faction_id    TEXT NOT NULL REFERENCES udb_factions(id),
  detachment_id TEXT REFERENCES udb_detachments(id),  -- NULL = universal
  name          TEXT NOT NULL,
  cp_cost       TEXT,                  -- "1", "2", "D3" — kept as TEXT (Wahapedia format)
  type          TEXT,                  -- "Core" | "Faction" | "Epic Deed" etc.
  turn          TEXT,                  -- "Either Turn" | "Your Turn" | "Opponent's Turn"
  phase         TEXT,                  -- "Command" | "Movement" | "Shooting" | "Charge" | "Fight"
  legend        TEXT,                  -- flavour text
  description   TEXT,                  -- rules text
  name_fr       TEXT,
  description_fr TEXT
);
CREATE INDEX IF NOT EXISTS idx_udb_stratagems_faction_id ON udb_stratagems(faction_id);
CREATE INDEX IF NOT EXISTS idx_udb_stratagems_detachment_id ON udb_stratagems(detachment_id);
```

**udb_detachment_abilities** — abilities that belong to a specific detachment
```sql
CREATE TABLE IF NOT EXISTS udb_detachment_abilities (
  id            TEXT PRIMARY KEY,      -- Wahapedia string ID
  faction_id    TEXT NOT NULL REFERENCES udb_factions(id),
  detachment_id TEXT REFERENCES udb_detachments(id),
  name          TEXT NOT NULL,
  legend        TEXT,
  description   TEXT,
  name_fr       TEXT,
  description_fr TEXT
);
CREATE INDEX IF NOT EXISTS idx_udb_detachment_abilities_faction_id
  ON udb_detachment_abilities(faction_id);
CREATE INDEX IF NOT EXISTS idx_udb_detachment_abilities_detachment_id
  ON udb_detachment_abilities(detachment_id);
```

**udb_enhancements** — one row per enhancement (warlord traits, relics, etc.)
```sql
CREATE TABLE IF NOT EXISTS udb_enhancements (
  id            TEXT PRIMARY KEY,      -- Wahapedia string ID
  faction_id    TEXT NOT NULL REFERENCES udb_factions(id),
  detachment_id TEXT REFERENCES udb_detachments(id),
  name          TEXT NOT NULL,
  points        INTEGER NOT NULL DEFAULT 0,
  legend        TEXT,
  description   TEXT,
  name_fr       TEXT,
  description_fr TEXT
);
CREATE INDEX IF NOT EXISTS idx_udb_enhancements_faction_id ON udb_enhancements(faction_id);
CREATE INDEX IF NOT EXISTS idx_udb_enhancements_detachment_id ON udb_enhancements(detachment_id);
```

### Migration Strategy

**One migration file** (042_udb_game_rules.sql) creates all four tables. This is DDL-only — same pattern as migration 038. No seeding via migration (prevents the documented boot-loop incident).

The existing `synced_enhancements` table (migration 030, BSData-sourced) is NOT dropped by this migration — it stays for backward compatibility with `army_list_enhancements`. The `udb_enhancements` table is new and canonical; `synced_enhancements` can be deprecated later.

Similarly, `rules_favorites_notes` and `rules_notes` already use `rule_type IN ('stratagem', 'detachment_ability', 'shared_ability')` with TEXT `rule_id`. These survive unchanged — the annotation system works against any string rule_id. The new udb_* entity IDs are Wahapedia string IDs, same format as the old rw_* IDs, so existing user annotations carry over.

---

## unit_database.json Schema Expansion

### Current top-level structure (UnitDatabaseJson)
```typescript
{
  version, built_at, game_system, unit_count, faction_count,
  factions[], units[], models[], weapons[], abilities[], keywords[], points[], composition[]
}
```

### New top-level arrays (additive — no existing keys removed)
```typescript
{
  // ... all existing keys unchanged ...
  detachment_count: number,   // new summary stat
  stratagem_count: number,    // new summary stat
  detachments: UdbDetachmentRow[],
  stratagems: UdbStratagemRow[],
  detachment_abilities: UdbDetachmentAbilityRow[],
  enhancements: UdbEnhancementRow[],
}
```

### New TypeScript interfaces (scripts/lib/types.ts additions)
```typescript
export interface UdbDetachmentRow {
  id: string;
  faction_id: string;
  name: string;
  legend: string | null;
  type: string | null;
  name_fr: string | null;
}

export interface UdbStratagemRow {
  id: string;
  faction_id: string;
  detachment_id: string | null;  // null = faction-universal (e.g., Oath of Moment)
  name: string;
  cp_cost: string | null;
  type: string | null;
  turn: string | null;
  phase: string | null;
  legend: string | null;
  description: string | null;
  name_fr: string | null;
  description_fr: string | null;
}

export interface UdbDetachmentAbilityRow {
  id: string;
  faction_id: string;
  detachment_id: string | null;
  name: string;
  legend: string | null;
  description: string | null;
  name_fr: string | null;
  description_fr: string | null;
}

export interface UdbEnhancementRow {
  id: string;
  faction_id: string;
  detachment_id: string | null;
  name: string;
  points: number;
  legend: string | null;
  description: string | null;
  name_fr: string | null;
  description_fr: string | null;
}
```

---

## Build Pipeline Changes

### Step 8 Replacement: Wahapedia Points Instead of BSData

**Remove:** steps 8 (BSData .cat parsing), 8b (extractModelCounts), 8c (alias validation)
**Add:** Parse `Datasheets_models_cost.csv` (new Wahapedia file)

Wahapedia's `Datasheets_models_cost.csv` columns (confirmed from STATE.md and existing RwStratagem type knowledge):
- `datasheet_id` — matches `udb_units.id` directly (same Wahapedia string ID)
- `model_count` (or similar) — integer
- `cost` — integer points

This is a direct foreign-key join: no matching algorithm needed, no BSData, no aliases. `unit.base_points` and `udb_unit_points` rows populated purely from this CSV.

**Composition** (min/max models): Wahapedia's `Datasheets_models.csv` may provide this, or a separate `Datasheets_composition.csv` may exist. If not available from Wahapedia, composition rows can be derived from the cost CSV tiers (distinct model_count values → min is lowest tier, max is highest).

**Consequence for aliases.json and factionMap.ts:** Both become unused for points matching. They may still be useful for sub_faction mapping. The `allBsdataNames` accumulation and alias validation section (step 8c) is removed entirely.

### New Steps After Wahapedia Points

**Step 8.1: Parse Stratagems.csv**

Wahapedia Stratagems.csv columns (derived from existing `RwStratagem` type, which was built from the old rules.db sync):
- `id` — Wahapedia string ID
- `faction_id` — matches `udb_factions.id`
- `name`
- `type`
- `cp_cost`
- `legend`
- `turn`
- `phase`
- `detachment` — detachment name (text)
- `detachment_id` — detachment Wahapedia ID (may be present in newer exports)
- `description`

Resolution: `detachment_id` on stratagems links to `udb_detachments.id`. If Wahapedia only provides `detachment` (text name), build a `Map<detachment_name, detachment_id>` from the detachments parse pass to resolve the FK at build time.

**Step 8.2: Parse Detachments.csv** (prerequisite for step 8.1 FK resolution)

Wahapedia Detachments.csv columns (derived from `RwDetachment` type):
- `id` — Wahapedia string ID
- `faction_id`
- `name`
- `legend`
- `type`

**Step 8.3: Parse Detachment_abilities.csv**

Wahapedia Detachment_abilities.csv columns (derived from `RwDetachmentAbility` type):
- `id`
- `faction_id`
- `name`
- `legend`
- `description`
- `detachment` — detachment name (text)
- `detachment_id` — may or may not be present

**Step 8.4: Parse Enhancements.csv**

Wahapedia Enhancements.csv columns (derived from `SyncedEnhancementRow` + `BsdataEnhancement` types):
- `id` — may be absent in older exports; use `name + faction_id` composite if needed
- `faction_id`
- `name`
- `points` (or `cost`)
- `legend`
- `description`
- `detachment` — detachment name
- `detachment_id`

**IMPORTANT:** The old `synced_enhancements` table used BSData-derived data (name + faction_id + detachment_name, no Wahapedia ID). The new `udb_enhancements` table uses Wahapedia IDs. The `army_list_enhancements` table stores `enhancement_name TEXT NOT NULL` (TEXT copy, not FK) so it survives the source change without migration. The smart list builder reads enhancements by faction from `synced_enhancements` currently — that hook needs updating to read from `udb_enhancements` instead.

### Ordering of New Parse Steps

Detachments must be parsed before stratagems, detachment abilities, and enhancements, because all three reference `detachment_id`. Recommended order:

```
Step 1:  Verify required CSVs (add new CSVs to required list)
Step 2:  Factions.csv → udb_factions
Step 3:  Datasheets.csv → udb_units (dedup Legends vs current here)
Step 4:  Datasheets_models.csv → udb_unit_models
Step 5:  Datasheets_wargear.csv → udb_unit_weapons
Step 6:  Datasheets_abilities.csv → udb_unit_abilities
Step 7:  Datasheets_keywords.csv → udb_unit_keywords
Step 8:  Datasheets_models_cost.csv → udb_unit_points (replaces BSData)
Step 9:  Detachments.csv → udb_detachments (prerequisite for FK resolution)
Step 10: Stratagems.csv → udb_stratagems (uses detachment_id from step 9)
Step 11: Detachment_abilities.csv → udb_detachment_abilities (uses detachment_id)
Step 12: Enhancements.csv → udb_enhancements (uses detachment_id)
Step 13: Validation + coverage report
Step 14: Apply French overlay (all arrays finalized before translation)
Step 15: Content hash + write unit_database.json
```

### Unit Deduplication (New)

Wahapedia exports both Legends (outdated) and current datasheets for some units. STATE.md confirms 9 SM duplicates found. Deduplication must happen at Step 3 (Datasheets.csv parsing), using a `is_legends` or `source_id` field in Datasheets.csv that identifies Legends entries. Keep current (non-Legends) unit; discard Legends duplicate. If the CSV doesn't have a clear flag, filter by `source_id` — Legends entries have a distinct source.

### French Overlay Extension

`translations_fr.json` gains new sections:
```typescript
export interface TranslationsFrOverlay {
  factions?: Record<string, string>;
  units?: Record<string, string>;
  abilities?: Record<string, { name_fr?: string | null; description_fr?: string | null }>;
  weapons?: Record<string, string>;
  keywords?: Record<string, string>;
  // NEW:
  detachments?: Record<string, string>;  // detachment_id → name_fr
  stratagems?: Record<string, { name_fr?: string | null; description_fr?: string | null }>;
  detachment_abilities?: Record<string, { name_fr?: string | null; description_fr?: string | null }>;
  enhancements?: Record<string, { name_fr?: string | null; description_fr?: string | null }>;
}
```

The overlay is applied in step 14, same pattern as existing entities. Stratagems/enhancements use composite keys or entity IDs depending on what's stable in Wahapedia.

### Auto-Download

A new `scripts/download-wahapedia.ts` script fetches all CSVs from `https://wahapedia.ru/wh40k10ed/` to `scripts/data/`. This runs before the build pipeline. The required CSVs list in `build-unit-db.ts` stays as the authoritative list — `download-wahapedia.ts` fetches everything in that list.

The download script uses Node.js `fetch` (available in Node 18+, same version the existing `--experimental-strip-types` flag implies). No new npm dependencies needed.

---

## Rust Import Command Changes

### UnitDatabasePayload struct — add four new optional arrays

```rust
#[derive(serde::Deserialize)]
pub struct UnitDatabasePayload {
    // ... existing fields unchanged ...
    #[serde(default)]
    pub detachments: Vec<JsRow>,
    #[serde(default)]
    pub stratagems: Vec<JsRow>,
    #[serde(default)]
    pub detachment_abilities: Vec<JsRow>,
    #[serde(default)]
    pub enhancements: Vec<JsRow>,
}
```

Using `#[serde(default)]` on all four means old `unit_database.json` files without these arrays still parse successfully. This is the same pattern already used for all existing arrays.

### UdbImportResult struct — add four new counters

```rust
#[derive(serde::Serialize, Debug)]
pub struct UdbImportResult {
    // ... existing fields ...
    pub detachments: u64,
    pub stratagems: u64,
    pub detachment_abilities: u64,
    pub enhancements: u64,
}
```

### import_unit_database_inner — extend DELETE + INSERT sections

**DELETE section** — add four tables to the existing delete loop. ORDER matters: child tables first.
```rust
for table in [
    "udb_unit_keywords",
    "udb_unit_points",
    "udb_unit_composition",
    "udb_unit_abilities",
    "udb_unit_weapons",
    "udb_unit_models",
    "udb_enhancements",          // NEW — references udb_detachments and udb_factions
    "udb_detachment_abilities",  // NEW — references udb_detachments and udb_factions
    "udb_stratagems",            // NEW — references udb_detachments and udb_factions
    "udb_detachments",           // NEW — references udb_factions (parent of the three above)
    "udb_units",
    "udb_factions",
    "udb_meta",
] {
```

FK enforcement is already OFF during the delete pass (`PRAGMA foreign_keys = OFF`), so the order technically doesn't matter there, but listing child-first is correct defensive practice.

**INSERT section** — add four new INSERT blocks after the existing ones (before the udb_meta insert):

Detachments inserted first (before the three tables that reference them):
```rust
// INSERT detachments
for row in &payload.detachments {
    let id = str_val(row, "id").unwrap_or_default();
    if id.is_empty() { continue; }
    sqlx::query(
        "INSERT INTO udb_detachments (id, faction_id, name, legend, type, name_fr) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(str_val(row, "faction_id").unwrap_or_default())
    .bind(str_val(row, "name").unwrap_or_default())
    .bind(str_val(row, "legend"))
    .bind(str_val(row, "type"))
    .bind(str_val(row, "name_fr"))
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("insert detachment {id}: {e}"))?;
    counts.detachments += 1;
}
```

Then stratagems, detachment_abilities, enhancements — each follows the same pattern with their respective column sets.

### FTS5 udb_search rebuild — optionally extend

The current FTS5 query indexes unit names, faction names, and keywords. Stratagems are searched separately (already work in RulesHubPage via text filter). No change to the FTS5 rebuild query required.

If in-game search of stratagems by name is wanted from the DB browser, a separate FTS5 table (`udb_rules_search`) could be added later. Do not mix stratagems into `udb_search` — that table is unit-scoped and used by collection/army list pickers.

### udb_meta — add new count fields

The `udb_meta` table and `UnitDatabasePayload` should track the new entity counts:

Migration 042 adds columns:
```sql
ALTER TABLE udb_meta ADD COLUMN detachment_count INTEGER;
ALTER TABLE udb_meta ADD COLUMN stratagem_count INTEGER;
```

The Rust INSERT for udb_meta already handles `unit_count` and `faction_count`; extend with the new counts.

---

## Relationship Map: New Entities to Existing

```
udb_factions (existing)
    ├── udb_units (existing, FK: faction_id)
    ├── udb_detachments (NEW, FK: faction_id)
    │       ├── udb_stratagems (NEW, FK: detachment_id nullable)
    │       ├── udb_detachment_abilities (NEW, FK: detachment_id nullable)
    │       └── udb_enhancements (NEW, FK: detachment_id nullable)
    ├── udb_stratagems (NEW, FK: faction_id — universal stratagems have no detachment)
    ├── udb_detachment_abilities (NEW, FK: faction_id)
    └── udb_enhancements (NEW, FK: faction_id)

army_lists (existing)
    ├── detachment_id TEXT (existing, NOT a FK — denormalized copy)
    └── detachment_name TEXT (existing, denormalized copy)

army_list_enhancements (existing, migration 031)
    ├── enhancement_name TEXT (NOT a FK — denormalized copy, survives source migration)
    └── enhancement_points INTEGER

rules_favorites_notes (existing, migration 019)
    ├── rule_id TEXT (Wahapedia string ID — works for both old rw_* and new udb_* IDs)
    └── rule_type TEXT CHECK IN ('stratagem', 'detachment_ability', 'shared_ability')
```

**Key insight:** The `army_lists.detachment_id` and `army_list_enhancements.enhancement_name` columns are TEXT denormalized copies — no FK constraint, intentional design (PRE: "Denormalized TEXT copy prevents data loss when source tables are wiped"). These survive unchanged when the source changes from `synced_enhancements` / `rw_detachments` to `udb_enhancements` / `udb_detachments`. No data migration needed for existing army lists.

**Key insight:** `rules_favorites_notes.rule_id` stores Wahapedia string IDs. The new `udb_stratagems.id` and `udb_detachment_abilities.id` use the same Wahapedia string ID format. Existing user annotations survive the migration without any data transformation.

---

## UI Integration Points

### DetachmentPicker (army-lists)

**Current state:** Returns empty array stub (`// Phase 107: detachments data source eliminated`). 

**After v0.4.7:** Reads from `udb_detachments` via a new `getUdbDetachmentsByFaction(factionId)` query. The picker's data source switches from the stub to the canonical database. No prop changes required.

### DetachmentRulesSection (army-lists)

**Current state:** Likely reads from stubs or `synced_enhancements` for enhancement display.

**After v0.4.7:** Reads from `udb_detachment_abilities` and `udb_enhancements` for the selected detachment. New queries: `getUdbDetachmentAbilities(detachmentId)`, `getUdbEnhancements(detachmentId, factionId)`.

### StratagemCard + RulesHubPage (rules-hub)

**Current state:** `RwStratagem` type consumed from old rules.db sync path. After rules.db was eliminated, this is likely a stub.

**After v0.4.7:** New query `getUdbStratagemsByFaction(factionId)` and `getUdbStratagemsByDetachment(detachmentId)`. Component type changes from `RwStratagem` to `UdbStratagem` (new type in `src/db/queries/unitDatabase.ts`). Field names are identical by design (reuse existing RwStratagem field names in the new types).

### GameDayPage

**Current state:** Uses `phase`-grouped stratagems for in-game reference; reads from stubs.

**After v0.4.7:** Reads from `udb_stratagems` filtered by faction + selected detachment. The `phase` field on `udb_stratagems` enables the existing phase-grouping logic unchanged.

### LoadoutBuilderSheet / smart list builder (army-lists)

**Current state:** Enhancement picker reads from `synced_enhancements` via `getEnhancementsByFaction()` in `bsdataExtended.ts`.

**After v0.4.7:** Switch to `getUdbEnhancementsByFaction(factionId)` reading from `udb_enhancements`. The stored `army_list_enhancements` rows (TEXT-copy pattern) are unaffected. The `enhancement_points` written at selection time comes from `udb_enhancements.points`.

---

## New vs Modified: Complete File Inventory

### New Files

| File | Purpose | Notes |
|------|---------|-------|
| `scripts/download-wahapedia.ts` | Auto-download all required CSVs from wahapedia.ru | Runs before build pipeline |
| `src-tauri/migrations/042_udb_game_rules.sql` | Creates udb_detachments, udb_stratagems, udb_detachment_abilities, udb_enhancements | DDL-only; no INSERTs |

### Modified Files

| File | Change | Impact |
|------|--------|--------|
| `scripts/build-unit-db.ts` | Remove BSData steps 8/8b/8c; add steps 8–12 (Wahapedia-only); add new entity arrays to output | Major rewrite of steps 8+ |
| `scripts/lib/types.ts` | Add `UdbDetachmentRow`, `UdbStratagemRow`, `UdbDetachmentAbilityRow`, `UdbEnhancementRow`; extend `UnitDatabaseJson`; extend `TranslationsFrOverlay` | Additive only |
| `src-tauri/src/lib.rs` | Extend `UnitDatabasePayload`, `UdbImportResult`; add 4 new tables to DELETE loop; add 4 new INSERT blocks; update udb_meta insert | Additive; same pattern as existing |
| `src/db/queries/unitDatabase.ts` | Add query functions for new entities: `getUdbDetachmentsByFaction()`, `getUdbStratagemsByFaction()`, `getUdbStratagemsByDetachment()`, `getUdbDetachmentAbilities()`, `getUdbEnhancements()` | Additive; new functions only |
| `src/hooks/useUnitDatabase.ts` | Add React Query hooks wrapping new query functions | Additive |
| `src/features/army-lists/DetachmentPicker.tsx` | Remove stub; wire to `useUdbDetachmentsByFaction()` | Remove inline stub hook |
| `src/features/army-lists/DetachmentRulesSection.tsx` | Wire to udb_detachment_abilities and udb_enhancements | Data source change |
| `src/features/rules-hub/StratagemCard.tsx` | Change prop type from `RwStratagem` to `UdbStratagem` (field names identical) | Minimal; type rename |
| `src/features/rules-hub/DetachmentCard.tsx` | Change data source from stub to udb_detachments | Data source change |
| `src/features/game-day/GameDayStratagemCard.tsx` | Change data source to udb_stratagems | Data source change |
| `src/db/queries/bsdataExtended.ts` | Deprecate `getEnhancementsByFaction()` — keep table/query but mark deprecated; army list builder switches to udb_enhancements | Backward-compat kept |
| `scripts/data/translations_fr.json` | Add new top-level sections for detachments/stratagems/enhancements | Additive |

### Not Modified

| File | Why Unchanged |
|------|---------------|
| `src-tauri/migrations/001–041_*.sql` | Existing migrations never edited; only add 042 |
| `src/db/queries/armyLists.ts` | army_list_enhancements uses TEXT copy — no change needed |
| `scripts/lib/factionMap.ts` | Sub-faction mapping still needed for sub_faction column derivation |
| `scripts/data/aliases.json` | Kept (alias system may still help if sub-faction derivation needs it); BSData-specific logic removed from build-unit-db.ts but aliases file preserved |
| `src/features/army-lists/UnitPickerDialog.tsx` | Sub-faction filter logic unchanged |
| Collection/Kanban/Dashboard pages | No data contract changes for these features |

---

## Build Order for v0.4.7

Dependencies drive this sequence strictly:

```
Phase 1: Wahapedia Pipeline Core (no UI)
  - download-wahapedia.ts script
  - Remove BSData steps from build-unit-db.ts
  - Parse Datasheets_models_cost.csv for points (100% coverage)
  - Unit deduplication (Legends vs current)
  - Rebuild + verify coverage (target: ~100%)
  GATE: pnpm build:udb runs clean, coverage >= 95%

Phase 2: New Entity Parsing + Schema (no UI)
  - Migration 042_udb_game_rules.sql (4 new tables)
  - Add UdbDetachmentRow/etc. types to scripts/lib/types.ts
  - Parse Detachments.csv, Stratagems.csv, Detachment_abilities.csv, Enhancements.csv
  - Extend UnitDatabaseJson + French overlay structure
  - Extend Rust UnitDatabasePayload + UdbImportResult
  - Extend DELETE/INSERT loops in import_unit_database_inner
  GATE: pnpm build:udb generates JSON with detachments/stratagems/enhancements
        App starts, migration 042 runs, import succeeds, udb_detachments populated

Phase 3: Query Layer + Hooks (no UI)
  - New query functions in unitDatabase.ts
  - New React Query hooks in useUnitDatabase.ts
  GATE: TypeScript compiles clean; unit tests pass

Phase 4: UI Wiring
  - DetachmentPicker: remove stub, wire to useUdbDetachmentsByFaction
  - DetachmentRulesSection: wire to udb_detachment_abilities + udb_enhancements
  - RulesHubPage stratagems tab: wire to udb_stratagems
  - GameDayPage: wire to udb_stratagems for phase-grouped cards
  - LoadoutBuilderSheet: switch enhancement source from synced_enhancements to udb_enhancements
  GATE: All existing UI tests pass; manual smoke test of each surface

Phase 5: Cleanup
  - Remove BSData dependency from package.json scripts (keep @xmldom/xmldom if still needed for other things, otherwise remove)
  - Mark synced_enhancements as deprecated in code comments
  - Verify bsdataExtended.ts functions still compile (not deleted — backward compat)
  GATE: pnpm build clean, all tests pass
```

Phase 1 is the critical path — it must complete before Phase 2, which must complete before Phase 3, which must complete before Phase 4. Phase 5 is independent after Phase 4.

Phase 1 and Phase 2 can be developed in separate branches and merged in order, because Phase 2 only adds new arrays to the JSON that the current Rust importer ignores via `#[serde(default)]`.

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| New `udb_detachments` table (not reusing army_lists.detachment_name) | army_lists stores a TEXT copy for display after detachment changes; the canonical table is needed for FK-based stratagem/ability/enhancement lookup |
| `detachment_id` nullable on stratagems/abilities/enhancements | Some stratagems are faction-universal (no detachment restriction); nullable FK is correct |
| Reuse Wahapedia string IDs for all new udb_* entities | Existing `rules_favorites_notes.rule_id` values carry over without migration; same pattern as udb_units |
| Keep `synced_enhancements` table (not drop) | army_list_enhancements references enhancement data by TEXT name; dropping the table is safe but unnecessary risk during this milestone |
| Do NOT add stratagems to udb_search FTS5 | udb_search is unit-scoped; mixing entity types would break army list picker semantics. Separate search handled at the UI layer (client-side filter in RulesHubPage already) |
| `#[serde(default)]` on new Rust payload arrays | Backward compat: old JSON without these arrays produces zero rows, not a parse error |
| DDL-only migration 042 | Consistent with migration 038; prevents boot-loop incident recurrence (documented anti-pattern) |

---

## Pitfall Pre-Emptions

**Pitfall: Wahapedia CSV may not always have a `detachment_id` column on stratagems/enhancements** — the older `RwStratagem` type has both `detachment` (text) and `detachment_id`. Build a `Map<name, id>` from the detachments parse pass and resolve by name if the ID column is absent.

**Pitfall: Enhancement `id` field may not exist in all CSV exports** — if Enhancements.csv lacks an `id` column, generate a stable synthetic ID as `SHA256(faction_id + ":" + name)` truncated to 12 chars. Use a consistent derivation so re-builds produce the same ID.

**Pitfall: Legends deduplication** — if `Datasheets.csv` doesn't have an explicit `is_legends` flag, filter by `source_id`: Legends entries have a specific Wahapedia source. Audit against current SM datasheets to confirm the correct filter predicate before generalizing across all factions.

**Pitfall: `army_list_enhancements.enhancement_points` out of sync after udb migration** — existing army list rows carry a snapshot of points at selection time (TEXT copy pattern). These are not updated when the udb_enhancements source changes. This is intentional and acceptable (same as detachment_name snapshots). The UI already shows stale-data warnings via StaleDataBanner.

**Pitfall: `rules_favorites_notes` rule_type CHECK constraint** — CHECK is `IN ('stratagem', 'detachment_ability', 'shared_ability')`. New entity types (detachment, enhancement) are NOT in this list. If annotations on detachments or enhancements are needed, the migration 042 must also ALTER the CHECK constraint. Evaluate whether annotations on these entity types are in scope before shipping.

---

## Sources

- `scripts/build-unit-db.ts` — full pipeline orchestrator (direct inspection)
- `scripts/lib/types.ts` — all pipeline type definitions (direct inspection)
- `scripts/lib/parseCsv.ts` — Wahapedia pipe-delimited CSV parser (direct inspection)
- `src-tauri/src/lib.rs` — Rust import command, UnitDatabasePayload, UdbImportResult (direct inspection)
- `src-tauri/migrations/038_udb_schema.sql` — existing udb_* table definitions (direct inspection)
- `src-tauri/migrations/041_udb_sub_faction_fr.sql` — sub_faction + _fr column additions (direct inspection)
- `src-tauri/migrations/030_bsdata_extended.sql` — synced_enhancements table (direct inspection)
- `src-tauri/migrations/031_army_list_v3.sql` — army_list_enhancements TEXT-copy design (direct inspection)
- `src-tauri/migrations/019_rules_favorites_notes.sql` — rule_type CHECK constraint (direct inspection)
- `src/types/datasheet.ts` — RwStratagem, RwDetachment, RwDetachmentAbility field names (direct inspection)
- `src/db/queries/unitDatabase.ts` — existing query layer patterns (direct inspection)
- `src/db/queries/bsdataExtended.ts` — synced_enhancements query and data model (direct inspection)
- `src/features/army-lists/DetachmentPicker.tsx` — existing stub pattern (direct inspection)
- `.planning/STATE.md` — confirmed Wahapedia CSV availability, duplicate unit context (direct inspection)

---
*Architecture research for: HobbyForge v0.4.7 Wahapedia Pipeline & Full Data Import*
*Researched: 2026-06-04*

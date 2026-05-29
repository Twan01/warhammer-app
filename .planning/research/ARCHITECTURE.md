# Architecture Research: v0.4.0 Unit Database — Canonical 40k Data Hub

**Project:** HobbyForge — v0.4.0 Unit Database
**Researched:** 2026-05-29
**Confidence:** HIGH — based on direct source reading of all relevant files

---

## Existing Architecture (Reference Baseline)

```
UI components  (src/features/**)
      ↓
React Query hooks  (src/hooks/use*.ts)
      ↓
Query modules  (src/db/queries/*.ts)
      ↓
DB client singleton  (src/db/client.ts)  ←→  rules-client.ts
      ↓                                          ↓
Tauri plugin-sql → SQLite              Tauri plugin-sql → SQLite
      hobbyforge.db (migration 1–37)          rules.db (migration 1–4)
```

Pure functions in `src/lib/` have no React or DB imports — called from query modules and hooks alike.

The Rust backend (`src-tauri/src/lib.rs`) has 8 Tauri commands: `bulk_sync_rules`, `export_backup`, `validate_backup`, `create_safety_backup`, `restore_from_backup`, `list_safety_backups`, `write_bytes_to_path`, `get_schema_version`.

---

## What the Current System Does (Critical Baseline)

### Dual-DB Architecture (the problem to solve)

**rules.db (4 migrations, fully ephemeral):**
- `rw_factions`, `rw_datasheets`, `rw_datasheet_models`, `rw_datasheet_abilities`, `rw_datasheet_keywords`, `rw_sources` — Wahapedia datasheet data
- `rw_datasheets_wargear`, `rw_abilities`, `rw_stratagems`, `rw_detachments`, `rw_detachment_abilities` — rules and abilities
- `rw_sync_meta`, `rw_datasheet_points` — sync metadata and points
- **Wipe-and-rebuild pattern**: `bulk_sync_rules` deletes all rows from all 12 tables then re-inserts in a single transaction. Any user data placed here would be lost on sync.

**hobbyforge.db (37 migrations, persistent):**
- All user data lives here: units, factions, collections, recipes, army lists, sessions, battle logs
- Bridge tables that cache rules.db data for cross-DB join-free queries:
  - `synced_unit_points` — points by unit name + faction (replaces cross-DB JOIN)
  - `synced_unit_point_tiers` — model-count tier points (from BSData)
  - `synced_enhancements`, `synced_loadout_options`, `synced_model_counts`, `synced_leader_targets` — BSData extended data
  - `unit_rules_mapping` — TEXT copy of `rules_datasheet_id` (no cross-DB FK possible)
  - `unit_overrides` — user-overrideable stats/points that survive sync

### The Name-Matching Problem (what we're eliminating)

The current COALESCE chain in `getArmyListWithUnits` is:
```sql
COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0)
```
Where `sup.points` is looked up by:
```sql
LEFT JOIN synced_unit_points sup
  ON sup.unit_name = COALESCE(urm.datasheet_name, u.name, alu.ghost_unit_name)
```
This name-based join fails when Wahapedia and BSData disagree on unit names ("Canoptek Spyders" vs "Canoptek Spyder"). The `unit_rules_mapping` table exists specifically to store confirmed name corrections, but it's fragile and requires manual user intervention.

### The Cross-DB Query Limitation

`tauri-plugin-sql` does not support `ATTACH DATABASE` or cross-DB joins. Every query that needs data from both databases must:
1. Run two separate queries
2. Merge results in TypeScript
3. OR maintain a denormalized cache table in hobbyforge.db

This limitation is the root cause of the entire `synced_unit_*` cache infrastructure.

---

## Target Architecture: Single-DB with Canonical Unit Database

### System Overview (After v0.4.0)

```
UI components  (src/features/**)
      ↓
React Query hooks  (src/hooks/use*.ts)
      ↓
Query modules  (src/db/queries/*.ts)
      ↓
DB client singleton  (src/db/client.ts)
      ↓
Tauri plugin-sql → SQLite
      hobbyforge.db (migrations 1–37 + new unit_db_* tables)
```

**rules.db is eliminated.** All game data lives in hobbyforge.db. No cross-DB gap. No cache tables. No denormalized bridges.

---

## Schema Design: Canonical Unit Database Tables

All new tables use the prefix `udb_` (unit database) to be visually distinct from user data tables and the legacy `rw_*` prefix.

### Core Tables

```sql
-- udb_factions: canonical 40k factions
CREATE TABLE udb_factions (
    id          TEXT PRIMARY KEY,  -- e.g. "SM", "NEC", "TAU" (stable identifier)
    name        TEXT NOT NULL,     -- "Space Marines", "Necrons", "T'au Empire"
    short_name  TEXT,              -- "Space Marines" → "SM" for display
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- udb_units: one row per datasheet (a unit's "card")
CREATE TABLE udb_units (
    id              TEXT PRIMARY KEY,  -- stable UUID or slug, e.g. "SM-intercessors"
    faction_id      TEXT NOT NULL REFERENCES udb_factions(id),
    name            TEXT NOT NULL,
    role            TEXT,              -- "Character", "Battleline", "Other", "Vehicle", etc.
    base_points     INTEGER,           -- most common single-cost units
    damaged_w       TEXT,              -- wound threshold for degraded profile, e.g. "W < 9"
    damaged_desc    TEXT,              -- degraded profile text
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- udb_unit_models: stat profiles per model type within a unit
CREATE TABLE udb_unit_models (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id     TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
    line_order  INTEGER NOT NULL DEFAULT 0,
    name        TEXT,               -- model name within datasheet (null = matches unit name)
    M           TEXT,               -- "6"" or "12""
    T           INTEGER,
    Sv          TEXT,               -- "3+" or "4+/4++"
    inv_sv      TEXT,               -- invulnerable save, e.g. "4++"
    W           INTEGER,
    Ld          TEXT,               -- "6+"
    OC          INTEGER
);

-- udb_unit_weapons: weapon profiles
CREATE TABLE udb_unit_weapons (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id         TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
    weapon_group    INTEGER NOT NULL DEFAULT 1,  -- groups profiles under one weapon
    line_order      INTEGER NOT NULL DEFAULT 1,  -- position within group
    name            TEXT NOT NULL,
    category        TEXT,           -- "Ranged" | "Melee"
    range           TEXT,           -- "24"" or "Melee"
    attacks         TEXT,           -- "4" or "D6"
    skill           TEXT,           -- "3+" BS or WS
    strength        TEXT,           -- "4" or "User"
    ap              TEXT,           -- "-1"
    damage          TEXT,           -- "1" or "D3"
    keywords        TEXT            -- "Assault, Pistol" (comma-separated; JSON overkill)
);

-- udb_unit_abilities: datasheet abilities
CREATE TABLE udb_unit_abilities (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id     TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
    line_order  INTEGER NOT NULL DEFAULT 0,
    name        TEXT NOT NULL,
    description TEXT,
    ability_type TEXT  -- "Core", "Faction", "Datasheet", "Wargear"
);

-- udb_unit_keywords: unit and faction keywords
CREATE TABLE udb_unit_keywords (
    unit_id     TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
    keyword     TEXT NOT NULL,
    is_faction  INTEGER NOT NULL DEFAULT 0,  -- 1 = faction keyword, 0 = unit keyword
    PRIMARY KEY (unit_id, keyword)
);

-- udb_unit_points: model-count tier points
CREATE TABLE udb_unit_points (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id     TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
    model_count INTEGER NOT NULL,   -- number of models in this tier
    points      INTEGER NOT NULL,   -- cost for this tier
    UNIQUE (unit_id, model_count)
);

-- udb_unit_composition: min/max model counts and loadout options
CREATE TABLE udb_unit_composition (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id     TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
    min_models  INTEGER NOT NULL DEFAULT 1,
    max_models  INTEGER NOT NULL DEFAULT 1,
    notes       TEXT    -- e.g. "Includes 1 Sergeant"
);

-- udb_unit_leader_targets: which units a Character can lead
CREATE TABLE udb_unit_leader_targets (
    leader_unit_id  TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
    target_unit_id  TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
    PRIMARY KEY (leader_unit_id, target_unit_id)
);

-- udb_shared_abilities: shared ability definitions (referenced by multiple units)
CREATE TABLE udb_shared_abilities (
    id          TEXT PRIMARY KEY,
    faction_id  TEXT REFERENCES udb_factions(id),
    name        TEXT NOT NULL,
    description TEXT
);

-- udb_detachments: detachment definitions
CREATE TABLE udb_detachments (
    id          TEXT PRIMARY KEY,
    faction_id  TEXT NOT NULL REFERENCES udb_factions(id),
    name        TEXT NOT NULL,
    description TEXT
);

-- udb_detachment_abilities: abilities granted by a detachment
CREATE TABLE udb_detachment_abilities (
    id              TEXT PRIMARY KEY,
    detachment_id   TEXT NOT NULL REFERENCES udb_detachments(id) ON DELETE CASCADE,
    faction_id      TEXT REFERENCES udb_factions(id),
    name            TEXT NOT NULL,
    description     TEXT
);

-- udb_stratagems: stratagem definitions
CREATE TABLE udb_stratagems (
    id              TEXT PRIMARY KEY,
    faction_id      TEXT REFERENCES udb_factions(id),
    detachment_id   TEXT REFERENCES udb_detachments(id),
    name            TEXT NOT NULL,
    cp_cost         TEXT,
    phase           TEXT,
    turn            TEXT,
    type            TEXT,
    description     TEXT
);

-- udb_enhancements: faction enhancement options
CREATE TABLE udb_enhancements (
    id              TEXT PRIMARY KEY,
    faction_id      TEXT NOT NULL REFERENCES udb_factions(id),
    detachment_id   TEXT REFERENCES udb_detachments(id),
    name            TEXT NOT NULL,
    points          INTEGER NOT NULL DEFAULT 0,
    description     TEXT
);

-- udb_meta: database build metadata (one row)
CREATE TABLE udb_meta (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    version     TEXT NOT NULL,        -- semver string, e.g. "1.0.0"
    built_at    TEXT NOT NULL,        -- ISO 8601 build timestamp
    game_system TEXT NOT NULL DEFAULT '40k-10th',
    unit_count  INTEGER,
    faction_count INTEGER
);
```

### The FK from Collection Units to Canonical Database

The critical new column on the existing `units` table (added via migration):

```sql
ALTER TABLE units ADD COLUMN udb_unit_id TEXT REFERENCES udb_units(id) ON DELETE SET NULL;
```

`ON DELETE SET NULL` is the correct behavior: if a unit database record is removed during a data update, the collection unit is not deleted — it simply loses the database link and falls back to manual-entry mode (ghost unit behavior). This is the same defensive pattern as `detachment_name` denormalization.

---

## Component Boundaries

### New Components

| Component | Type | File | Responsibility |
|-----------|------|------|----------------|
| `udb_*` tables (15 tables) | Schema | migrations/038_unit_database.sql | Canonical game data |
| `udb_unit_id` column | Schema | migrations/039_collection_udb_link.sql | FK from units → udb_units |
| `src/db/queries/unitDatabase.ts` | Query module | New | All reads from udb_* tables |
| `src/hooks/useUnitDatabase.ts` | React Query hook | New | useUdbFactions, useUdbUnit, useUdbSearch |
| `src/features/unit-database/` | Feature folder | New | Database browser UI |
| `UnitDatabasePage.tsx` | Page component | New | Faction picker + browser |
| `UnitDatabaseBrowser.tsx` | Component | New | Faction → unit list → detail |
| `DatasheetDetailView.tsx` | Component | New | Full stat/weapon/ability display |
| `AddFromDatabaseSheet.tsx` | Component | New | Browse→pick→add-to-collection flow |
| Import script | Node.js script | `scripts/build-unit-db.ts` | Dev-side data build tool |
| `import_unit_database` Rust command | Tauri command | lib.rs | Bulk-import unit DB from JSON |

### Modified Components

| Component | What Changes |
|-----------|--------------|
| `src/db/client.ts` | No change needed — just adds more migrations to hobbyforge.db |
| `src-tauri/src/lib.rs` | Remove `get_rules_migrations()`, remove rules.db plugin registration, add `import_unit_database` command, update `preflight_migration_repair` to skip rules.db |
| `src/db/queries/armyLists.ts` | COALESCE chain simplification — direct FK join to `udb_unit_points` by ID |
| `src/db/queries/units.ts` | Add `udb_unit_id` to insert/update/select |
| `src/features/collection/UnitSheet.tsx` | Add "link to database" picker, show database-linked indicator |
| `src/features/army-lists/UnitPickerDialog.tsx` | Can now show database role/keywords directly |
| `src/features/rules-hub/RulesHubPage.tsx` | Evolve into database browser; remove sync-dependent content |
| `src/hooks/useRulesSync.ts` | Deprecate or demote to "points update only" |
| `src/hooks/useDatasheet.ts` | Replace rules.db queries with udb_* queries |
| `BackupManifest` in lib.rs | Remove `rules_schema_version` and `includes_rules_db` fields (or keep for backward compat) |

### Eliminated Components (after cleanup phase)

| Component | Why Removed |
|-----------|-------------|
| `src/db/rules-client.ts` | rules.db no longer exists |
| `src/db/queries/datasheets.ts` | `rw_*` tables gone; replaced by `unitDatabase.ts` |
| `src/db/queries/rulesExtended.ts` | Stratagems/detachments now in `udb_*` tables |
| `src/db/queries/syncedUnitPoints.ts` | No more sync cache; points come from `udb_unit_points` via FK |
| `src/db/queries/unitRulesMapping.ts` | Name-based matching eliminated by ID FK |
| `src/lib/normalizePointsNames.ts` | Name normalization heuristics no longer needed |
| `src/lib/parseWahapediaCsv.ts` | CSV parsing moved to build-time script |
| `src/lib/fetchBsdataPoints.ts` | BSData XML parsing moved to build-time script |
| `src/lib/parseBsdataExtended.ts` | Same — build-time only |
| `src/lib/validateCsvHeaders.ts` | Sync pipeline no longer runs at runtime |
| `src/hooks/useRulesSync.ts` | No runtime sync needed (or replaced by a minimal updater) |
| `src-tauri/migrations/rules_*.sql` | Still referenced in history but no longer used for new DB |
| `get_rules_migrations()` in lib.rs | rules.db plugin registration removed |
| `bulk_sync_rules` Tauri command | Replaced by `import_unit_database` |
| `synced_unit_points` table | Replaced by direct FK join |
| `synced_unit_point_tiers` table | Replaced by `udb_unit_points` |
| `synced_enhancements` table | Replaced by `udb_enhancements` |
| `synced_loadout_options` table | Replaced by `udb_unit_composition` or inline query |
| `synced_model_counts` table | Replaced by `udb_unit_composition` |
| `synced_leader_targets` table | Replaced by `udb_unit_leader_targets` |
| `unit_rules_mapping` table | Vestigial after FK migration (can be kept for auditing) |
| `unit_overrides` table | Potentially vestigial if overrides move to direct fields on `units` |

---

## Data Flow Changes

### Before: Army List Points (5-layer COALESCE + cross-DB bridge)

```
getArmyListWithUnits(listId)
    → LEFT JOIN units u
    → LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
    → LEFT JOIN unit_rules_mapping urm ON urm.unit_id = u.id
    → LEFT JOIN synced_unit_points sup ON sup.unit_name = COALESCE(urm.datasheet_name, u.name)
    → LEFT JOIN synced_unit_point_tiers tier ON tier.unit_name = ... AND tier.model_count = ...
    → COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0)
```

### After: Army List Points (direct FK join)

```
getArmyListWithUnits(listId)
    → LEFT JOIN units u
    → LEFT JOIN udb_units udb ON udb.id = u.udb_unit_id
    → LEFT JOIN udb_unit_points tier ON tier.unit_id = udb.id AND tier.model_count = alu.selected_model_count
    → COALESCE(alu.points_override, tier.points, udb.base_points, u.points, 0)
```

4 joins → 2 joins. Name-matching eliminated. Freshness concerns eliminated.

### Before: Datasheet Display (cross-DB, 5 queries)

```
getFullDatasheet(datasheetId)
    → getRulesDb() [separate connection]
    → SELECT rw_datasheets WHERE id = $1
    → SELECT rw_datasheet_models WHERE datasheet_id = $1
    → SELECT rw_datasheet_abilities WHERE datasheet_id = $1
    → SELECT rw_datasheet_keywords WHERE datasheet_id = $1
    → SELECT rw_datasheets_wargear WHERE datasheet_id = $1
    → SELECT rw_sources WHERE id = $source_id
    → Merge in TypeScript → FullDatasheet
```

### After: Datasheet Display (single DB, structured query)

```
getUdbUnit(unitId)
    → getDb() [hobbyforge.db]
    → SELECT udb_units WHERE id = $1
    → SELECT udb_unit_models WHERE unit_id = $1 ORDER BY line_order
    → SELECT udb_unit_weapons WHERE unit_id = $1 ORDER BY weapon_group, line_order
    → SELECT udb_unit_abilities WHERE unit_id = $1 ORDER BY line_order
    → SELECT udb_unit_keywords WHERE unit_id = $1
    → SELECT udb_unit_points WHERE unit_id = $1 ORDER BY model_count
    → Merge in TypeScript → UdbUnitDetail
```

Same number of queries but all on one connection. No WAL checkpoint race condition. No stale read problem.

### New: "Add from Database" Collection Flow

```
User opens AddFromDatabaseSheet
    → useUdbFactions() → SELECT udb_factions ORDER BY name
    → User picks faction
    → useUdbUnitsByFaction(factionId) → SELECT udb_units WHERE faction_id = $1 ORDER BY role, name
    → User picks unit
    → Unit detail auto-fills: name, faction_id (from local factions), role as category, base_points
    → createUnit({ ...prefilled, udb_unit_id: udb.id }) [mutation]
    → Cache invalidated: UNITS_KEY
```

### New: Database Browser Navigation

```
/database                    → UnitDatabasePage (faction grid)
/database/:factionId         → UnitDatabasePage (faction unit list)
/database/:factionId/:unitId → UnitDatabasePage (unit detail panel/sheet)
```

Alternatively, the database browser can live within a new tab on the existing RulesHubPage route and avoid new routes. Recommendation: keep existing `/rules` route URL, rename the page to DatabaseBrowserPage, evolve the UI rather than create a parallel route.

---

## Import Pipeline Architecture

### Dev-Side Build Script (not runtime)

```
scripts/build-unit-db.ts   (Node.js, runs in dev, not shipped with app)
    ↓ reads
Source data (40k.app scrape, Wahapedia CSV, BSData XML)
    ↓ transforms
Normalized intermediate JSON (per-faction, per-unit structure)
    ↓ validates
Schema correctness, point tier coverage, faction completeness
    ↓ outputs
src-tauri/data/unit_database.json   (checked into repo, versioned with semver)
```

### Runtime Import Tauri Command

```typescript
// new Tauri command: import_unit_database
invoke("import_unit_database", { version: "1.0.0" })
```

The Rust command:
1. Reads `unit_database.json` from the app bundle (not a runtime download)
2. Opens a sqlx connection directly to hobbyforge.db
3. Deletes all `udb_*` table rows (FK checks off, same as current bulk_sync_rules pattern)
4. Re-inserts all rows in a single transaction
5. Updates `udb_meta`
6. Returns import counts

This follows the same pattern as `bulk_sync_rules` but targets hobbyforge.db and uses a pre-built JSON file instead of a runtime HTTP fetch.

### Data Bundling Options

**Option A: JSON file in Tauri assets (recommended)**
- `src-tauri/data/unit_database.json` included via `tauri.conf.json` `resources` field
- Loaded at runtime via `tauri_plugin_fs::read_file` or embedded with `include_str!`
- Pros: Versioned in git, diff-reviewable, works offline
- Cons: Binary size increase (~5-10MB for full 40k dataset)

**Option B: Migration-embedded SQL seed**
- Unit data as a very large SQL migration (migration 038 or 039)
- Pros: Auto-runs on first launch, no separate import command needed
- Cons: Cannot be updated without a schema version bump; migration files are immutable once deployed; 5000+ INSERT statements in one migration file is unmanageable

**Option C: Pre-built SQLite file bundled separately**
- Ship a separate `unit_database.db` that gets copied to app_data_dir on first launch or update
- Pros: SQLite-native, indexed from day one
- Cons: Still a separate file (not a clean single-DB solution); more complex update logic

**Recommendation: Option A** — JSON bundled in Tauri resources, loaded by a Rust import command. This preserves the single-DB architecture, is fully diff-reviewable, and follows the established Tauri command pattern.

---

## Migration Strategy

### Phase-by-Phase Migration Safety

The existing 37 migrations in hobbyforge.db are never edited. The unit database arrives via additive migrations:

**Migration 038: udb_schema** — create all `udb_*` tables (empty)

**Migration 039: udb_collection_link** — add `udb_unit_id TEXT` column to `units` table:
```sql
ALTER TABLE units ADD COLUMN udb_unit_id TEXT REFERENCES udb_units(id) ON DELETE SET NULL;
```

**Migration 040 (optional): udb_backfill_link** — attempt name-based backfill for existing units:
```sql
UPDATE units
SET udb_unit_id = (
    SELECT udb.id FROM udb_units udb
    WHERE LOWER(udb.name) = LOWER(units.name)
    LIMIT 1
)
WHERE udb_unit_id IS NULL;
```
This runs only after the unit database is populated (which happens via the import command, not migration). For users running the import for the first time, the backfill can be triggered as a separate step after import.

### Existing User Data Preservation

| Existing Table | Impact | Action |
|---------------|--------|--------|
| `units` | Gains `udb_unit_id` column (nullable) | Migration 039; existing rows get NULL |
| `synced_unit_points` | Becomes vestigial | Keep during transition; remove in cleanup phase |
| `synced_unit_point_tiers` | Becomes vestigial | Same |
| `unit_rules_mapping` | Becomes vestigial | Keep as audit trail; remove in cleanup phase |
| `unit_overrides` | May become vestigial (if overrides move to units table) | Evaluate per phase |
| Army list effective_points | Join changes, not data | COALESCE chain updated in query layer |
| `rules_favorites_notes` | User annotations on `rw_*` IDs — these are text IDs | Map old rw_ IDs to udb_ IDs in migration; or accept loss (low usage) |
| `army_lists.detachment_id` | TEXT copy of rw_detachments.id | Map to `udb_detachments.id` in migration |

### Handling User Annotations on Rules Data

The `rules_favorites_notes` table stores `entity_type` + `entity_id` (TEXT, matching `rw_*` primary keys). After migration:
- If `udb_*` IDs can be made to match the old `rw_*` IDs (same Wahapedia text IDs), the annotations survive without any migration
- If IDs change, a one-time migration maps old `rw_` IDs to new `udb_` IDs
- Worst case: annotations reset (low cost for a personal tool)

**Recommendation:** Design `udb_factions.id`, `udb_detachments.id`, `udb_stratagems.id` to reuse the Wahapedia text IDs verbatim. This makes `rules_favorites_notes` work without any migration.

---

## New File Structure

```
src/
  features/
    unit-database/                    # NEW feature folder
      UnitDatabasePage.tsx            # Main page: faction picker + browser + detail
      UnitDatabaseBrowser.tsx         # Faction list → unit list navigation
      DatasheetDetailView.tsx         # Stats, weapons, abilities, keywords display
      UnitRoleGroup.tsx               # Units grouped by role within a faction
      AddFromDatabaseSheet.tsx        # Browse + pick + confirm → add to collection
      UnitDatabaseFilters.ts          # Zustand filter store (search, role, points range)
      applyUnitDatabaseFilters.ts     # Pure filter function
    collection/
      UnitSheet.tsx                   # MODIFIED: add database link UI
    army-lists/
      UnitPickerDialog.tsx            # MODIFIED: show database role/keywords

  db/
    queries/
      unitDatabase.ts                 # NEW: all udb_* read queries
      armyLists.ts                    # MODIFIED: simplified COALESCE chain
      units.ts                        # MODIFIED: include udb_unit_id

  hooks/
    useUnitDatabase.ts                # NEW: React Query hooks for udb_* tables

  types/
    unitDatabase.ts                   # NEW: UdbFaction, UdbUnit, UdbUnitDetail, etc.

scripts/
  build-unit-db.ts                    # NEW: dev-side data build script
  parse-wahapedia.ts                  # NEW: Wahapedia CSV → intermediate JSON
  parse-bsdata.ts                     # NEW: BSData XML → intermediate JSON

src-tauri/
  data/
    unit_database.json                # NEW: pre-built unit data (versioned in git)
  migrations/
    038_udb_schema.sql                # NEW: all udb_* table definitions
    039_udb_collection_link.sql       # NEW: units.udb_unit_id column
  src/
    lib.rs                            # MODIFIED: import_unit_database command
```

---

## Suggested Build Order

### Phase 1: Schema + Data Foundation (no UI)

**Goal:** Canonical tables exist and are populated. No UI changes.

1. Write `038_udb_schema.sql` — all `udb_*` table CREATE statements
2. Register migration 038 in `lib.rs` (hobbyforge.db migrations list)
3. Write `scripts/build-unit-db.ts` — parse sources, emit `unit_database.json`
4. Write `import_unit_database` Rust command — reads JSON, bulk-imports into udb_* tables
5. Register `import_unit_database` in invoke_handler
6. Validate: import runs, all factions + units + weapons + abilities + points loaded

**Why first:** All subsequent phases depend on data being present. Schema must be stable before UI is built. This phase has zero risk to existing user data.

### Phase 2: Database Browser UI

**Goal:** User can browse all factions and see unit datasheets. No collection integration yet.

1. Write `src/db/queries/unitDatabase.ts` — `getUdbFactions()`, `getUdbUnitsByFaction()`, `getUdbUnitDetail()`
2. Write `src/hooks/useUnitDatabase.ts` — `useUdbFactions`, `useUdbUnitsByFaction`, `useUdbUnitDetail`
3. Write `src/types/unitDatabase.ts` — all TypeScript interfaces
4. Build `UnitDatabasePage.tsx` with faction grid
5. Build `DatasheetDetailView.tsx` — stats table, weapons table, abilities list
6. Add route to `src/app/router.tsx` — replace or evolve `/rules` route
7. Validate: faction picker loads, unit list shows by faction, detail view renders full datasheet

**Why second:** Browsing works without any collection changes. Delivers immediate user value. Validates data completeness before any FK migration.

### Phase 3: Collection Integration + FK Migration

**Goal:** Collection units link to database by ID. "Add from database" flow replaces manual entry.

1. Write `039_udb_collection_link.sql` — add `udb_unit_id` to `units`
2. Register migration 039 in lib.rs
3. Build `AddFromDatabaseSheet.tsx` — browse → pick → pre-filled create unit form
4. Modify `UnitSheet.tsx` — show "linked to database" indicator; allow manual link picker
5. Write backfill query — attempt name-match on first import for existing units
6. Validate: new units added via database get `udb_unit_id` set; existing units get backfill attempt

**Why third:** Schema migration (039) is destructive-additive — must happen after browser UI is proven stable. Backfill only runs after unit data is loaded. FK integrity is additive (NULL allowed), so zero risk to existing data.

### Phase 4: Army List Points Simplification

**Goal:** Army list points come directly from `udb_unit_points` via FK. Sync cache tables eliminated.

1. Modify `getArmyListWithUnits` — update COALESCE chain to use `udb_unit_points` for linked units
2. Keep `synced_unit_points` / `synced_unit_point_tiers` JOINs as fallback for unlinked units during transition
3. Validate: army list totals match expected values; linked units use database points; unlinked units fall back gracefully

**Why fourth:** Depends on Phase 3 (units must have `udb_unit_id` set to benefit from the new join). Safe to implement incrementally — the fallback COALESCE preserves existing behavior for units without a database link.

### Phase 5: Cleanup — Remove rules.db Dependency

**Goal:** rules.db registration removed. Sync pipeline retired. Dead code deleted.

1. Remove `get_rules_migrations()` from lib.rs
2. Remove `add_migrations("sqlite:rules.db", ...)` from Tauri builder
3. Remove `bulk_sync_rules` command (or leave as dead code for one release)
4. Remove `src/db/rules-client.ts`
5. Remove `src/db/queries/datasheets.ts` (rw_* queries replaced by unitDatabase.ts)
6. Remove `src/db/queries/rulesExtended.ts`, `syncedUnitPoints.ts`
7. Remove `src/lib/normalizePointsNames.ts`, `parseWahapediaCsv.ts`, `fetchBsdataPoints.ts`, `parseBsdataExtended.ts`, `validateCsvHeaders.ts`
8. Remove `src/hooks/useRulesSync.ts` (or convert to a minimal "check for updates" hook)
9. Update `BackupManifest` — remove `rules_schema_version` / `includes_rules_db` (keep for backward compat with old backup files)
10. Validate: app launches with no rules.db dependency; backup/restore still works

**Why last:** Depends on Phases 1–4 being fully functional. Cleanup is low-risk but high-noise (many file deletions). Do after all features are proven working.

---

## Integration Points

### tauri-plugin-sql Constraints (unchanged)

- No `ATTACH DATABASE` support — the single-DB move eliminates this constraint entirely
- No nested transactions — `import_unit_database` command uses the same flat `BEGIN/COMMIT` pattern as `bulk_sync_rules`
- `$1, $2` positional parameter syntax — all new queries follow existing convention
- `PRAGMA foreign_keys = ON` — `client.ts` already sets this on every connection; udb FKs are enforced automatically

### React Query Cache Keys

New keys needed:

```typescript
export const UDB_FACTIONS_KEY = ["udb-factions"] as const;
export const UDB_UNITS_KEY = (factionId: string) => ["udb-units", factionId] as const;
export const UDB_UNIT_KEY = (unitId: string) => ["udb-unit", unitId] as const;
export const UDB_SEARCH_KEY = (query: string) => ["udb-search", query] as const;
export const UDB_META_KEY = ["udb-meta"] as const;
```

After `import_unit_database` runs, all `udb-*` keys must be invalidated. Cache invalidation is the responsibility of the mutation hook that triggers the import.

`staleTime: Infinity` is appropriate for all `udb-*` keys — database content only changes when the user explicitly imports an update, not on a schedule.

### Backup/Restore Impact

The structured backup (`export_backup`) already excludes rules.db (it only backs up hobbyforge.db). After the migration, the unit database lives in hobbyforge.db and is therefore automatically included in backups. This is correct: the canonical unit data is part of the user's working state.

The `BackupManifest` fields `rules_schema_version` and `includes_rules_db` become vestigial. Leave them in the struct with `#[serde(default)]` for backward compat with existing backup files — old backups that lack these fields will still parse. Do not remove them until the struct needs a breaking change for another reason.

### Preflight Migration Repair

`preflight_migration_repair()` in lib.rs currently handles both hobbyforge.db and rules.db. After cleanup, remove the rules.db repair branch. The hobbyforge.db repair logic stays unchanged.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Putting Unit Data in Migrations

**What people do:** Write the full 40k dataset as SQL `INSERT` statements in a migration file.

**Why it's wrong:** Migration files are immutable once deployed. Updating unit data (points changes, new units) requires a new migration and a schema version bump. 5000+ INSERT statements in a migration are unmanageable as a diff. Migration repair checksums would need to be recalculated every time data changes.

**Do this instead:** Use a versioned JSON file (`unit_database.json`) + a Rust import command that does a wipe-and-rebuild on the `udb_*` tables. The JSON file is tracked in git and produces clean diffs.

### Anti-Pattern 2: Keeping the Dual-DB Architecture "Just in Case"

**What people do:** Keep rules.db registration active alongside the new udb_* tables, "just in case we need to fall back."

**Why it's wrong:** Two database connections add startup cost. The WAL checkpoint race condition that caused stale reads is still present. The name-matching bugs are still present. Having two parallel sources of truth makes every query a decision.

**Do this instead:** Commit fully to single-DB. Keep the sync code in a branch or archived. The backup/restore mechanism protects against data loss if a rollback is needed.

### Anti-Pattern 3: Cross-DB Query via TypeScript Merge for Rules + User Data

**What people do:** Continue the pattern of "query rules.db for data, query hobbyforge.db for user annotations, merge in TypeScript."

**Why it's wrong:** This was only necessary because of the cross-DB limitation. With udb_* in hobbyforge.db, a single SQL query can JOIN `udb_units`, `udb_unit_abilities`, AND `rules_favorites_notes` in one round-trip. TypeScript merge is more error-prone and harder to optimize.

**Do this instead:** Write JOIN queries that span udb_* and user annotation tables in hobbyforge.db. Use the existing `rules_favorites_notes` entity_id pattern (if IDs are compatible) to surface favorites/notes alongside canonical unit data in one query.

### Anti-Pattern 4: Strict FK from Units to udb_units (NOT NULL)

**What people do:** Make `units.udb_unit_id NOT NULL` to enforce all units have a database record.

**Why it's wrong:** Custom units, kitbash units, proxy units, or units from expansions not yet in the database cannot be added. The user gets blocked from adding legitimate collection items.

**Do this instead:** Keep `udb_unit_id` nullable. Units without a database link behave as they do today (name-based matching falls back to `u.points`). The migration requirement UDB-20 ("Custom/kitbash units can still be added manually") requires this.

### Anti-Pattern 5: Replacing the Entire RulesHubPage at Once

**What people do:** Delete `RulesHubPage.tsx` and build `UnitDatabasePage.tsx` from scratch in one phase.

**Why it's wrong:** The current Rules Hub has tabs for stratagems, detachments, and shared abilities — all of which have user annotations (favorites, notes). A full replacement risks breaking those annotation surfaces and losing the existing Game Day integration.

**Do this instead:** Evolve the existing page incrementally. Add a new "Units" tab (or replace the first tab). Keep stratagems/detachments working (they'll be served from `udb_stratagems` and `udb_detachments` after migration). Remove sync-specific UI (sync status card, error history) only in the cleanup phase.

---

## Sources

- `src-tauri/src/lib.rs` — verified: `bulk_sync_rules` pattern, all 8 Tauri commands, migration registration, `preflight_migration_repair`
- `src-tauri/migrations/rules_001_schema.sql`, `rules_002_wargear_abilities.sql` — verified: existing `rw_*` table shapes
- `src-tauri/migrations/026_unit_rules_mapping.sql`, `029_synced_point_tiers.sql`, `030_bsdata_extended.sql`, `031_army_list_v3.sql` — verified: bridge tables and army list schema
- `src/db/client.ts`, `src/db/rules-client.ts` — verified: singleton pattern, WAL + FK pragmas
- `src/db/queries/datasheets.ts` — verified: cross-DB query pattern, FACTION_ALIAS_MAP, name-matching complexity
- `src/db/queries/syncedUnitPoints.ts` — verified: cache table management, batched INSERT pattern
- `src/db/queries/armyLists.ts` lines 60–94 — verified: current 6-level COALESCE chain
- `src/db/queries/units.ts` lines 1–35 — verified: `getUnitsWithPoints` LEFT JOIN pattern
- `src/features/rules-hub/RulesHubPage.tsx` — verified: sync-dependent UI components
- `.planning/PROJECT.md` — v0.4.0 milestone targets, architectural constraints, Key Decisions table
- `.planning/milestone-unit-database.md` — schema direction, phase breakdown, requirements UDB-01 to UDB-20

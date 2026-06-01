# Architecture Research

**Domain:** Unit Database 2.0 — sub-factions, bilingual data, PlaybookTab revival, Game Day enrichment
**Researched:** 2026-06-01
**Confidence:** HIGH (all findings sourced from direct codebase reading)

---

## Standard Architecture

### System Overview

```
UI Layer  (src/features/**)
  DatabaseBrowserPage     PlaybookTab             GameDayPage
  FactionPicker           PlaybookDatasheet       UnitsTab
  UdbFilterBar            PlaybookRules(STUB)      UnitAbilityCard
  UdbUnitRow              PlaybookStats            StrategemsTab(STUB)
         |                       |                        |
Hook Layer  (src/hooks/**)
  useDatasheet / useDatasheetsByFaction / useWahapediaFactions
  useUdbMeta / useUdbFilters / useGameDayStore(Zustand)
         |
Query Layer  (src/db/queries/unitDatabase.ts)
  getUdbFactions / getUdbUnitsByFaction / getUdbUnitDetail
  getUdbOwnershipByFaction / getUdbKeywordsByFaction / searchUdbUnits
         |
DB Client (src/db/client.ts)
  hobbyforge.db  —  udb_* tables (migration 038–040)
  udb_factions  udb_units  udb_unit_models  udb_unit_weapons
  udb_unit_abilities  udb_unit_keywords  udb_unit_points
  udb_unit_composition  udb_search(FTS5)  udb_meta

Build Pipeline (dev-side only — never imported at runtime):
  scripts/build-unit-db.ts
    Wahapedia CSVs (EN) + BSData .cat XML
    → src-tauri/data/unit_database.json
    → Rust import_unit_database command at first launch
    → udb_* tables populated
```

### Component Responsibilities

| Component | Responsibility | Current State |
|-----------|----------------|---------------|
| `build-unit-db.ts` | Offline: CSVs + XML → JSON | Live; BSData name-matching is lossy |
| `udb_factions` | 25 top-level factions (TEXT PK) | Live |
| `udb_units` | 1,711 datasheets with role, base_points | Live — no sub_faction column |
| `udb_unit_keywords` | Faction + regular keywords, `is_faction` flag | Live; sub-faction keywords already stored here |
| `udb_unit_models` | Per-model stat profiles (M/T/Sv/W/Ld/OC) | Live |
| `udb_unit_weapons` | Ranged + melee weapon profiles | Live |
| `udb_unit_abilities` | Abilities with `ability_type` field | Live |
| `getUdbUnitDetail()` | 6-parallel-select full datasheet load | Live |
| `PlaybookDatasheet` | Weapons + abilities from udb_* | Live, renders correctly |
| `PlaybookRules` | Stratagems/detachments | STUBBED — `return null` since rules.db eliminated |
| `UnitAbilityCard` | Game Day per-unit abilities from udb_* | Live via useDatasheet |
| `StrategemsTab` | Phase-grouped stratagems | STUBBED — local hook returns `[]` |

---

## Sub-Faction Architecture

### Design Decision: Denormalized column — NOT a new table

Sub-factions in 40K 10th edition are expressed through faction keywords. Ultramarines, Blood Angels, and Dark Angels are all `SM` (Space Marines) with distinguishing faction keywords `ULTRAMARINES`, `BLOOD ANGELS`, etc. These keywords already exist in `udb_unit_keywords` with `is_faction = 1`.

A dedicated `udb_sub_factions` table would duplicate data already in keywords. A JOIN for filtering on every query is unnecessary overhead for a static attribute. The correct approach: denormalize `sub_faction TEXT` onto `udb_units`, derived at build time from BSData catalogue names.

### Schema Migration: Add `sub_faction` to `udb_units`

```sql
-- Migration 041: Sub-faction column
ALTER TABLE udb_units ADD COLUMN sub_faction TEXT;

CREATE INDEX IF NOT EXISTS idx_udb_units_sub_faction
  ON udb_units(faction_id, sub_faction);
```

No backfill SQL needed — the column is populated by regenerating `unit_database.json` from the updated build script, then running the Rust import command (wipe + re-insert, same as initial load).

### Build Script: `SUB_FACTION_MAP`

The existing `FACTION_MAP` already maps BSData catalogue names like `"Imperium - Ultramarines"` to `"SM"`. Extend with a parallel map for sub-faction labels:

```typescript
const SUB_FACTION_MAP: Record<string, string | null> = {
  "Imperium - Ultramarines":   "Ultramarines",
  "Imperium - Blood Angels":   "Blood Angels",
  "Imperium - Dark Angels":    "Dark Angels",
  "Imperium - Black Templars": "Black Templars",
  "Imperium - Deathwatch":     "Deathwatch",
  "Imperium - Imperial Fists": "Imperial Fists",
  "Imperium - Iron Hands":     "Iron Hands",
  "Imperium - Raven Guard":    "Raven Guard",
  "Imperium - Salamanders":    "Salamanders",
  "Imperium - Space Wolves":   "Space Wolves",
  "Imperium - White Scars":    "White Scars",
  "Imperium - Space Marines":  null,  // generic SM, no sub-faction
  // CSM warbands, Aeldari sub-factions follow same pattern
};
```

During step 8 (BSData processing), each unit matched from a catalogue with a non-null `SUB_FACTION_MAP` entry gets `sub_faction` set on its `UdbUnitRow`. Units from generic catalogues get `sub_faction = null`.

The `UdbUnitRow` interface gains a `sub_faction: string | null` field. The Rust import adds it to the INSERT statement. No other Rust changes needed.

### Filter UI Changes

`databaseBrowserFilters.ts` (Zustand store) gains a `subFaction: string | null` field.

`UdbFilterBar` gains a sub-faction `<Select>` dropdown. It appears only when a faction that has sub-factions is selected. Populated by:

```typescript
// New query in unitDatabase.ts
export async function getUdbSubFactionsByFaction(
  factionId: string
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ sub_faction: string }[]>(
    `SELECT DISTINCT sub_faction
     FROM udb_units
     WHERE faction_id = $1 AND sub_faction IS NOT NULL
     ORDER BY sub_faction`,
    [factionId],
  );
  return rows.map((r) => r.sub_faction);
}
```

`getUdbUnitsByFaction()` adds an optional `subFaction` parameter that appends `AND u.sub_faction = $2`. The hook `useDatasheetsByFaction` passes it through. `applyUdbFilters.ts` adds a sub-faction predicate for client-side filtering in the detail panel.

---

## Bilingual Data Architecture

### Design Decision: Parallel `_fr` locale columns (not a separate table, not JSON)

Three options were evaluated:

- **Separate locale tables** (`udb_unit_abilities_fr` etc.): doubles query surface, every function needs two SELECT paths, FTS5 requires two virtual tables, overwhelming complexity for a column swap.
- **JSON column** (`names_json TEXT`): opaque to SQL filtering and FTS, requires JSON parsing on every read.
- **Parallel locale columns** (`_fr` suffix, recommended): additive schema change, COALESCE at query layer, zero structural change to query functions, single FTS5 table with bilingual columns.

### Schema Migrations: Add `_fr` Columns

```sql
-- Migration 042: French locale columns

-- Units: display name and degraded profile description
ALTER TABLE udb_units ADD COLUMN name_fr TEXT;
ALTER TABLE udb_units ADD COLUMN damaged_desc_fr TEXT;

-- Factions: display name
ALTER TABLE udb_factions ADD COLUMN name_fr TEXT;

-- Abilities: name and full description text
ALTER TABLE udb_unit_abilities ADD COLUMN name_fr TEXT;
ALTER TABLE udb_unit_abilities ADD COLUMN description_fr TEXT;

-- Weapons: name and weapon keyword text
ALTER TABLE udb_unit_weapons ADD COLUMN name_fr TEXT;
ALTER TABLE udb_unit_weapons ADD COLUMN keywords_fr TEXT;

-- Keywords: localized keyword text (faction keywords have translated names in FR)
ALTER TABLE udb_unit_keywords ADD COLUMN keyword_fr TEXT;

-- udb_unit_models: stat values are numbers, model profile names rarely localized.
-- Defer model name_fr unless evidence of FR profile name differences.
```

All `_fr` columns nullable. No data is lost when French data is unavailable.

### Query Layer: Locale Parameter Pattern

```typescript
type Locale = 'en' | 'fr';

// In getUdbUnitDetail(unitId, locale = 'en'):
const nameCol = locale === 'fr'
  ? "COALESCE(u.name_fr, u.name) AS name"
  : "u.name";

// In ability SELECT:
const abilityNameCol = locale === 'fr'
  ? "COALESCE(a.name_fr, a.name) AS name, COALESCE(a.description_fr, a.description) AS description"
  : "a.name, a.description";
```

Both `getUdbUnitDetail()` and `getUdbUnitsByFaction()` add an optional `locale: Locale = 'en'` parameter. The hook files (`useDatasheet`, `useDatasheetsByFaction`) thread the locale through. Cache keys include locale:

```typescript
export const DATASHEET_KEY = (unitId: number, locale: Locale = 'en') =>
  ["datasheet", unitId, locale] as const;
```

### Locale Persistence

A `useLocale` hook reads/writes `localStorage` key `hobbyforge:locale` with values `'en' | 'fr'`. This matches the existing pattern for `hobbyforge:sidebar-collapsed` and `hobbyforge:view-mode`. No schema migration, no SQLite table, no React Context required. The hook exposes `[locale, setLocale]`.

A locale toggle button lives in `UdbFilterBar` (or the Database Browser toolbar). It renders as a compact `EN | FR` toggle.

### Build Script: French CSV Loading

Wahapedia publishes French CSV files with the same pipe-delimited format and same `datasheet_id` primary key. Add an optional French data loading step after existing step 7:

```typescript
// Step 7b: Load French locale overrides (skips silently if files absent)
const FR_CSV_DIR = join(DATA_DIR, "fr");  // scripts/data/fr/
const frCsvs = ["Datasheets_FR.csv", "Datasheets_abilities_FR.csv"];

// Build Map<unitId, { name_fr, damaged_desc_fr }>
// Merge into UdbUnitRow as name_fr, damaged_desc_fr fields.
// Merge into ability rows as name_fr, description_fr.
```

Merge is safe because `datasheet_id` is the same key in both EN and FR CSVs. The JSON output includes `_fr` fields whenever present. The Rust import adds them to INSERT column lists. When `_fr` fields are absent (null in JSON), the INSERT writes NULL.

### FTS5 Search with Bilingual Data

The current `udb_search` FTS5 virtual table cannot have columns added after creation. It must be rebuilt:

```sql
-- Migration 044 (after 042): Rebuild FTS5 with French columns
-- (Executed after udb_search virtual table recreation)
DROP TABLE IF EXISTS udb_search;
CREATE VIRTUAL TABLE udb_search
  USING fts5(unit_id UNINDEXED, name, name_fr, faction_name, faction_name_fr, keywords, keywords_fr);
```

The Rust import populates `name_fr`, `keywords_fr`, `faction_name_fr` when available, empty string otherwise. `searchUdbUnits()` hits all columns automatically via FTS5.

---

## PlaybookTab Revival Architecture

### Current State

`PlaybookTab` works correctly for stats and canonical datasheet data:

```
PlaybookTab
  → useDatasheet(unitId)          [units.udb_unit_id → getUdbUnitDetail()]
  → PlaybookStats                 [renders models[0] stats]          LIVE
  → PlaybookDatasheet(datasheet)  [renders weapons + abilities]       LIVE
  → PlaybookRules()               [returns null]                      STUBBED
  → TierManager + LoadoutSection  [points override + wargear]         LIVE
  → PlaybookStrategy              [user text notes]                   LIVE
```

`PlaybookRules` is the only broken piece. It previously showed stratagems and detachment abilities from `rules.db`. The revival path requires adding those tables to the canonical unit database.

### Schema Migration: Stratagems and Detachments

```sql
-- Migration 043: Canonical stratagems and detachments

CREATE TABLE IF NOT EXISTS udb_detachments (
  id          TEXT PRIMARY KEY,       -- Wahapedia detachment_id (text, reuse for FK compat)
  faction_id  TEXT NOT NULL REFERENCES udb_factions(id),
  name        TEXT NOT NULL,
  name_fr     TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS udb_detachment_abilities (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  detachment_id   TEXT NOT NULL REFERENCES udb_detachments(id) ON DELETE CASCADE,
  line_order      INTEGER NOT NULL DEFAULT 0,
  name            TEXT NOT NULL,
  name_fr         TEXT,
  description     TEXT,
  description_fr  TEXT
);

CREATE TABLE IF NOT EXISTS udb_stratagems (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  detachment_id   TEXT NOT NULL REFERENCES udb_detachments(id) ON DELETE CASCADE,
  line_order      INTEGER NOT NULL DEFAULT 0,
  name            TEXT NOT NULL,
  name_fr         TEXT,
  cp_cost         INTEGER NOT NULL DEFAULT 1,
  phase           TEXT,              -- 'Command'|'Movement'|'Shooting'|'Charge'|'Fight'|null
  description     TEXT,
  description_fr  TEXT
);

CREATE INDEX IF NOT EXISTS idx_udb_detachments_faction_id
  ON udb_detachments(faction_id);
CREATE INDEX IF NOT EXISTS idx_udb_detachment_abilities_detachment_id
  ON udb_detachment_abilities(detachment_id);
CREATE INDEX IF NOT EXISTS idx_udb_stratagems_detachment_id
  ON udb_stratagems(detachment_id);
```

### New Query Functions

Add to `src/db/queries/unitDatabase.ts`:

```typescript
export interface UdbDetachment {
  id: string;
  faction_id: string;
  name: string;
  name_fr: string | null;
}

export interface UdbDetachmentAbility {
  id: number;
  detachment_id: string;
  line_order: number;
  name: string;
  description: string | null;
}

export interface UdbStratagem {
  id: number;
  detachment_id: string;
  line_order: number;
  name: string;
  cp_cost: number;
  phase: string | null;
  description: string | null;
}

export async function getUdbDetachmentsByFaction(
  factionId: string
): Promise<UdbDetachment[]>;

export async function getUdbStratagemsByDetachment(
  detachmentId: string
): Promise<UdbStratagem[]>;

export async function getUdbDetachmentAbilities(
  detachmentId: string
): Promise<UdbDetachmentAbility[]>;
```

### New Hook File: `useUdbRules.ts`

```typescript
// src/hooks/useUdbRules.ts — mirrors useDatasheet.ts pattern

export const UDB_DETACHMENTS_KEY = (factionId: string) =>
  ["udb-detachments", factionId] as const;
export const UDB_STRATAGEMS_KEY = (detachmentId: string) =>
  ["udb-stratagems", detachmentId] as const;

export function useUdbDetachmentsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId
      ? UDB_DETACHMENTS_KEY(factionId)
      : ["udb-detachments", "disabled"],
    queryFn: () =>
      factionId ? getUdbDetachmentsByFaction(factionId) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
  });
}

export function useUdbStratagems(detachmentId: string | undefined) {
  return useQuery({
    queryKey: detachmentId
      ? UDB_STRATAGEMS_KEY(detachmentId)
      : ["udb-stratagems", "disabled"],
    queryFn: () =>
      detachmentId ? getUdbStratagemsByDetachment(detachmentId) : Promise.resolve([]),
    enabled: !!detachmentId,
    staleTime: Infinity,
  });
}
```

### PlaybookRules Rewrite

`PlaybookRules` is currently a null stub (7 lines). It is rewritten to receive `factionId` and optionally a `selectedDetachmentId` prop from `PlaybookTab`. It displays a detachment picker dropdown then phase-grouped stratagems — the same layout already implemented in `StrategemsTab` in Game Day. The component can be built by adapting `StrategemsTab.tsx` rather than starting from scratch.

`PlaybookTab` already has access to the unit's faction via `useWahapediaFactionId(localFaction?.name)`. It passes `wahapediaFactionId` down to `PlaybookRules` as a prop.

### Build Script: Wahapedia Stratagem CSVs

Wahapedia publishes `Detachments.csv`, `Detachments_abilities.csv`, and `Datasheets_stratagems.csv` in the same pipe-delimited format as all other CSVs. Add to `REQUIRED_CSVs` (or a separate optional list) and add parse steps. Output arrays `detachments`, `detachmentAbilities`, `stratagems` are added to `UnitDatabaseJson`. The Rust import command inserts them into the new tables.

---

## Game Day Enrichment Architecture

### Current State

`UnitAbilityCard` already works correctly for abilities:

```
UnitAbilityCard({ unit })
  → useDatasheet(unit.unit_id)     [collection unit ID → udb_unit_abilities]  LIVE
  → OPG detection via text scan                                                LIVE
  → once-per-game ability toggle with strikethrough                            LIVE
  → regular ability list                                                        LIVE
  → strategy notes (useStrategyNote)                                            LIVE

StrategemsTab({ detachmentId })
  → useStratagemsByDetachment()    [local stub → returns []]                   STUBBED
  → reminders from rules_favorites_notes                                        LIVE
  → forgotten rules from battle logs                                            LIVE
```

### Game Day Stratagem Fix

The `StrategemsTab` stub is a single local function at the top of the file:

```typescript
// Line 12–14 of StrategemsTab.tsx (the stub):
function useStratagemsByDetachment(_detachmentId: string | undefined) {
  return { data: [] as import("@/types/datasheet").RwStratagem[], isLoading: false };
}
```

Replace this inline stub with an import of `useUdbStratagems` from `useUdbRules.ts`. The rest of `StrategemsTab` is already functional — it groups stratagems by phase, renders `GameDayStratagemCard` items, and handles CP spending. The only change is the data source.

`RwStratagem` type (from `rules.db` era) must be replaced with the new `UdbStratagem` type from `unitDatabase.ts`. The component accesses `stratagem.id`, `stratagem.name`, `stratagem.cp_cost`, `stratagem.phase`, `stratagem.description` — field names are compatible with the proposed `UdbStratagem` interface.

`GameDayStratagemCard` renders `s.id`, `s.cp_cost`, stratagem name/description. Since `udb_stratagems.id` is now INTEGER (not TEXT), the `key` prop on cards must use `String(s.id)`. One line change.

### Game Day Weapons Quick-Reference

`UnitAbilityCard` collapses stats but shows abilities. Players frequently want weapon stats during play. Add a "Weapons" section to `UnitAbilityCard`:

- Data already available: `datasheet.weapons` from the existing `useDatasheet()` call
- Component already exists: `UdbWeaponsTable` in `src/features/unit-database/UdbWeaponsTable.tsx`
- Addition: import `UdbWeaponsTable` into `UnitAbilityCard`, render it in a `<Collapsible defaultOpen={false}>` below abilities

No new queries, no new hooks. Pure UI addition with component reuse.

---

## 4-Layer Architecture: What Changes vs What Stays

### Layer 1: UI Components

| Component | Action | Scope |
|-----------|--------|-------|
| `PlaybookRules.tsx` | REWRITE — currently null stub | Phase-grouped stratagems + detachment picker |
| `UnitAbilityCard.tsx` | EXTEND — add weapons collapsible | Reuse `UdbWeaponsTable` |
| `StrategemsTab.tsx` | MODIFY — replace stub with `useUdbStratagems` | One import + type swap |
| `UdbFilterBar.tsx` | EXTEND — add sub-faction dropdown | New Zustand field |
| `DatabaseBrowserPage.tsx` | EXTEND — locale toggle in toolbar | Read from `useLocale` |
| `FactionPicker.tsx` | NO CHANGE | Sub-faction filter lives in UdbFilterBar |
| `PlaybookTab.tsx` | MINOR — pass factionId to PlaybookRules | Props addition only |

### Layer 2: Hooks

| Hook | Action | Notes |
|------|--------|-------|
| `useUdbRules.ts` | NEW FILE | Detachments + stratagems hooks |
| `useLocale.ts` | NEW FILE | `'en' \| 'fr'` stored in localStorage |
| `useDatasheet.ts` | EXTEND | Add `locale` param; update cache key |
| `databaseBrowserFilters.ts` | EXTEND | Add `subFaction: string \| null` field |

### Layer 3: Query Functions (`unitDatabase.ts`)

| Function | Action | Notes |
|----------|--------|-------|
| `getUdbUnitDetail()` | EXTEND | Add `locale` param, COALESCE column selection |
| `getUdbUnitsByFaction()` | EXTEND | Add `subFaction` filter + `locale` |
| `getUdbSubFactionsByFaction()` | NEW | DISTINCT sub_faction for dropdown |
| `getUdbDetachmentsByFaction()` | NEW | Returns `UdbDetachment[]` |
| `getUdbStratagemsByDetachment()` | NEW | Returns `UdbStratagem[]` |
| `getUdbDetachmentAbilities()` | NEW | Returns `UdbDetachmentAbility[]` |

### Layer 4: SQLite Schema (Migrations)

| Migration | Tables Changed | Purpose |
|-----------|---------------|---------|
| 041 | `udb_units` + index | `sub_faction TEXT` column |
| 042 | `udb_units`, `udb_factions`, `udb_unit_abilities`, `udb_unit_weapons`, `udb_unit_keywords` | All `_fr` locale columns |
| 043 | New: `udb_detachments`, `udb_detachment_abilities`, `udb_stratagems` | Stratagems + detachments in canonical DB |
| 044 | `udb_search` (FTS5 virtual table rebuild) | Add `name_fr`, `keywords_fr` columns |

---

## Build Script Changes Summary

| Step | Change | Notes |
|------|--------|-------|
| FACTION_MAP | No change | Still maps catalogue name → faction_id |
| New: SUB_FACTION_MAP | Maps catalogue name → sub-faction label | Parallel to FACTION_MAP |
| Step 3 (units) | `UdbUnitRow` gains `sub_faction: string \| null` | Populated from SUB_FACTION_MAP during step 8 |
| New: Step 7b (French CSVs) | Optional — skips silently if `scripts/data/fr/` absent | Merges FR fields into existing rows |
| New: Step 9 (Stratagems) | Parse `Detachments.csv`, `Detachments_abilities.csv`, `Datasheets_stratagems.csv` | Same `parseWahapediaCsv()` parser |
| New: Step 10 (Coverage report) | Terminal summary: points coverage %, sub-faction %, FR %, stratagem count | Replaces scattered console.log |
| `UnitDatabaseJson` type | Add `sub_faction`, `_fr` fields, `detachments`, `detachmentAbilities`, `stratagems` arrays | Additive |
| Rust import command | INSERT includes new columns; handles new tables | Existing wipe+re-insert pattern |

---

## Recommended Build Order

Dependencies dictate this sequence. Each phase is independently deployable.

**Phase 1 — Schema + Build Script (foundation for all)**
- Migrations 041–043 (sub_faction, _fr columns, stratagems tables)
- Build script: SUB_FACTION_MAP, French CSV loading, stratagem CSV parsing, coverage report
- Regenerate `unit_database.json` with new fields
- Rust import: extend to insert sub_faction, _fr fields, and new tables
- Points matching improvements (prerequisite for accurate data everywhere)

**Phase 2 — Sub-faction Filter UI (depends on Phase 1 schema)**
- `getUdbSubFactionsByFaction()` query
- `databaseBrowserFilters.ts` subFaction field
- `UdbFilterBar` sub-faction dropdown
- `applyUdbFilters.ts` predicate

**Phase 3 — Bilingual UI (depends on Phase 1 schema)**
- `useLocale` hook + localStorage
- Locale toggle in DatabaseBrowserPage toolbar
- `getUdbUnitDetail()` + `getUdbUnitsByFaction()` locale param
- Migration 044 (FTS5 rebuild)

**Phase 4 — PlaybookTab + Game Day Revival (depends on Phase 1 tables)**
- `useUdbRules.ts` hook file
- `PlaybookRules.tsx` rewrite (adapts existing StrategemsTab layout)
- `StrategemsTab.tsx` stub replacement (one import change + type swap)
- `UnitAbilityCard.tsx` weapons section (component reuse)

Phase 4 is independent of Phases 2 and 3, but requires Phase 1 stratagem tables to be populated.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: New `udb_sub_factions` Table

**What it would be:** A dedicated `udb_sub_factions` table with `parent_faction_id FK`, requiring a JOIN on every unit list query.
**Why wrong:** Sub-factions in 40K are keyword constructs, not structural entities. The data already exists in `udb_unit_keywords`. A separate table creates a second source of truth.
**Do this instead:** Denormalize `sub_faction TEXT` on `udb_units`, populated at build time from BSData catalogue names. One source, zero JOINs for filtering.

### Anti-Pattern 2: Separate Locale Tables

**What it would be:** `udb_unit_abilities_fr`, `udb_units_fr` — full parallel tables.
**Why wrong:** Doubles query surface, every function needs two SELECT paths, FTS5 requires two virtual tables, cache keys fork by locale.
**Do this instead:** `_fr` suffix columns. COALESCE at query param level. Single query, single cache key.

### Anti-Pattern 3: Runtime French CSV Fetch

**What it would be:** Fetching Wahapedia FR CSVs at app runtime (like the old rules.db sync pipeline).
**Why wrong:** The single-database architecture was adopted specifically to eliminate the runtime sync pipeline. Runtime network calls add failure modes and offline-breaking dependencies.
**Do this instead:** Dev-side build script loads French CSVs alongside English. Bilingual data ships in `unit_database.json`, imported at first launch.

### Anti-Pattern 4: Locale Stored in SQLite

**What it would be:** A `user_preferences` table with a `locale` column.
**Why wrong:** Schema migration for a two-value preference. Overkill.
**Do this instead:** `localStorage` key `hobbyforge:locale`. Matches the existing sidebar-collapsed, view-mode, backup-status patterns.

### Anti-Pattern 5: Stratagems as Army List Data

**What it would be:** Storing stratagem data on `army_lists` or `army_list_units` to serve Game Day.
**Why wrong:** Stratagems are canonical rule data, not user list data. `army_lists.detachment_id` already exists and is the correct join key.
**Do this instead:** `StrategemsTab` queries `udb_stratagems WHERE detachment_id = army_list.detachment_id`. Direct canonical lookup.

### Anti-Pattern 6: Rewriting StrategemsTab from Scratch

**What it would be:** Deleting the existing `StrategemsTab.tsx` and rebuilding it fresh for the new data source.
**Why wrong:** The component's layout (phase grouping, CP spending, reminders, forgotten-rules panel) is already correct and tested. Only the data source (the stub hook) needs to change.
**Do this instead:** Replace the 3-line stub function at the top of `StrategemsTab.tsx` with an import of `useUdbStratagems`. Swap the `RwStratagem` type for `UdbStratagem`. Adjust `key` prop to `String(s.id)`.

---

## Integration Points

### Existing Code That Gets Changed

| File | Change Type | Reason |
|------|-------------|--------|
| `src/features/units/PlaybookRules.tsx` | Rewrite | Was null stub; now queries udb_stratagems |
| `src/features/game-day/StrategemsTab.tsx` | Stub swap | Replace local stub with `useUdbStratagems` |
| `src/features/game-day/UnitAbilityCard.tsx` | Extension | Add weapons collapsible using `UdbWeaponsTable` |
| `src/features/unit-database/UdbFilterBar.tsx` | Extension | Sub-faction dropdown |
| `src/features/unit-database/applyUdbFilters.ts` | Extension | Sub-faction predicate |
| `src/features/unit-database/databaseBrowserFilters.ts` | Extension | `subFaction` Zustand field |
| `src/features/units/PlaybookTab.tsx` | Minor extension | Pass factionId as prop to PlaybookRules |
| `src/db/queries/unitDatabase.ts` | Extension | New queries + locale params |
| `scripts/build-unit-db.ts` | Extension | SUB_FACTION_MAP, French CSVs, stratagem CSVs, coverage report |
| `src-tauri/src/lib.rs` | Extension | Rust import handles new tables + columns |

### New Files Required

| File | Purpose |
|------|---------|
| `src/hooks/useUdbRules.ts` | Detachments + stratagems hooks (staleTime: Infinity) |
| `src/hooks/useLocale.ts` | Locale preference hook (localStorage) |
| `src-tauri/migrations/041_udb_sub_faction.sql` | `sub_faction` column + index |
| `src-tauri/migrations/042_udb_locale_columns.sql` | All `_fr` columns |
| `src-tauri/migrations/043_udb_stratagems.sql` | Detachments + stratagems tables + indexes |
| `src-tauri/migrations/044_udb_search_bilingual.sql` | FTS5 virtual table rebuild |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Build script → Rust import | `unit_database.json` on disk | Additive: new arrays in JSON, same protocol |
| Query layer → FTS5 | `db.select()` with MATCH syntax | Must drop + recreate virtual table; handled in migration 044 |
| PlaybookRules → faction context | Props from PlaybookTab | `wahapediaFactionId` already computed in PlaybookTab |
| Game Day → udb_stratagems | `detachment_id` from `army_lists` table | Already stored as TEXT on army_lists; same value as `udb_detachments.id` |
| Locale → query layer | `useLocale()` hook → passed as param | No React Context needed; hook reads localStorage directly |

---

## Sources

- `src-tauri/migrations/038_udb_schema.sql` — complete udb_* table definitions
- `src-tauri/migrations/039_collection_udb_link.sql` — FK pattern (ON DELETE SET NULL)
- `src/db/queries/unitDatabase.ts` — complete query layer with all types
- `src/hooks/useDatasheet.ts` — hook pattern (staleTime: Infinity for canonical data)
- `src/features/units/PlaybookTab.tsx` — current PlaybookTab architecture (live sections identified)
- `src/features/units/PlaybookRules.tsx` — null stub confirmation (7 lines)
- `src/features/units/PlaybookDatasheet.tsx` — weapons + abilities rendering (live, reusable)
- `src/features/game-day/StrategemsTab.tsx` — stub hook confirmed at lines 12–14; rest of component is functional
- `src/features/game-day/UnitAbilityCard.tsx` — ability data flow verified live
- `src/features/unit-database/factionAlignmentMap.ts` — 25-faction structure
- `scripts/build-unit-db.ts` — full build pipeline: FACTION_MAP, parseWahapediaCsv, BSData matching
- `.planning/PROJECT.md` — v0.4.2 milestone targets, key decisions, architecture constraints

---
*Architecture research for: HobbyForge v0.4.2 Unit Database 2.0*
*Researched: 2026-06-01*

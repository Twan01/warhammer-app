# Architecture Research

**Domain:** Data quality audit and pipeline improvement for canonical unit database (v0.4.5)
**Researched:** 2026-06-02
**Confidence:** HIGH (all findings from direct source inspection)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    DEV-SIDE BUILD PIPELINE                        │
│            (offline; never imported by app runtime)               │
│                                                                   │
│  scripts/data/         scripts/data/         scripts/data/        │
│  Wahapedia CSVs   +    BSData .cat XML   +   aliases.json         │
│  (6 CSV files)         (bsdata/*.cat)        translations_fr.json │
│         │                     │                      │            │
│         └─────────────────────┴──────────────────────┘           │
│                               ↓                                   │
│              scripts/build-unit-db.ts                             │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  Step 1:  CSV validation (required files exist)          │   │
│   │  Step 2:  Factions.csv → UdbFactionRow[]                 │   │
│   │  Step 3:  Datasheets.csv → UdbUnitRow[]                  │   │
│   │  Step 4:  Datasheets_models.csv → UdbUnitModelRow[]      │   │
│   │  Step 5:  Datasheets_wargear.csv → UdbUnitWeaponRow[]    │   │
│   │  Step 6:  Datasheets_abilities.csv → UdbUnitAbilityRow[] │   │
│   │  Step 7:  Datasheets_keywords.csv → UdbUnitKeywordRow[]  │   │
│   │  Step 7b: loadAliases(aliases.json)                      │   │
│   │  Step 8:  BSData .cat XML                                │   │
│   │    ├── FACTION_MAP[catalogueName] → factionId            │   │
│   │    ├── SUB_FACTION_MAP[catalogueName] → sub_faction      │   │
│   │    ├── CROSS_FACTION_MAP → alt factionId fallback        │   │
│   │    ├── matchUnit(): exact → normalized → alias           │   │
│   │    ├── points tiers + base_points fill                   │   │
│   │    ├── sub_faction set on matched units                  │   │
│   │    └── composition (min/max models)                      │   │
│   │  Step 9:  Validation (empty factions, unit count >= 100) │   │
│   │  Step 10: Coverage report → scripts/data/coverage.json  │   │
│   │  Step 10.5: Apply translations_fr.json overlay           │   │
│   │  Step 11: SHA-256 content hash → build version string    │   │
│   │  Step 12: Write src-tauri/data/unit_database.json        │   │
│   └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                               ↓
                  src-tauri/data/unit_database.json
                  (ships with app as Tauri resource)
┌──────────────────────────────────────────────────────────────────┐
│                  RUNTIME IMPORT (Rust)                            │
│                                                                   │
│  App startup → spawns import_unit_database_inner() async         │
│    1. Read unit_database.json from resource_dir                   │
│    2. Compare version vs udb_meta.version in DB                   │
│    3. On mismatch or first launch:                                │
│       BEGIN TRANSACTION                                           │
│       DELETE (FK-ordered): keywords/points/composition/           │
│         abilities/weapons/models/units/factions/meta              │
│       INSERT: factions → units → models → weapons →              │
│         abilities → keywords → points → composition              │
│       Rebuild FTS5 udb_search index                               │
│       COMMIT + WAL checkpoint                                     │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│                  APP RUNTIME (React)                              │
│                                                                   │
│  UI Components                                                    │
│    UnitDatabasePage ── DatabaseBrowserPage ── UdbFilterBar        │
│    CollectionPage   ── sub-faction filter via Zustand store       │
│    UnitPickerDialog ── sub-faction filter via local state         │
│         ↓                                                         │
│  React Query Hooks (src/hooks/useUnitDatabase.ts)                 │
│    useUdbFactions()                                               │
│    useUdbUnitsByFaction(factionId, locale)                        │
│    useUdbSubFactions(factionId)                                   │
│    useUdbSubFactionUnitIds(factionId, subFaction)  ← BUG HERE    │
│         ↓                                                         │
│  Query Layer (src/db/queries/unitDatabase.ts)                     │
│    getUdbUnitsByFaction()                                         │
│    getDistinctSubFactions()                                       │
│    getUdbUnitIdsBySubFaction()   ← WHERE sub_faction = $2 only   │
│         ↓                           (missing NULL parent units)   │
│  hobbyforge.db — udb_* tables                                    │
│    udb_factions  udb_units (sub_faction TEXT nullable)            │
│    udb_unit_models  udb_unit_weapons  udb_unit_abilities          │
│    udb_unit_keywords  udb_unit_points  udb_unit_composition       │
│    udb_search (FTS5)  udb_meta                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `build-unit-db.ts` | Full build pipeline orchestrator | `scripts/build-unit-db.ts` |
| `parseCsv.ts` | Wahapedia pipe-delimited CSV parsing | `scripts/lib/parseCsv.ts` |
| `parseXml.ts` | BSData .cat XML parsing: `parseCatXml()`, `extractTiers()`, `extractModelCounts()` | `scripts/lib/parseXml.ts` |
| `normalize.ts` | Name normalization for fuzzy matching; alias loading | `scripts/lib/normalize.ts` |
| `factionMap.ts` | `FACTION_MAP`, `SUB_FACTION_MAP`, `CROSS_FACTION_MAP` | `scripts/lib/factionMap.ts` |
| `types.ts` | All build-pipeline TypeScript interfaces | `scripts/lib/types.ts` |
| `aliases.json` | Manual BSData→Wahapedia name overrides (44 entries) | `scripts/data/aliases.json` |
| `translations_fr.json` | French translation overlay (keyed by entity ID) | `scripts/data/translations_fr.json` |
| `coverage-report.json` | Per-faction points coverage output (generated) | `scripts/data/coverage-report.json` |
| `unit_database.json` | Bundled canonical data (ships as Tauri resource) | `src-tauri/data/unit_database.json` |
| `import_unit_database_inner` | Rust: atomic DELETE+INSERT into udb_* tables | `src-tauri/src/lib.rs` |
| `unitDatabase.ts` (queries) | SQL read layer for all udb_* tables | `src/db/queries/unitDatabase.ts` |
| `useUnitDatabase.ts` | React Query hooks wrapping query layer | `src/hooks/useUnitDatabase.ts` |
| `applyUdbFilters.ts` | Pure client-side filter for DB browser | `src/features/unit-database/applyUdbFilters.ts` |
| `databaseBrowserFilters.ts` | Zustand store for DB browser filter state | `src/features/unit-database/databaseBrowserFilters.ts` |
| `collectionFilters.ts` | Zustand store for collection filter state (holds `subFactionFilter`) | `src/features/units/collectionFilters.ts` |

---

## Integration Points for v0.4.5 New Features

### Feature 1: Data Audit

The data audit is a **dev-side, read-only activity**. No app code changes. The integration surface is entirely within the build pipeline artifacts.

| Touch Point | Change Type | Notes |
|-------------|-------------|-------|
| `scripts/data/coverage-report.json` | GENERATED — read to track per-faction progress | Run `pnpm build:udb` to refresh |
| `scripts/data/aliases.json` | ADD entries for unmatched units found in audit | Triggers alias-match pass in step 8 |
| `scripts/data/translations_fr.json` | ADD/FIX translation entries | Keyed by entity ID (see Pattern 2 below) |

Audit workflow: compare `unit_database.json` per faction against Wahapedia live pages. Record errors classified by root cause (parsing bug / missing alias / wrong translation). Feed findings into Feature 2.

### Feature 2: Pipeline Fixes

Pipeline fixes address root causes found during audit. Each error type maps to a specific file:

| Root Cause | Fix Location | Rebuild Impact |
|------------|-------------|----------------|
| CSV field name mismatch (e.g., `BS/WS` vs `BS_WS`) | `build-unit-db.ts` step 5 (weapon parsing) | All weapons in database |
| Name normalization failure | `scripts/lib/normalize.ts` `normalizeName()` | Normalized-match pass globally |
| XML parsing misses entry type | `scripts/lib/parseXml.ts` `parseCatXml()` | Specific unit types |
| Missing unit name alias | `scripts/data/aliases.json` | That specific unit |
| Missing sub-faction mapping | `scripts/lib/factionMap.ts` `SUB_FACTION_MAP` | That catalogue's units |
| Wrong/missing French translation | `scripts/data/translations_fr.json` | Per-entity |

**No new files required.** All fixes modify existing pipeline files.

**Verification signal:** After any fix, run `pnpm build:udb` and check `coverage-report.json`. The `overall_coverage_pct` (currently ~96.9%) must not regress. Per-faction coverage for the audited factions (SM, NEC, DG) should improve.

### Feature 3: Sub-Faction Hierarchy Fix

This is a **narrowly scoped query + filter change** — no schema changes, no new files.

**Current bug:** `getUdbUnitIdsBySubFaction()` returns only units where `sub_faction = $2`. When a user selects "Blood Angels", they get Blood Angels-exclusive units but not generic SM units (`sub_faction IS NULL`). Generic SM units are present in all chapters.

**Root cause in `src/db/queries/unitDatabase.ts`:**
```sql
-- CURRENT (broken):
SELECT id FROM udb_units WHERE faction_id = $1 AND sub_faction = $2

-- FIXED:
SELECT id FROM udb_units WHERE faction_id = $1 AND (sub_faction = $2 OR sub_faction IS NULL)
```

**Fix propagates to three UI surfaces:**

| Surface | File | Change |
|---------|------|--------|
| Query layer | `src/db/queries/unitDatabase.ts` | `getUdbUnitIdsBySubFaction()`: add `OR sub_faction IS NULL` |
| DB browser (client-side filter) | `src/features/unit-database/applyUdbFilters.ts` | Update sub-faction predicate to pass-through NULL units |
| Collection page | `src/features/units/CollectionPage.tsx` | No logic change; driven by ID set from query |
| Army list picker | `src/features/army-lists/UnitPickerDialog.tsx` | No logic change; driven by ID set from query |

**`applyUdbFilters.ts` predicate fix:**
```typescript
// CURRENT (broken — strict equality misses NULL parent units):
if (filters.subFactionFilter !== null && unit.sub_faction !== filters.subFactionFilter) return false;

// FIXED (include units with no sub-faction when filtering to a specific sub-faction):
if (filters.subFactionFilter !== null
    && unit.sub_faction !== filters.subFactionFilter
    && unit.sub_faction !== null) return false;
```

**Faction semantics caveat:** The `OR sub_faction IS NULL` fix is semantically correct for Space Marines (where `sub_faction = NULL` means "generic SM, shared by all chapters"). For the Aeldari faction (`faction_id = "AE"`), Ynnari (`sub_faction = "Ynnari"`) and Drukhari (`sub_faction = "Drukhari"`) should NOT include each other's NULL-sub-faction units. Verify per-faction behavior after fix — all current SM chapter sub-factions share a single `faction_id = "SM"` so the fix is unambiguous there.

---

## Data Flow

### Build Pipeline Data Flow

```
Wahapedia CSV files (6)
    ↓ parseWahapediaCsv()
Row arrays: Record<string, string>[]
    ↓ per-entity parsing (steps 2–7)
Typed arrays: UdbFactionRow[], UdbUnitRow[], UdbUnitWeaponRow[], ...
    ↓ loadAliases(aliases.json) → step 8 matchUnit()
Points + sub_faction + base_points filled in on UdbUnitRow[]
    ↓ loadTranslationsFr() + overlay application (step 10.5)
_fr fields populated across all entity arrays
    ↓ JSON.stringify + SHA-256 content hash
src-tauri/data/unit_database.json  (version = "1.0.0+<hash>")
```

### Runtime Import Data Flow

```
App startup (setup hook)
    ↓ tauri::async_runtime::spawn()
import_unit_database_inner()
    ↓ read unit_database.json from resource_dir/data/
Deserialize → UnitDatabasePayload
    ↓ compare payload.version vs udb_meta.version in DB
On mismatch:
    sqlx BEGIN TRANSACTION
    DELETE FROM [9 tables, FK-ordered child-first]
    INSERT factions → units → models → weapons →
      abilities → keywords → points → composition
    Rebuild FTS5: INSERT INTO udb_search SELECT ...
    COMMIT
    WAL checkpoint
udb_* tables populated in hobbyforge.db
```

### Sub-Faction Filter Data Flow (Current — Has Bug)

```
User selects sub-faction dropdown
    ↓ setSubFactionFilter(subFaction) → Zustand store
    ↓ useUdbSubFactionUnitIds(factionId, subFaction)
    ↓ getUdbUnitIdsBySubFaction()
      SQL: WHERE faction_id = $1 AND sub_faction = $2
      [BUG: excludes sub_faction IS NULL generic units]
    ↓ Set<string> of chapter-specific IDs only
    ↓ client-side filter: idSet.has(u.udb_unit_id)
Result: chapter-exclusive units ONLY (missing generic SM units)
```

### Sub-Faction Filter Data Flow (Fixed)

```
User selects sub-faction dropdown
    ↓ setSubFactionFilter(subFaction) → Zustand store
    ↓ useUdbSubFactionUnitIds(factionId, subFaction)
    ↓ getUdbUnitIdsBySubFaction()
      SQL: WHERE faction_id = $1 AND (sub_faction = $2 OR sub_faction IS NULL)
    ↓ Set<string> of chapter-specific + generic IDs
    ↓ client-side filter: idSet.has(u.udb_unit_id)  [unchanged]
Result: chapter-exclusive units + generic parent faction units
```

---

## Architectural Patterns

### Pattern 1: Audit-First, Fix-Second

**What:** Run the audit as a read-only comparison before touching any pipeline code. Produce a structured discrepancy list. Classify each error (parsing bug / alias / translation). Then fix the pipeline based on findings.

**When to use:** Before writing any pipeline fix. Prevents addressing symptoms (adding aliases) when the root cause is a parser bug that affects multiple units.

**Trade-offs:** Adds one feedback loop iteration. Prevents wasted alias-patching that would be superseded by a parser fix.

### Pattern 2: Translation Overlay Keying

**What:** `translations_fr.json` is keyed by Wahapedia entity IDs for units/factions (`"000000123": "French Name"`), by composite key `"unit_id:ability_name"` for abilities, and by keyword string for keywords. The overlay is applied after all entity arrays are finalized (step 10.5) — after points backfill, sub_faction assignment, and empty faction pruning.

**When to use:** Adding or fixing French translations — always use the correct Wahapedia string ID as key (not unit name). For abilities, composite key is `unit_id:English ability name`.

**Trade-offs:** Key stability depends on Wahapedia IDs and English names remaining stable. A Wahapedia unit rename breaks the ability/weapon translation key.

### Pattern 3: Sub-Faction as Denormalized Nullable Column

**What:** `sub_faction` is a nullable `TEXT` column on `udb_units`. Chapter-specific units carry their sub-faction label (e.g., `"Blood Angels"`). Generic units shared across all chapters have `sub_faction = NULL`. Sub-faction is derived at build time from `SUB_FACTION_MAP[catalogueName]` — set once during BSData matching (step 8) and persists through to the final JSON.

**When to use:** This is the existing design. The sub-faction hierarchy fix builds on this by changing `WHERE sub_faction = $2` to `WHERE sub_faction = $2 OR sub_faction IS NULL`.

**Trade-offs:** Denormalization works well for a static, offline-built dataset. A unit's sub-faction is determined by which BSData catalogue it appears in, which may not match Wahapedia exactly in edge cases (e.g., units that appear in multiple chapters). First-match wins (`if (subFaction && unit.sub_faction === null)`), so the ordering of `.cat` file processing (alphabetical, per D-06) determines which sub-faction wins for shared units.

### Pattern 4: matchUnit() Multi-Pass Fallback

**What:** BSData unit names often differ from Wahapedia names (e.g., "Redemptor Dreadnought [SM]" vs "Redemptor Dreadnought"). `matchUnit()` tries three passes in order: (1) exact lowercase + faction_id match, (2) normalized name + faction_id match via `normalizeName()`, (3) alias table lookup.

**When to use:** When a pipeline fix is needed for unmatched units, determine which pass is failing before choosing the fix:
- Pass 1 failure + Pass 2 success → name has punctuation/case differences; normalization handles it, no alias needed
- Pass 1+2 failure + Pass 3 success → alias already exists but faction_id may be wrong
- All passes fail → add alias or fix normalization rule

---

## Scaling Considerations

Single-user desktop app, local SQLite. No scaling concerns. The only performance constraint is FTS5 index rebuild time during import — currently acceptable at 1,711 units and stays acceptable even if unit count doubles.

---

## Anti-Patterns

### Anti-Pattern 1: Manually Editing unit_database.json

**What people do:** Directly patch `src-tauri/data/unit_database.json` to fix one incorrect value.

**Why it's wrong:** The file is fully regenerated by `pnpm build:udb` on every pipeline run. Manual edits are overwritten. The SHA-256 content hash would also change, triggering a full re-import unnecessarily.

**Do this instead:** Fix the root cause: add/fix an alias in `aliases.json`, fix a translation in `translations_fr.json`, or fix parsing logic in `build-unit-db.ts` / `scripts/lib/*.ts`. Then rebuild.

### Anti-Pattern 2: Adding aliases.json Entries Without Verifying They Fire

**What people do:** Add a name alias and assume it fixed the coverage gap.

**Why it's wrong:** The alias maps BSData name → Wahapedia name. If `parseCatXml()` doesn't emit that BSData name (e.g., the XML entry uses a different `type` attribute that the parser skips), the alias never fires.

**Do this instead:** After adding an alias, run `pnpm build:udb` and check `coverage-report.json` to confirm the unit appears in `units_with_points` for its faction.

### Anti-Pattern 3: Applying OR-NULL Fix Without Checking Faction Semantics

**What people do:** Apply `OR sub_faction IS NULL` to all factions globally.

**Why it's wrong:** For Space Marines (all chapters share `faction_id = "SM"` with a large shared pool), `sub_faction IS NULL` correctly means "generic SM unit, used by all chapters." But for Aeldari (`faction_id = "AE"`), Ynnari and Drukhari are distinct armies — including NULL-sub-faction Craftworlds units when filtering to "Drukhari" would be incorrect.

**Do this instead:** Verify the fix per faction. The fix is safe for SM (all sub-factions share `faction_id = "SM"`). Investigate other factions before applying.

### Anti-Pattern 4: Seeding udb_* Tables via SQL Migration

**What people do:** Add INSERT statements to a migration file for initial or corrected data.

**Why it's wrong:** This caused the documented boot-loop incident (migration 038 predecessor). Data must ship as JSON resource and be imported via the Rust `import_unit_database_inner` path.

**Do this instead:** All data seeding goes through the build pipeline → `unit_database.json` → Rust import on version mismatch. Keep migrations as DDL-only.

---

## Suggested Build Order for v0.4.5

Dependencies drive this sequence:

```
Phase A: Data Audit (read-only — no code changes)
  ├── Build current unit_database.json (pnpm build:udb)
  ├── Compare per-faction against Wahapedia (SM, NEC, DG)
  └── Classify discrepancies: parsing bug | alias | translation

Phase B: Pipeline Fixes (scripts/ only)
  ├── Fix parsing bugs in scripts/lib/*.ts (if any found)
  ├── Add aliases to scripts/data/aliases.json
  ├── Fix/add translations in scripts/data/translations_fr.json
  ├── Fix sub-faction mappings in scripts/lib/factionMap.ts (if needed)
  └── Rebuild + verify coverage-report.json improves

Phase C: Sub-Faction Hierarchy Fix (app code only)
  ├── Fix getUdbUnitIdsBySubFaction() in src/db/queries/unitDatabase.ts
  ├── Fix applyUdbFilters.ts predicate
  └── Verify all three surfaces: DB browser, collection, army list picker

Phase D: Re-import in app
  └── Bump unit_database.json version (automatic via hash change)
      → app auto-imports on next launch
```

Phase A and B must run in order (audit before fix). Phase C is independent — it touches only app code, not pipeline. B and C can be worked in parallel if needed. Phase D happens automatically when the app detects a version mismatch.

---

## New vs Modified Components

### Modified (no new files for this milestone)

| File | Change | Notes |
|------|--------|-------|
| `scripts/build-unit-db.ts` | Fix parsing bugs per audit findings | Step 5 (weapons) most likely target |
| `scripts/lib/parseXml.ts` | Fix extraction issues per audit findings | `parseCatXml()` or `extractTiers()` |
| `scripts/lib/parseCsv.ts` | Fix field extraction if field names wrong | Low probability; CSVs are stable |
| `scripts/lib/normalize.ts` | Improve normalization if fuzzy matches fail | Unlikely; 96.9% current coverage |
| `scripts/lib/factionMap.ts` | Add entries to SUB_FACTION_MAP if needed | Only if new sub-factions found |
| `scripts/data/aliases.json` | Add aliases for unmatched units | Per audit findings |
| `scripts/data/translations_fr.json` | Add/fix French translations | Per audit findings |
| `src/db/queries/unitDatabase.ts` | Fix `getUdbUnitIdsBySubFaction()` | One SQL clause change |
| `src/features/unit-database/applyUdbFilters.ts` | Fix sub-faction predicate | One conditional change |

### Not Modified

| File | Why Unchanged |
|------|---------------|
| `src-tauri/src/lib.rs` | No schema changes; import path unchanged |
| `src-tauri/migrations/*` | No schema changes needed for this milestone |
| `src/hooks/useUnitDatabase.ts` | Query signature unchanged; hook passes through |
| `src/features/units/CollectionPage.tsx` | Filter logic driven by ID set; no change needed |
| `src/features/army-lists/UnitPickerDialog.tsx` | Filter logic driven by ID set; no change needed |

---

## Sources

- `scripts/build-unit-db.ts` — direct inspection, full pipeline orchestrator
- `scripts/lib/factionMap.ts` — direct inspection, FACTION_MAP / SUB_FACTION_MAP / CROSS_FACTION_MAP (17 sub-faction entries)
- `scripts/lib/types.ts` — direct inspection, all pipeline types
- `scripts/lib/parseXml.ts` — direct inspection, BSData XML parsing: extractTiers(), parseCatXml()
- `src-tauri/migrations/038_udb_schema.sql` — udb_* table definitions (9 tables + FTS5)
- `src-tauri/migrations/041_udb_sub_faction_fr.sql` — sub_faction + _fr column additions
- `src-tauri/src/lib.rs` — direct inspection, import_unit_database_inner() Rust command
- `src/db/queries/unitDatabase.ts` — direct inspection, query layer including getUdbUnitIdsBySubFaction()
- `src/features/unit-database/applyUdbFilters.ts` — direct inspection, client-side sub-faction filter
- `src/features/units/CollectionPage.tsx` — direct inspection, sub-faction filter usage pattern
- `src/features/army-lists/UnitPickerDialog.tsx` — direct inspection, sub-faction filter usage pattern
- `.planning/PROJECT.md` — v0.4.5 milestone targets and constraints

---
*Architecture research for: HobbyForge v0.4.5 Data Quality Audit & Pipeline Improvement*
*Researched: 2026-06-02*

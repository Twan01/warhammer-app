# Phase 108: Build Script Hardening & Schema Foundation - Research

**Researched:** 2026-06-01
**Domain:** Build pipeline (Node.js scripts), SQLite schema migration, Rust serde import, React Data Health UI
**Confidence:** HIGH

## Summary

Phase 108 is a backend/pipeline-focused phase with four distinct workstreams: (1) build script determinism and shared library extraction, (2) multi-pass points matching to reach 85%+ coverage, (3) schema migration adding `sub_faction` and `_fr` locale columns, and (4) Rust import extension plus a Data Health UI coverage section.

The codebase is well-understood. The two build scripts (`build-unit-db.ts` at 767 lines and `update-unit-database.ts` at 937 lines) share ~500 lines of duplicated parsing code -- extraction to `scripts/lib/` is straightforward. The current points matching uses exact lowercase name + faction_id lookup, which explains the 37% coverage. BSData catalogue names often differ from Wahapedia datasheet names (e.g., "Intercessor Squad" vs "Intercessors", "Strike Squad" vs "Grey Knight Strike Squad"). Adding normalized matching and an alias table will close most of the gap.

**Primary recommendation:** Structure work as three sequential waves -- (1) shared lib extraction + determinism, (2) multi-pass matching + coverage report + alias table, (3) schema migration + Rust import + Data Health UI. This ordering ensures the shared lib is stable before adding matching logic, and the schema is ready before the import changes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Multi-pass matching: exact name match -> normalized match (lowercase, strip special chars, trim whitespace) -> manual alias table fallback (`scripts/data/aliases.json`). Cascading approach.
- **D-02:** Alias table is flat JSON object mapping Wahapedia unit names to BSData unit names. Manually curated.
- **D-03:** Target 85%+ coverage across all factions aggregate, not per-faction.
- **D-04:** Build script outputs per-faction coverage to console AND writes `scripts/data/coverage-report.json` summary artifact.
- **D-05:** Data Health page gets "Points Coverage" section with per-faction grid, color-coded badges: green (85%+), amber (50-84%), red (<50%).
- **D-06:** Apply `files.sort()` to both build and update scripts before processing file lists.
- **D-07:** Extract shared parsing logic to `scripts/lib/` as separate modules. Both scripts import from there.
- **D-08:** Add `sub_faction TEXT` column to `udb_units` via migration. Denormalized, NOT a separate table.
- **D-09:** Build script maps BSData catalogue names to sub-factions via `SUB_FACTION_MAP` constant. SM chapters, CSM warbands, Aeldari sub-factions mapped initially.
- **D-10:** Migration adds `_fr` columns: `name_fr` on udb_units, udb_factions, udb_unit_abilities, udb_unit_weapons; `keyword_fr` on udb_unit_keywords. All nullable TEXT, default NULL.
- **D-11:** Rust import extended with `#[serde(default)]` on all `_fr` struct fields. `_fr` fields travel in `unit_database.json`.
- **D-12:** Build script includes `_fr` fields in output JSON (initially all null). Phase 111 populates them.

### Claude's Discretion
- Build script internal architecture (function decomposition, error handling patterns)
- Coverage report JSON schema (as long as it captures per-faction unit count and match count)
- Migration file numbering (next available after current 040)
- Exact name normalization regex patterns
- Console output formatting during build

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DQ-01 | Build script produces per-faction coverage report on every run | Coverage report logic in build pipeline; JSON artifact at `scripts/data/coverage-report.json` |
| DQ-02 | Build script sorts file reads for deterministic output | `files.sort()` applied to `readdirSync` results in both scripts |
| DQ-03 | Name normalization before BSData matching | Shared normalization function in `scripts/lib/normalize.ts` |
| DQ-04 | Manual alias table for unmatched units | `scripts/data/aliases.json` loaded as fallback pass |
| DQ-05 | 85%+ points coverage across all factions | Multi-pass matching (exact -> normalized -> alias) closes gap from 37% |
| DQ-06 | Data Health page shows per-faction coverage badges | New `PointsCoverageCard` component with green/amber/red badge grid |
| DQ-07 | Shared parsing logic in `scripts/lib/` | Extract CSV parser, XML parser, FACTION_MAP, types to shared modules |
| SF-01 | `sub_faction TEXT` column on `udb_units` | Migration 041 adds column; build script populates from SUB_FACTION_MAP |
| SF-02 | SUB_FACTION_MAP for SM/CSM/Aeldari | Constant mapping BSData catalogue names to sub-faction labels |
| FR-01 | `_fr` locale columns on 5 udb_* tables | Migration 041 adds nullable TEXT columns with DEFAULT NULL |
| FR-06 | Rust import with `#[serde(default)]` for `_fr` fields | Rust INSERT queries extended; serde defaults prevent null-wipe |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Build script determinism (DQ-02) | Dev tooling (Node.js scripts) | -- | Offline build pipeline, not runtime |
| Shared parsing library (DQ-07) | Dev tooling (scripts/lib/) | -- | Compile-time code extraction |
| Multi-pass points matching (DQ-03..05) | Dev tooling (build script) | -- | Runs at build time, outputs JSON |
| Coverage report (DQ-01, DQ-06) | Dev tooling + Frontend UI | -- | Build writes JSON; UI reads computed query |
| Schema migration (SF-01, FR-01) | Database / Storage | -- | SQLite DDL migration |
| Rust import extension (FR-06) | API / Backend (Tauri) | -- | Rust serde + SQL INSERT changes |
| Data Health badges (DQ-06) | Frontend UI | Database | React component reads coverage via SQL query |

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xmldom/xmldom | (installed) | DOMParser polyfill for Node.js BSData XML parsing | Already used in build-unit-db.ts [VERIFIED: codebase] |
| sqlx | (in Cargo.toml) | Rust async SQLite driver for import | Already used throughout lib.rs [VERIFIED: codebase] |
| serde / serde_json | (in Cargo.toml) | Rust JSON deserialization | Already used for UnitDatabasePayload [VERIFIED: codebase] |

### No New Dependencies
This phase introduces zero new packages. All work uses existing Node.js built-in APIs (fs, path, crypto) and existing Rust crates. The `scripts/lib/` extraction is internal refactoring only.

## Architecture Patterns

### System Architecture Diagram

```
scripts/data/                    scripts/lib/
  Wahapedia CSVs ──────┐          parseCsv.ts
  BSData .cat XMLs ────┤          parseXml.ts
  aliases.json ────────┤          normalize.ts
                       │          types.ts
                       v          factionMap.ts
              build-unit-db.ts ──────────────────> unit_database.json
                   │                                    │
                   │                                    │ (ships as Tauri resource)
                   v                                    v
        coverage-report.json              Rust import_unit_database_inner()
                                                │
                                                v
                                          hobbyforge.db
                                           udb_* tables
                                                │
                                                v
                                        DataHealthPage.tsx
                                         PointsCoverageCard
```

### Recommended Project Structure
```
scripts/
  lib/
    parseCsv.ts         # parseWahapediaCsv() + readCsv()
    parseXml.ts         # parseCatXml(), extractTiers(), extractModelCounts()
    normalize.ts        # normalizeName(), loadAliases()
    factionMap.ts       # FACTION_MAP, SUB_FACTION_MAP constants
    types.ts            # All Udb*Row interfaces + UnitDatabaseJson
  data/
    aliases.json        # Manual Wahapedia->BSData name mappings (NEW)
    coverage-report.json  # Build output artifact (NEW, gitignored)
  build-unit-db.ts      # Imports from lib/, adds coverage + sub_faction + _fr
  update-unit-database.ts # Imports from lib/, adds determinism
```

### Pattern 1: Multi-Pass Name Matching
**What:** Three-pass unit matching for BSData-to-Wahapedia name resolution
**When to use:** Every BSData unit that needs points/composition data matched to a Wahapedia datasheet

```typescript
// scripts/lib/normalize.ts
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`’]/g, "'")  // smart quotes
    .replace(/[^a-z0-9' ]/g, "")   // strip special chars
    .replace(/\s+/g, " ")          // collapse whitespace
    .trim();
}

// In build pipeline:
function matchUnit(bsdataName: string, factionId: string, aliases: Record<string, string>): UdbUnitRow | undefined {
  // Pass 1: exact lowercase match (current behavior)
  const exactKey = bsdataName.toLowerCase() + ":" + factionId;
  let unit = unitByNameFaction.get(exactKey);
  if (unit) return unit;

  // Pass 2: normalized match
  const normalizedBsdata = normalizeName(bsdataName);
  for (const [key, u] of unitByNameFaction) {
    if (key.endsWith(":" + factionId) && normalizeName(u.name) === normalizedBsdata) {
      return u;
    }
  }

  // Pass 3: alias table fallback
  const aliasedName = aliases[bsdataName];
  if (aliasedName) {
    const aliasKey = aliasedName.toLowerCase() + ":" + factionId;
    return unitByNameFaction.get(aliasKey);
  }

  return undefined;
}
```

### Pattern 2: Sub-Faction Mapping from BSData Catalogues
**What:** Map BSData catalogue filenames to sub-faction labels
**When to use:** During build, when a unit comes from a chapter-specific catalogue

```typescript
// scripts/lib/factionMap.ts
export const SUB_FACTION_MAP: Record<string, string> = {
  // Space Marines chapters
  "Imperium - Black Templars": "Black Templars",
  "Imperium - Blood Angels": "Blood Angels",
  "Imperium - Dark Angels": "Dark Angels",
  "Imperium - Deathwatch": "Deathwatch",
  "Imperium - Imperial Fists": "Imperial Fists",
  "Imperium - Iron Hands": "Iron Hands",
  "Imperium - Raven Guard": "Raven Guard",
  "Imperium - Salamanders": "Salamanders",
  "Imperium - Space Wolves": "Space Wolves",
  "Imperium - Ultramarines": "Ultramarines",
  "Imperium - White Scars": "White Scars",
  // CSM warbands
  "Chaos - Death Guard": "Death Guard",
  "Chaos - Thousand Sons": "Thousand Sons",
  "Chaos - World Eaters": "World Eaters",
  "Chaos - Emperor's Children": "Emperor's Children",
  // Aeldari sub-factions
  "Aeldari - Drukhari": "Drukhari",
  "Aeldari - Ynnari": "Ynnari",
};
```

**Important:** Units from the base catalogue (e.g., "Imperium - Space Marines") get `sub_faction = NULL` -- they are shared across all chapters. Only chapter-specific catalogues set a sub-faction.

### Pattern 3: Coverage Report Generation
**What:** Per-faction coverage statistics written to JSON + console
**When to use:** At end of build pipeline, after all matching passes complete

```typescript
interface FactionCoverage {
  faction_id: string;
  faction_name: string;
  total_units: number;
  units_with_points: number;
  coverage_pct: number;
}

interface CoverageReport {
  built_at: string;
  overall_coverage_pct: number;
  total_units: number;
  units_with_points: number;
  factions: FactionCoverage[];
  unmatched_units: Array<{ name: string; faction_id: string }>;
}
```

### Anti-Patterns to Avoid
- **Mutating shared state during matching:** The current code mutates `unit.base_points` during BSData iteration. With multi-pass matching, ensure the same unit isn't matched twice from different passes with conflicting data.
- **Non-deterministic JSON output:** `built_at` timestamp changes every run. For byte-for-byte determinism, either omit it from the comparison hash or use a fixed timestamp in CI mode.
- **Large alias table:** The alias table should stay small (<50 entries). If it grows beyond that, the normalization regex needs improvement, not more aliases.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom split logic | Existing `parseWahapediaCsv()` (extract to shared lib) | Already handles pipe-delimited format correctly |
| XML parsing | Manual string parsing | `@xmldom/xmldom` DOMParser (already in use) | Handles edge cases in BSData XML |
| Content hashing | Custom hash | `node:crypto` SHA-256 (already in use) | Deterministic version derivation |

## Common Pitfalls

### Pitfall 1: FTS5 ALTER TABLE Impossible
**What goes wrong:** Attempting `ALTER TABLE udb_search ADD COLUMN` fails -- FTS5 virtual tables cannot be altered.
**Why it happens:** SQLite FTS5 has no ALTER TABLE support.
**How to avoid:** Do NOT add `_fr` columns to `udb_search` in this phase. Phase 109 (SF-06) will handle FTS5 rebuild with sub_faction. Phase 111 (FR-05) will add French names. For now, `sub_faction` can optionally be included in the keyword field of the existing FTS5 rebuild query in Rust.
**Warning signs:** Migration SQL referencing `ALTER TABLE udb_search`.

### Pitfall 2: Non-Deterministic built_at Timestamp
**What goes wrong:** `built_at: new Date().toISOString()` changes every run, breaking byte-for-byte determinism.
**Why it happens:** Timestamp is runtime-dependent.
**How to avoid:** The content hash for version comparison already ignores `built_at`. The determinism requirement (DQ-02) is about sorting file reads so the same input data produces the same structural output. The `built_at` field is expected to differ -- the version hash comparison in `import_unit_database_inner()` uses only the content hash portion. Document this exception clearly.
**Warning signs:** Test assertions comparing full JSON output including timestamps.

### Pitfall 3: Sub-faction Units Appearing Twice
**What goes wrong:** A unit like "Intercessor Squad" exists in both "Imperium - Space Marines" (base) and chapter catalogues. If not deduplicated, it appears multiple times.
**Why it happens:** BSData has shared units in the base SM catalogue plus chapter-specific overrides.
**How to avoid:** The current `seen` set in `parseCatXml()` deduplicates by `name:factionId`. Since all SM chapters map to faction_id "SM", the first occurrence wins. Process the base catalogue first (sort order ensures this since "Space Marines" sorts after chapter names alphabetically -- but with `files.sort()` this may change). Ensure the base catalogue is processed first, or use a priority system where chapter-specific data overrides base data.
**Warning signs:** Duplicate unit entries in output JSON.

### Pitfall 4: Migration Must Be Additive Only
**What goes wrong:** Editing existing migration 038 to add columns breaks all existing databases.
**Why it happens:** Tauri plugin-sql runs migrations in filename order and skips already-applied ones.
**How to avoid:** Create a NEW migration file (041) with only `ALTER TABLE` statements. Never modify existing migration files.
**Warning signs:** Changes to files in `src-tauri/migrations/` other than adding new files.

### Pitfall 5: Rust INSERT Must Handle NULL _fr Fields
**What goes wrong:** Rust `INSERT INTO udb_units (..., name_fr, sub_faction)` fails if the JSON fields are missing.
**Why it happens:** `str_val()` returns `Option<String>` -- if the JSON key is absent, it returns `None`, which SQLite binds as NULL. This is actually correct behavior.
**How to avoid:** Use `str_val(row, "name_fr")` which naturally returns `None` for missing keys. The `#[serde(default)]` on the payload struct ensures the `units` Vec deserializes correctly even if individual row objects lack `_fr` keys. Since `JsRow = HashMap<String, serde_json::Value>`, missing keys simply won't be in the map.
**Warning signs:** Panic on re-import with old JSON format.

### Pitfall 6: EXPECTED_SCHEMA_VERSION Must Match
**What goes wrong:** App shows "Schema version mismatch" error after adding migration 041.
**Why it happens:** `DbHealthGate.tsx` checks `PRAGMA user_version` against `EXPECTED_SCHEMA_VERSION = 40`.
**How to avoid:** Bump `EXPECTED_SCHEMA_VERSION` to 41 in `src/components/common/DbHealthGate.tsx` after adding the migration.
**Warning signs:** App shows migration warning banner after update.

## Code Examples

### Migration 041: Sub-faction + French Locale Columns

```sql
-- Migration 041: Add sub_faction and _fr locale columns to udb_* tables
-- Phase 108: Schema foundation for sub-faction filtering and French translation

-- Sub-faction on units (denormalized, per D-08)
ALTER TABLE udb_units ADD COLUMN sub_faction TEXT;

-- French locale columns (all nullable, default NULL per D-10)
ALTER TABLE udb_factions ADD COLUMN name_fr TEXT;

ALTER TABLE udb_units ADD COLUMN name_fr TEXT;

ALTER TABLE udb_unit_abilities ADD COLUMN name_fr TEXT;
ALTER TABLE udb_unit_abilities ADD COLUMN description_fr TEXT;

ALTER TABLE udb_unit_weapons ADD COLUMN name_fr TEXT;

ALTER TABLE udb_unit_keywords ADD COLUMN keyword_fr TEXT;
```

### Rust Import: Extended INSERT for udb_units

```rust
// Extended INSERT with sub_faction and name_fr
sqlx::query(
    "INSERT INTO udb_units (id, faction_id, name, role, base_points, damaged_w, damaged_desc, sub_faction, name_fr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
)
.bind(&id)
.bind(str_val(row, "faction_id").unwrap_or_default())
.bind(str_val(row, "name").unwrap_or_default())
.bind(str_val(row, "role"))
.bind(i64_val(row, "base_points"))
.bind(str_val(row, "damaged_w"))
.bind(str_val(row, "damaged_desc"))
.bind(str_val(row, "sub_faction"))     // NULL if missing from JSON
.bind(str_val(row, "name_fr"))         // NULL until Phase 111
```

### Data Health: Coverage Query

```sql
-- Per-faction coverage query (run at app level from udb_* tables)
SELECT
  f.id AS faction_id,
  f.name AS faction_name,
  COUNT(u.id) AS total_units,
  COUNT(CASE WHEN u.base_points IS NOT NULL OR p.unit_id IS NOT NULL THEN 1 END) AS units_with_points,
  ROUND(
    100.0 * COUNT(CASE WHEN u.base_points IS NOT NULL OR p.unit_id IS NOT NULL THEN 1 END) / COUNT(u.id),
    1
  ) AS coverage_pct
FROM udb_factions f
JOIN udb_units u ON u.faction_id = f.id
LEFT JOIN (SELECT DISTINCT unit_id FROM udb_unit_points) p ON p.unit_id = u.id
GROUP BY f.id
ORDER BY f.name;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Exact lowercase name matching only | Multi-pass: exact -> normalized -> alias | Phase 108 | 37% -> 85%+ coverage |
| Duplicated parsing in 2 scripts | Shared `scripts/lib/` modules | Phase 108 | ~500 lines deduplication |
| No sub-faction data | Denormalized `sub_faction` on `udb_units` | Phase 108 | Enables Phase 109 filters |
| English-only schema | `_fr` columns on 5 tables (NULL initially) | Phase 108 | Enables Phase 111 bilingual |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DQ-01 | Coverage report generation | unit | `pnpm test -- tests/build-pipeline/coverageReport.test.ts -x` | Wave 0 |
| DQ-02 | Deterministic file sort | unit | `pnpm test -- tests/build-pipeline/determinism.test.ts -x` | Wave 0 |
| DQ-03 | Name normalization | unit | `pnpm test -- tests/build-pipeline/normalize.test.ts -x` | Wave 0 |
| DQ-04 | Alias table loading | unit | `pnpm test -- tests/build-pipeline/aliases.test.ts -x` | Wave 0 |
| DQ-05 | 85%+ coverage achieved | manual-only | Run build script, inspect coverage-report.json | -- |
| DQ-06 | Data Health coverage badges | unit | `pnpm test -- tests/data-health/pointsCoverage.test.tsx -x` | Wave 0 |
| DQ-07 | Shared lib extraction | unit | `pnpm test -- tests/build-pipeline/sharedLib.test.ts -x` | Wave 0 |
| SF-01 | sub_faction column exists | manual-only | Check migration SQL | -- |
| SF-02 | SUB_FACTION_MAP populates correctly | unit | `pnpm test -- tests/build-pipeline/subFaction.test.ts -x` | Wave 0 |
| FR-01 | _fr columns exist | manual-only | Check migration SQL | -- |
| FR-06 | Rust handles missing _fr fields | manual-only | Run app with old JSON format | -- |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/build-pipeline/normalize.test.ts` -- covers DQ-03 (name normalization edge cases)
- [ ] `tests/build-pipeline/coverageReport.test.ts` -- covers DQ-01 (coverage calculation logic)
- [ ] `tests/data-health/pointsCoverage.test.tsx` -- covers DQ-06 (badge rendering)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next migration number is 041 (after current 040_drop_synced_points.sql) | Architecture Patterns | Migration ordering conflict; trivial to fix |
| A2 | SM chapter catalogues process after base "Space Marines" in sorted order | Pitfall 3 | Sub-faction assignment priority may need explicit ordering |
| A3 | ~50 alias entries will be sufficient for 85%+ coverage after normalization | Anti-Patterns | May need more aliases; iterative process |

## Open Questions

1. **Exact normalization patterns for 85%+ coverage**
   - What we know: BSData uses names like "Intercessor Squad", Wahapedia may use "Intercessors". Smart quotes and special characters cause mismatches.
   - What's unclear: The exact set of normalization rules needed. Will stripping "Squad"/"Team" suffixes help? Need to run the build and examine unmatched units.
   - Recommendation: Implement basic normalization first, run the build, collect unmatched units, then populate aliases.json iteratively.

2. **Coverage data storage for Data Health UI**
   - What we know: D-05 says "coverage data read from udb_meta or computed query at import time."
   - What's unclear: Whether to store coverage stats in udb_meta or compute them live via SQL query.
   - Recommendation: Compute live via SQL query (shown in Code Examples). The query is fast (<10ms on ~600 units) and avoids storing stale statistics. No schema change needed.

## Sources

### Primary (HIGH confidence)
- `scripts/build-unit-db.ts` -- full 767-line build pipeline examined
- `scripts/update-unit-database.ts` -- full 937-line update pipeline examined
- `src-tauri/src/lib.rs` lines 411-752 -- Rust import code, JsRow type, serde structs
- `src-tauri/migrations/038_udb_schema.sql` -- current udb_* table definitions
- `src/components/common/DbHealthGate.tsx` -- EXPECTED_SCHEMA_VERSION = 40
- `src/features/data-health/DataHealthPage.tsx` -- current page layout
- `src/features/data-health/DiagnosticsCard.tsx` -- badge pattern for reuse
- BSData catalogue file listing -- 45 .cat files confirmed in scripts/data/bsdata/

### Secondary (MEDIUM confidence)
- CONTEXT.md D-01 through D-12 -- user decisions governing implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new packages, all existing code examined
- Architecture: HIGH - straightforward extraction and extension of existing patterns
- Pitfalls: HIGH - all pitfalls identified from direct code inspection

**Research date:** 2026-06-01
**Valid until:** 2026-07-01 (stable internal codebase, no external API dependencies)

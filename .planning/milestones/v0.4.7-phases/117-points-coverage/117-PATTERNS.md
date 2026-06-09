# Phase 117: Points Coverage - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 8 (modify/remove)
**Analogs found:** 5 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/build-unit-db.ts` | build-script | batch-transform | Self (Step 3-7 CSV patterns) | exact |
| `scripts/update-unit-database.ts` | build-script | batch-transform | `scripts/build-unit-db.ts` | exact |
| `scripts/audit-faction.ts` | build-script | batch-transform | Self (import cleanup only) | exact |
| `scripts/lib/bsdata.ts` | utility | file-I/O | `scripts/lib/parseCsv.ts` | role-match |
| `scripts/lib/parseXml.ts` | utility | transform | -- (DELETE entirely) | n/a |
| `scripts/lib/normalize.ts` | utility | transform | -- (check usage, may delete `loadAliases`) | n/a |
| `scripts/lib/types.ts` | type-defs | n/a | Self (remove BSData types) | exact |
| `package.json` | config | n/a | Self (remove dependency) | exact |

## Pattern Assignments

### `scripts/build-unit-db.ts` (build-script, batch-transform)

**Analog:** Self -- existing CSV parsing steps (Steps 2-7) define the pattern for the new cost CSV step.

**Import block pattern** (lines 19-47) -- BEFORE (to be replaced):
```typescript
// REMOVE these lines:
import { DOMParser } from "@xmldom/xmldom";
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;
import { parseCatXml } from "./lib/parseXml.ts";
import { loadAliases } from "./lib/normalize.ts";
import { readCsvFile, readBsdataCatFiles, parseBsdataModelCounts, matchUnit } from "./lib/bsdata.ts";

// KEEP these:
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SUB_FACTION_MAP, CROSS_FACTION_MAP } from "./lib/factionMap.ts";
import { mapWeaponRow } from "./lib/weaponMapping.ts";

// ADD (readCsvFile relocates from bsdata.ts):
import { readCsvFile } from "./lib/parseCsv.ts";
```

**CSV read step pattern** (lines 175-180) -- how existing steps parse CSV files:
```typescript
// Step 2: Parse Wahapedia Factions.csv -> udb_factions rows
console.log("Step 2: Parsing Factions.csv...");
const factionsRaw = readCsvFile(DATA_DIR, "Factions.csv");
const factions: UdbFactionRow[] = factionsRaw
  .filter((row) => row["id"] && row["name"])
  // ... mapping logic
```

**Points tier creation pattern** (lines 417-434) -- current BSData tier logic to be replaced:
```typescript
// Current pattern: multi-tier vs single-cost branching
if (bsdataUnit.tiers.length > 0) {
  // Multi-tier unit: add one points row per model-count tier
  for (const tier of bsdataUnit.tiers) {
    const pointsKey = unit.id + ":" + tier.modelCount;
    if (!seenPoints.has(pointsKey)) {
      seenPoints.add(pointsKey);
      points.push({ unit_id: unit.id, model_count: tier.modelCount, points: tier.points });
      matchedUnits.add(unit.id);
    }
  }
} else {
  // Single-cost unit: set base_points on the unit row directly
  const basePoints = parseInt(bsdataUnit.points, 10);
  if (basePoints > 0 && unit.base_points === null) {
    unit.base_points = basePoints;
    matchedUnits.add(unit.id);
  }
}
```

**Composition creation pattern** (lines 440-473) -- current BSData composition to be replaced:
```typescript
composition.push({
  unit_id: unit.id,
  min_models: mc.min_models,
  max_models: mc.max_models,
  notes: "",
});
```

**Constants to modify** (lines 62, 68, 71):
```typescript
const MIN_COVERAGE_PCT = 58;       // -> raise to 90
const BSDATA_DIR = join(DATA_DIR, "bsdata");   // -> remove
const ALIASES_PATH = join(DATA_DIR, "aliases.json");  // -> remove
```

**Coverage report pattern** (lines 539-657) -- simplify, remove BSData match method columns:
```typescript
// Current columns: Faction, Units, Matched, Exact, Norm, Alias, Coverage
// Replace with: Faction, Units, WithPoints, Coverage
// Remove: factionMatchStats map, matched_exact/normalized/alias fields
console.log(
  "  " +
  "Faction".padEnd(40) +
  "Units".padStart(7) +
  "Matched".padStart(9) +
  "Exact".padStart(7) +     // REMOVE
  "Norm".padStart(6) +      // REMOVE
  "Alias".padStart(7) +     // REMOVE
  "Coverage".padStart(10)
);
```

**validateAliases function** (lines 120-145) -- REMOVE entirely (dead code after BSData removal).

---

### `scripts/update-unit-database.ts` (build-script, batch-transform)

**Analog:** `scripts/build-unit-db.ts` -- mirrors the same pipeline.

**Import block** (lines 18-43) -- same cleanup as build-unit-db.ts:
```typescript
// REMOVE:
import { DOMParser } from "@xmldom/xmldom";
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;
import { parseCatXml } from "./lib/parseXml.ts";
import { loadAliases } from "./lib/normalize.ts";
import { readCsvFile, readBsdataCatFiles, parseBsdataModelCounts, matchUnit } from "./lib/bsdata.ts";

// ADD:
import { readCsvFile } from "./lib/parseCsv.ts";
```

**BSData block** (lines 249-325) -- replace with cost CSV join, same pattern as build-unit-db.ts:
```typescript
// Current: loadAliases -> readBsdataCatFiles -> parseCatXml -> matchUnit loop
// Replace with: readCsvFile("Datasheets_models_cost.csv") -> group by datasheet_id -> join
```

**Constants to remove** (line 82):
```typescript
const BSDATA_DIR = join(DATA_DIR, "bsdata");  // -> remove
```

---

### `scripts/audit-faction.ts` (build-script, batch-transform)

**Analog:** Self -- only import cleanup needed.

**Import block** (lines 15-24) -- remove DOMParser, update readCsvFile import:
```typescript
// REMOVE:
import { DOMParser } from "@xmldom/xmldom";
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;
import { readCsvFile } from "./lib/bsdata.ts";

// ADD:
import { readCsvFile } from "./lib/parseCsv.ts";
```

---

### `scripts/lib/bsdata.ts` -> relocate `readCsvFile` to `scripts/lib/parseCsv.ts`

**Analog:** `scripts/lib/parseCsv.ts` (target file for relocation)

**Function to relocate** (bsdata.ts lines 42-52):
```typescript
export function readCsvFile(dataDir: string, filename: string): Record<string, string>[] {
  const filepath = join(dataDir, filename);
  const raw = readFileSync(filepath, "utf-8");
  return parseWahapediaCsv(raw);
}
```

**Target file** (`scripts/lib/parseCsv.ts`) is currently pure (string -> array, no fs imports). Adding `readCsvFile` requires:
```typescript
// ADD to parseCsv.ts:
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Then add readCsvFile function after parseWahapediaCsv
```

**After relocation:** `scripts/lib/bsdata.ts` can be deleted entirely (all remaining functions are BSData-specific: `readBsdataCatFiles`, `parseBsdataModelCounts`, `matchUnit`, `MatchMethod`, `MatchResult`).

---

### `scripts/lib/types.ts` (type-defs)

**Analog:** Self -- remove BSData-specific types, simplify FactionCoverage.

**Types to REMOVE** (lines 10-28):
```typescript
// BSData extraction types -- DELETE entirely
export interface PointsTier { modelCount: number; points: number; }
export interface BsdataUnitPoints { datasheet_name: string; faction_id: string; points: string; tiers: PointsTier[]; }
export interface BsdataModelCount { unit_name: string; faction_id: string | null; min_models: number; max_models: number; }
```

**FactionCoverage to simplify** (lines 116-130):
```typescript
// REMOVE these optional fields:
matched_exact?: number;
matched_normalized?: number;
matched_alias?: number;
unmatched_names?: string[];

// KEEP: faction_id, faction_name, total_units, units_with_points, coverage_pct
// Optionally add: unmatched_names (still useful for debugging, not BSData-specific)
```

---

### `scripts/lib/normalize.ts` (utility)

**Analog:** None needed -- check if `normalizeName` is used outside BSData matching.

**`loadAliases`** (lines 33-47) -- REMOVE (only used for BSData alias table).
**`normalizeName`** (lines 19-26) -- CHECK usage. If only called from `bsdata.ts` `matchUnit`, remove entire file. If used elsewhere, keep.

---

## Shared Patterns

### CSV Read + Group-by-ID Pattern
**Source:** `scripts/build-unit-db.ts` Steps 3-7
**Apply to:** New cost CSV step in both build scripts

Every CSV step follows: `readCsvFile` -> filter by `validUnitIds.has(id)` -> map to typed row -> push to array.

```typescript
// Standard CSV step pattern (from build-unit-db.ts Step 5, models parsing):
const modelsRaw = readCsvFile(DATA_DIR, "Datasheets_models.csv");
for (const row of modelsRaw) {
  const unitId = row["datasheet_id"]?.trim();
  if (!unitId || !validUnitIds.has(unitId)) continue;
  // ... parse fields, push to typed array
}
```

### Sub-faction Assignment via Keywords
**Source:** `scripts/build-unit-db.ts` Step 7 (keywords parsing, lines 320-341)
**Apply to:** New sub-faction step (Step 8b) in both build scripts

Keywords are already parsed in Step 7. The new sub-faction step iterates `keywords[]` array (already populated) and checks if `keyword` matches a value in `SUB_FACTION_MAP`:

```typescript
// Step 7 already produces:
const keywords: UdbUnitKeywordRow[] = [];
for (const row of keywordsRaw) {
  const unitId = row["datasheet_id"]?.trim();
  if (!unitId || !validUnitIds.has(unitId)) continue;
  const keyword = row["keyword"]?.trim();
  if (!keyword) continue;
  // ...
  keywords.push({ unit_id: unitId, keyword, is_faction: isFaction, keyword_fr: null });
}
```

### Console Logging Pattern
**Source:** `scripts/build-unit-db.ts` all steps
**Apply to:** New cost CSV step output

```typescript
console.log("Step 8: Parsing Datasheets_models_cost.csv...");
// ... processing ...
console.log("  Matched " + matchedUnits.size + " units via cost CSV (" + points.length + " tier entries)");
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/lib/parseXml.ts` | utility | transform | DELETE entirely -- no analog needed |
| `scripts/data/aliases.json` | data | n/a | DELETE entirely -- no analog needed |

## Metadata

**Analog search scope:** `scripts/`, `scripts/lib/`
**Files scanned:** 10
**Pattern extraction date:** 2026-06-04

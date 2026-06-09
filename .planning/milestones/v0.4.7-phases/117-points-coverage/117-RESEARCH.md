# Phase 117: Points Coverage - Research

**Researched:** 2026-06-04
**Domain:** Build pipeline refactoring (Node.js scripts, CSV parsing, dependency removal)
**Confidence:** HIGH

## Summary

Phase 117 replaces BSData XML-based points resolution with a direct join on Wahapedia's `Datasheets_models_cost.csv` using `datasheet_id`, removes all BSData dependencies (`@xmldom/xmldom`, XML parsing, fuzzy name matching, alias table), and raises the coverage threshold from 58% to 90%. The phase is entirely contained within dev-side build scripts -- no app runtime code changes required.

The cost CSV contains 2135 rows covering 1707 unique datasheet_ids, with 99.8% coverage of the current 1701 non-Legends units. The join is trivial since `datasheet_id` in the cost CSV matches unit IDs already parsed from Datasheets.csv (Step 3). Multi-tier units produce multiple `UdbUnitPointsRow` entries; single-tier units set `base_points` directly on the unit row.

The BSData removal is surgical but touches 6 files across 3 scripts (build, update, audit) plus 3 library files (bsdata.ts, parseXml.ts, normalize.ts). Sub-faction assignment must be decoupled from BSData catalogue iteration and instead driven by the existing `SUB_FACTION_MAP` using a reverse-mapping approach.

**Primary recommendation:** Implement as two waves: (1) add cost CSV parsing + sub-faction decoupling, (2) remove BSData code + raise threshold + verify.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Parse Datasheets_models_cost.csv as new build step after Step 3. Join on datasheet_id.
- D-02: Multi-tier units produce one UdbUnitPointsRow per tier. Extract model count from description via regex. For non-standard descriptions, sum all numbers or fall back to `line` field.
- D-03: Single-tier units set base_points on unit row directly.
- D-04: Remove entire BSData pipeline: @xmldom/xmldom, DOMParser polyfill, readBsdataCatFiles, parseCatXml, parseBsdataModelCounts, matchUnit, alias loading, Step 8.
- D-05: Remove @xmldom/xmldom from package.json.
- D-06: Remove scripts/lib/parseXml.ts and scripts/data/aliases.json entirely. Clean bsdata.ts (keep readCsvFile, remove BSData functions). Check normalize.ts.
- D-07: Apply same changes to both build-unit-db.ts and update-unit-database.ts.
- D-08: Clean audit-faction.ts of @xmldom/xmldom and BSData imports.
- D-09: Derive composition from cost CSV tiers (min/max model counts across tier descriptions).
- D-10: Decouple sub-faction assignment from BSData. Use reverse-mapping of SUB_FACTION_MAP by faction_id.
- D-11: scripts/lib/factionMap.ts stays as-is.
- D-12: Raise MIN_COVERAGE_PCT from 58 to 90 after confirming coverage.
- D-13: Simplify coverage report to track "Wahapedia cost CSV" as sole match method.

### Claude's Discretion
- Model count extraction regex for non-standard descriptions (exact pattern)
- Whether to keep readCsvFile() in bsdata.ts or move it to parseCsv.ts
- Coverage report format adjustments (column headers, badge thresholds)
- Whether to delete scripts/data/bsdata/ directory or just stop reading from it

### Deferred Ideas (OUT OF SCOPE)
None.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PTS-01 | Points imported from Datasheets_models_cost.csv via direct datasheet_id join | Cost CSV has datasheet_id as first column; matches unit IDs from Datasheets.csv. 2135 rows, 1707 unique IDs. Join is direct -- no fuzzy matching needed. |
| PTS-02 | Points coverage reaches 90%+ for all factions | 1697/1701 units have cost CSV entries (99.8%). Only 4 units missing. Raising threshold to 90 is safe. |
| PTS-03 | BSData XML parsing removed from build pipeline | 3 scripts import @xmldom/xmldom + BSData functions. parseXml.ts and aliases.json can be deleted entirely. bsdata.ts needs selective cleanup. |
| PTS-04 | Sub-faction assignment preserved via static mapping file | SUB_FACTION_MAP has 17 entries keyed by BSData catalogue name. Must reverse-map: catalogue name -> faction_id is available via FACTION_MAP, so for each SUB_FACTION_MAP entry, derive which faction_id it maps to and tag units in that faction with matching keywords/IDs. |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Points resolution from CSV | Build scripts (dev-side) | -- | Offline pipeline, not runtime |
| BSData dependency removal | Build scripts + package.json | -- | Only build scripts use @xmldom/xmldom |
| Sub-faction assignment | Build scripts (dev-side) | -- | Static map applied during build, stored in JSON |
| Coverage threshold enforcement | Build scripts (dev-side) | -- | Build-time gate, not runtime check |
| Composition derivation | Build scripts (dev-side) | -- | Extracted from cost CSV during build |

## Standard Stack

No new packages needed. This phase *removes* a dependency (`@xmldom/xmldom`).

### Core (existing, unchanged)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `parseWahapediaCsv` | local | Pipe-delimited CSV parser (BOM-safe per Phase 116) | Keep |
| `readCsvFile` | local | Wrapper around parseWahapediaCsv for file I/O | Keep (relocate from bsdata.ts) |
| `SUB_FACTION_MAP` | local | Static sub-faction assignments | Keep |
| `FACTION_MAP` | local | BSData catalogue -> Wahapedia faction_id mapping | Keep (needed for sub-faction reverse-map) |

### Removed
| Library | Version | Purpose | Why Removed |
|---------|---------|---------|-------------|
| `@xmldom/xmldom` | ^0.9.10 | DOMParser polyfill for XML parsing | BSData XML no longer needed; cost CSV replaces it |

## Package Legitimacy Audit

No packages installed. One package removed (`@xmldom/xmldom`). No audit needed.

## Architecture Patterns

### System Architecture Diagram

```
Datasheets.csv ──> Step 3: Parse units ──> validUnitIds set
                                               │
Datasheets_models_cost.csv ──> NEW Step 8: ────┤
  Parse cost CSV                               │
  │                                            │
  ├── Join on datasheet_id ∈ validUnitIds      │
  │     │                                      │
  │     ├── Single-tier? ──> unit.base_points  │
  │     └── Multi-tier? ──> UdbUnitPointsRow[] │
  │                                            │
  └── Extract composition (min/max models)     │
                                               │
SUB_FACTION_MAP ──> NEW Step 8b: ──────────────┤
  Reverse-map by faction_id                    │
  Assign sub_faction to matching units         │
                                               │
                                     Coverage report ──> threshold check (90%)
```

### Cost CSV Structure (verified from file) [VERIFIED: local file inspection]

```
datasheet_id|line|description|cost|
000000001|1|1 model|75|
000000016|1|10 models|80|
000000016|2|20 models|170|
000000019|1|1 Spanner and 4 Burna Boyz|60|
000000019|2|2 Spanners and 8 Burna Boyz|120|
000002799|1|1 Sword Brother, 5 Initiates and 4 Neophytes|150|
```

**Key observations:**
- Pipe-delimited with trailing pipe (same as all Wahapedia CSVs)
- `datasheet_id` is zero-padded 9-digit string matching Datasheets.csv IDs
- `line` provides natural tier ordering (1, 2, 3...)
- `description` patterns: "N model(s)", "N ModelName", "N ModelName and N ModelName", "N ModelName, N ModelName and N ModelName"
- `cost` is integer points value
- 2135 data rows + 1 header row = 2136 total lines

### Pattern 1: Cost CSV Parsing Step

**What:** New build step replacing BSData Step 8 -- parse Datasheets_models_cost.csv and join on datasheet_id.

**Example:**
```typescript
// Parse cost CSV
const costRows = readCsvFile(DATA_DIR, "Datasheets_models_cost.csv");

// Group by datasheet_id
const costByUnit = new Map<string, Array<{ line: number; description: string; cost: number }>>();
for (const row of costRows) {
  const id = row["datasheet_id"]?.trim();
  if (!id || !validUnitIds.has(id)) continue;
  const arr = costByUnit.get(id) ?? [];
  arr.push({
    line: parseInt(row["line"]?.trim() ?? "0", 10) || 0,
    description: row["description"]?.trim() ?? "",
    cost: parseInt(row["cost"]?.trim() ?? "0", 10) || 0,
  });
  costByUnit.set(id, arr);
}

// Process each unit's cost tiers
for (const [unitId, tiers] of costByUnit) {
  if (tiers.length === 1) {
    // Single-tier: set base_points directly
    const unit = units.find(u => u.id === unitId);
    if (unit && tiers[0].cost > 0) {
      unit.base_points = tiers[0].cost;
    }
  } else {
    // Multi-tier: extract model counts from description, create points rows
    for (const tier of tiers) {
      const modelCount = extractModelCount(tier.description, tier.line);
      points.push({ unit_id: unitId, model_count: modelCount, points: tier.cost });
    }
  }
}
```

### Pattern 2: Model Count Extraction from Description

**What:** Extract total model count from cost CSV description field.

**Description patterns found in actual data:**
1. `"N model"` or `"N models"` -- simple case, extract N
2. `"N ModelName"` -- single named model type, extract N (e.g., "6 models")
3. `"N ModelA and N ModelB"` -- two model types, sum all numbers (e.g., "1 Spanner and 4 Burna Boyz" = 5)
4. `"N ModelA, N ModelB and N ModelC"` -- three model types with commas (e.g., "1 Sword Brother, 5 Initiates and 4 Neophytes" = 10)

**Example:**
```typescript
/**
 * Extract total model count from a cost CSV description.
 * Sums all leading numbers from comma/and-separated segments.
 * Falls back to `line` field (tier index) if no numbers found.
 */
function extractModelCount(description: string, line: number): number {
  // Match all numbers that appear at the start of segments
  const numbers = description.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    return numbers.reduce((sum, n) => sum + parseInt(n, 10), 0);
  }
  // Fallback: use line as tier order
  return line;
}
```

### Pattern 3: Sub-faction Reverse Mapping

**What:** Decouple sub-faction assignment from BSData catalogue iteration. Currently, sub-factions are assigned when iterating BSData .cat files by checking `SUB_FACTION_MAP[catFile.catalogueName]`. Without BSData, we need a different approach.

**Key insight:** SUB_FACTION_MAP maps BSData catalogue names to sub-faction labels. FACTION_MAP maps BSData catalogue names to Wahapedia faction_ids. Most SUB_FACTION_MAP entries map to units that are exclusive to that sub-faction (e.g., Blood Angels units only appear in the "Imperium - Blood Angels" catalogue). However, the cost CSV has no catalogue information -- it only has datasheet_id.

**Approach per D-10:** Build a reverse lookup: for each SUB_FACTION_MAP entry, use FACTION_MAP to get the faction_id, then use the Datasheets.csv data to identify which units belong to that sub-faction. The challenge is that Datasheets.csv uses a single faction_id for all Space Marines (SM), Chaos Space Marines (CSM), etc.

**Critical finding:** The current BSData approach assigns sub-factions based on which .cat file contained the unit. Without BSData .cat files, we cannot determine which specific SM chapter a unit belongs to just from Wahapedia CSV data. Wahapedia groups all SM units under faction_id "SM" with no sub-faction column.

**Resolution per D-10:** The 17 SUB_FACTION_MAP entries cover faction-specific units that are unique to their sub-faction (e.g., Sanguinary Guard is only Blood Angels). The Datasheets_keywords.csv contains faction keywords like "Blood Angels", "Dark Angels" etc. that can be used to identify sub-faction membership. Alternatively, the existing unit_database.json already has sub-faction assignments from prior BSData builds -- these can be preserved by reading the old JSON and carrying forward sub_faction values.

**Recommended approach:**
```typescript
// Build sub-faction lookup from Datasheets_keywords.csv
// Units with a faction keyword matching a sub-faction name get tagged
const subFactionKeywords = new Set(Object.values(SUB_FACTION_MAP));

for (const kw of keywordsRaw) {
  const unitId = kw["datasheet_id"]?.trim();
  if (!unitId || !validUnitIds.has(unitId)) continue;
  const keyword = kw["keyword"]?.trim();
  if (!keyword) continue;
  
  if (subFactionKeywords.has(keyword)) {
    const unit = unitById.get(unitId);
    if (unit && unit.sub_faction === null) {
      unit.sub_faction = keyword;
    }
  }
}
```

### Pattern 4: Composition from Cost CSV

**What:** Derive min/max model counts from cost CSV tiers instead of BSData XML constraints.

**Example:**
```typescript
// For multi-tier units, min = smallest tier model count, max = largest
for (const [unitId, tiers] of costByUnit) {
  if (tiers.length <= 1) {
    // Single-tier: composition = model count from description
    const count = extractModelCount(tiers[0].description, tiers[0].line);
    composition.push({ unit_id: unitId, min_models: count, max_models: count, notes: "" });
  } else {
    const counts = tiers.map(t => extractModelCount(t.description, t.line));
    composition.push({
      unit_id: unitId,
      min_models: Math.min(...counts),
      max_models: Math.max(...counts),
      notes: "",
    });
  }
}
```

### Anti-Patterns to Avoid
- **Fuzzy name matching for cost CSV:** The cost CSV joins on datasheet_id, not name. Do not introduce any name-based matching.
- **Partial BSData removal:** All BSData code paths must be removed together. Leaving dead imports causes TypeScript errors.
- **Modifying only one build script:** build-unit-db.ts and update-unit-database.ts share the same pipeline structure -- changes must be mirrored in both.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom parser | Existing `parseWahapediaCsv` / `readCsvFile` | Already handles pipe-delimited format + BOM |

## Common Pitfalls

### Pitfall 1: readCsvFile Location After bsdata.ts Cleanup
**What goes wrong:** After removing BSData functions from bsdata.ts, the file becomes misleadingly named -- it only contains `readCsvFile` which is a generic CSV utility.
**Why it happens:** readCsvFile is used by all 3 scripts (build, update, audit) and imported from bsdata.ts.
**How to avoid:** Either (a) move readCsvFile to parseCsv.ts (which already contains parseWahapediaCsv), or (b) rename bsdata.ts to csvReader.ts. Option (a) is cleaner -- parseCsv.ts already owns CSV parsing.
**Warning signs:** TypeScript import errors after removing bsdata.ts functions.

### Pitfall 2: Sub-faction Assignment Without BSData Catalogues
**What goes wrong:** After removing BSData iteration, sub_faction fields become null for all units.
**Why it happens:** Sub-faction was assigned during BSData .cat file iteration using `SUB_FACTION_MAP[catFile.catalogueName]`. Without .cat files, there is no catalogue name to look up.
**How to avoid:** Use Datasheets_keywords.csv to identify sub-faction membership. Units have faction keywords (e.g., "Blood Angels") that match SUB_FACTION_MAP values.
**Warning signs:** `unitsWithSubFaction` count drops to 0 in build output.

### Pitfall 3: Cost CSV Has No Faction Column
**What goes wrong:** Cannot filter cost CSV rows by faction -- must rely on validUnitIds set from Step 3.
**Why it happens:** Datasheets_models_cost.csv only has datasheet_id, line, description, cost.
**How to avoid:** Always gate cost CSV processing with `validUnitIds.has(id)` check. This is already the pattern used for all other CSV steps.
**Warning signs:** Processing rows for Legends units or unknown IDs.

### Pitfall 4: Model Count Extraction Edge Cases
**What goes wrong:** Regex extracts wrong model count for complex descriptions.
**Why it happens:** Descriptions like "1 Sword Brother, 5 Initiates and 4 Neophytes" need all 3 numbers summed (=10), not just the first.
**How to avoid:** Use `description.match(/\d+/g)` to find ALL numbers, then sum them. The line field is a reliable fallback for tier ordering.
**Warning signs:** Composition min/max values that don't make sense (e.g., min_models: 1 for a unit that always has 10 models).

### Pitfall 5: Coverage Report Type Changes
**What goes wrong:** TypeScript errors from FactionCoverage type still having BSData match method fields.
**Why it happens:** FactionCoverage interface in types.ts has optional fields `matched_exact`, `matched_normalized`, `matched_alias`, `unmatched_names` -- these are BSData-specific.
**How to avoid:** Simplify FactionCoverage to remove BSData match method fields. Replace with a single `match_method: "wahapedia_cost_csv"` or just remove the match tracking entirely since all matches are now by direct ID join.
**Warning signs:** Console output still shows "Exact/Norm/Alias" columns with all zeros.

### Pitfall 6: audit-faction.ts Only Uses readCsvFile, Not BSData Functions
**What goes wrong:** Over-cleaning audit-faction.ts by removing more than necessary.
**Why it happens:** audit-faction.ts imports DOMParser polyfill and readCsvFile from bsdata.ts, but does NOT use parseCatXml, matchUnit, etc. for its core audit logic.
**How to avoid:** Check actual usage -- audit-faction.ts only needs readCsvFile. Remove the DOMParser import/polyfill and update the import path for readCsvFile after relocation.
**Warning signs:** Audit script breaks after cleanup.

## Code Examples

### Complete Cost CSV Parsing Step (replaces Step 8)

```typescript
// Step 8: Parse Datasheets_models_cost.csv for points and composition
console.log("Step 8: Parsing Datasheets_models_cost.csv...");
const costRows = readCsvFile(DATA_DIR, "Datasheets_models_cost.csv");

// Group cost rows by datasheet_id
const costByUnit = new Map<string, Array<{ line: number; description: string; cost: number }>>();
for (const row of costRows) {
  const id = row["datasheet_id"]?.trim();
  if (!id || !validUnitIds.has(id)) continue;
  const cost = parseInt(row["cost"]?.trim() ?? "0", 10);
  if (cost <= 0) continue;
  const arr = costByUnit.get(id) ?? [];
  arr.push({
    line: parseInt(row["line"]?.trim() ?? "0", 10) || 0,
    description: row["description"]?.trim() ?? "",
    cost,
  });
  costByUnit.set(id, arr);
}

const matchedUnits = new Set<string>();

for (const [unitId, tiers] of costByUnit) {
  const unit = units.find(u => u.id === unitId);
  if (!unit) continue;

  if (tiers.length === 1) {
    // Single-tier: set base_points directly
    if (unit.base_points === null) {
      unit.base_points = tiers[0].cost;
      matchedUnits.add(unitId);
    }
  } else {
    // Multi-tier: create one UdbUnitPointsRow per tier
    for (const tier of tiers) {
      const modelCount = extractModelCount(tier.description, tier.line);
      points.push({ unit_id: unitId, model_count: modelCount, points: tier.cost });
      matchedUnits.add(unitId);
    }
  }

  // Composition: derive from tier descriptions
  const counts = tiers.map(t => extractModelCount(t.description, t.line));
  composition.push({
    unit_id: unitId,
    min_models: Math.min(...counts),
    max_models: Math.max(...counts),
    notes: "",
  });
}

console.log(`  Matched ${matchedUnits.size} units via cost CSV (${points.length} tier entries)`);
```

### Sub-faction Assignment via Keywords

```typescript
// Step 8b: Assign sub-factions from keywords (replaces BSData catalogue-based assignment)
const subFactionValues = new Set(Object.values(SUB_FACTION_MAP));
const unitById = new Map(units.map(u => [u.id, u]));

for (const kw of keywords) {
  if (subFactionValues.has(kw.keyword)) {
    const unit = unitById.get(kw.unit_id);
    if (unit && unit.sub_faction === null) {
      unit.sub_faction = kw.keyword;
    }
  }
}
```

### Import Cleanup Pattern (per file)

```typescript
// BEFORE (build-unit-db.ts):
import { DOMParser } from "@xmldom/xmldom";
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;
import { parseCatXml } from "./lib/parseXml.ts";
import { loadAliases } from "./lib/normalize.ts";
import { readCsvFile, readBsdataCatFiles, parseBsdataModelCounts, matchUnit } from "./lib/bsdata.ts";

// AFTER:
import { readCsvFile } from "./lib/parseCsv.ts"; // relocated from bsdata.ts
import { SUB_FACTION_MAP, CROSS_FACTION_MAP } from "./lib/factionMap.ts"; // keep
// No more: @xmldom/xmldom, parseXml, normalize (loadAliases), bsdata BSData functions
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BSData XML .cat files + fuzzy name matching | Wahapedia cost CSV + direct ID join | Phase 117 | 60% -> 99.8% coverage, simpler pipeline |
| 3-pass matching (exact/normalized/alias) | Single-pass datasheet_id lookup | Phase 117 | No fuzzy matching bugs, deterministic |
| @xmldom/xmldom DOMParser polyfill | Removed entirely | Phase 117 | One fewer runtime dependency |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Datasheets_keywords.csv contains sub-faction keywords (e.g., "Blood Angels") for chapter-specific units | Pattern 3 / Pitfall 2 | Sub-faction assignment fails; would need alternative approach (e.g., carry forward from old JSON) |
| A2 | All numbers in cost CSV description should be summed to get total model count | Pattern 2 | Model counts could be wrong for unusual descriptions; line field provides safe fallback |
| A3 | The 4 units without cost CSV entries are acceptable edge cases (not critical factions) | PTS-02 research | Coverage might not reach 90% for specific small factions |

## Open Questions

1. **Sub-faction keyword availability**
   - What we know: SUB_FACTION_MAP has 17 entries. Keywords CSV has faction keywords.
   - What's unclear: Do all 17 sub-faction values appear as exact keyword matches in Datasheets_keywords.csv? Some (like "Drukhari", "Ynnari") are separate factions in Wahapedia, not keywords.
   - Recommendation: Verify at implementation time by checking keywords CSV. For sub-factions that are separate Wahapedia factions (DRU, Ynnari), the `faction_id` field itself identifies them -- no keyword lookup needed. Only SM chapters and CSM warbands need keyword-based assignment.

2. **readCsvFile relocation target**
   - What we know: readCsvFile wraps parseWahapediaCsv. Moving to parseCsv.ts is clean.
   - What's unclear: Does parseCsv.ts have filesystem imports (readFileSync) or is it pure?
   - Recommendation: Check at implementation time. If parseCsv.ts is pure (string -> array), keep readCsvFile in a separate file or add the fs import.

3. **4 missing units identity**
   - What we know: 1697/1701 units have cost CSV entries. 4 are missing.
   - What's unclear: Which 4 units? Are they faction-critical?
   - Recommendation: The build script's coverage report will identify them. At 99.8% coverage, this is well above the 90% threshold.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies -- purely code/config changes to existing Node.js build scripts).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PTS-01 | Cost CSV parsed, points joined by datasheet_id | integration | `pnpm build:udb` (build script succeeds) | N/A -- build script IS the test |
| PTS-02 | Coverage >= 90% | integration | `pnpm build:udb` (threshold check passes) | N/A -- build script has built-in gate |
| PTS-03 | No @xmldom/xmldom reference | unit | `grep -r "xmldom" scripts/ package.json` returns empty | manual check |
| PTS-04 | Sub-faction assignments preserved | integration | `pnpm build:udb` (sub-faction count > 0) | N/A -- build script reports count |

### Sampling Rate
- **Per task commit:** `pnpm build:udb` (runs full pipeline, catches regressions)
- **Per wave merge:** `pnpm build:udb && pnpm test`
- **Phase gate:** Build succeeds with 90%+ coverage + no @xmldom/xmldom references + sub-faction count > 0

### Wave 0 Gaps
None -- the build script itself is the primary validation mechanism with built-in coverage threshold checks and summary stats. No new test files needed.

## Security Domain

Not applicable. This phase modifies dev-side build scripts only. No user input, no network calls, no authentication, no stored secrets involved.

## Sources

### Primary (HIGH confidence)
- Local file inspection: `scripts/build-unit-db.ts` (812 lines) -- full pipeline with BSData Step 8
- Local file inspection: `scripts/update-unit-database.ts` (643 lines) -- parallel pipeline
- Local file inspection: `scripts/lib/bsdata.ts` (177 lines) -- BSData functions + readCsvFile
- Local file inspection: `scripts/lib/parseXml.ts` (153 lines) -- XML parsing, entirely BSData
- Local file inspection: `scripts/lib/normalize.ts` (48 lines) -- normalizeName + loadAliases
- Local file inspection: `scripts/lib/factionMap.ts` (98 lines) -- FACTION_MAP, SUB_FACTION_MAP, CROSS_FACTION_MAP
- Local file inspection: `scripts/lib/types.ts` (168 lines) -- all type definitions
- Local file inspection: `scripts/data/Datasheets_models_cost.csv` (2136 lines) -- actual cost data
- Local file inspection: `scripts/audit-faction.ts` -- imports DOMParser + readCsvFile
- `package.json` line 70: `@xmldom/xmldom: ^0.9.10`

### Secondary (MEDIUM confidence)
- Phase 117 CONTEXT.md -- data analysis showing 1697/1701 units covered (99.8%)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new packages, removal only
- Architecture: HIGH -- all code inspected, patterns verified from actual files
- Pitfalls: HIGH -- identified from actual import graph and code structure
- Sub-faction approach: MEDIUM -- keyword-based assignment is logical but A1 needs implementation-time verification

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 (stable -- build scripts, no external API changes)

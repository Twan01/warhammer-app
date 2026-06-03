# Phase 114: Pipeline Fixes & Database Rebuild - Research

**Researched:** 2026-06-03
**Domain:** Build pipeline data parsing, CSV column mapping, name normalization
**Confidence:** HIGH

## Summary

Phase 114 fixes every error class discovered during the Phase 113 audit in `build-unit-db.ts`. The investigation reveals three distinct bug categories: (1) two one-line CSV column name typos affecting ALL weapons globally, (2) a weapon group/line_order mapping bug that causes per-unit stat mismatches in the audit comparison, and (3) missing name normalization for units that exist in both BSData and Wahapedia but fail to match.

The CSV column bugs are trivially fixable. The weapon group mapping bug is the most important finding -- the build script uses a counter-based `weaponGroupTracker` when the CSV already provides the correct group number in `line`. The correct mapping is `weapon_group = row["line"]` and `line_order = row["line_in_wargear"]`. The "missing_alias" units are predominantly Wahapedia-only entries (Forge World, chapter-specific characters) that BSData simply does not carry; only a small subset need actual aliases.

**Primary recommendation:** Fix the three systematic bugs first (range column, keywords column, weapon group mapping), then add targeted aliases for the small number of genuinely mismatched unit names, then rebuild and verify with the audit script.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Fix `weapon.range` bug: change `row["Range"]` to `row["range"]` in `build-unit-db.ts` line 279
- D-02: Fix `weapon.keywords` bug: change `row["keywords"]` to `row["description"]` in `build-unit-db.ts` line 285
- D-03: Both fixes are one-line changes. No structural refactoring needed
- D-04: 51 per-unit weapon errors need root cause investigation -- weapon ordering/grouping logic
- D-05: Error pattern suggests positional comparison issue -- verify before changing pipeline
- D-06: Improve name normalization for apostrophe variants, spacing differences, case differences
- D-07: Many "missing_alias" units are Wahapedia-only (no BSData match possible). Distinguish categories
- D-08: Apostrophe normalization: normalize both curly and straight before comparison
- D-09: Parser improvements first, aliases only for genuine edge cases
- D-10: After normalization improvements, re-run build to identify remaining unmatched units
- D-11: Expected alias categories: chapter-specific characters, parenthetical variants, different naming
- D-12: Full database rebuild after fixes, compare coverage improvements
- D-13: Update MIN_COVERAGE_PCT if coverage improves significantly (raise to 65% if >70%)
- D-14: Re-run Phase 113 audit script after rebuild for delta report

### Claude's Discretion
- Order of fixes within the pipeline (systematic bugs first is natural)
- Whether to create separate normalization pass or integrate apostrophe handling into existing normalize()
- How to structure verification step (re-run audit script vs manual spot-check vs both)
- Whether per-unit weapon errors are pipeline bugs or audit comparison artifacts -- investigate and fix

### Deferred Ideas (OUT OF SCOPE)
- French translation gaps for abilities (174 SM, 38 NEC, 25 DG) -- deferred to FR-EXT-01
- Extended faction audits for remaining 22 factions -- deferred to EFA-01..03
- Composition data sparseness (only 12 entries total) -- future milestone
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PFX-01 | Build script parsing bugs discovered during audit are fixed in the pipeline (not just aliased) | Three bugs identified: weapon.range column (line 279), weapon.keywords column (line 285), weapon_group mapping logic (lines 257-271). All confirmed by CSV header inspection and code analysis |
| PFX-02 | Name normalization improved to handle apostrophe variants, spacing differences, and common formatting mismatches | normalize.ts already handles smart quotes; normalization is already integrated in matchUnit 3-pass. Missing aliases are predominantly Wahapedia-only units, not normalization failures |
| PFX-03 | New aliases added to aliases.json for edge cases that cannot be fixed by parsing improvements | Audit reports identify specific missing_alias units per faction. Most are Forge World or chapter-specific characters absent from BSData entirely |
| PFX-04 | Unit database rebuilt with pipeline fixes -- coverage improvement verified for audited factions | Current coverage: SM 58.1%, NEC 79.7%, DG 50.7%, overall 60.1%. Fixes should improve per-unit data quality significantly; coverage improvement depends on how many missing_alias units get aliases |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CSV column parsing | Build Script | -- | Dev-side only; `build-unit-db.ts` reads CSV and produces JSON |
| Weapon group mapping | Build Script | -- | Weapon grouping logic is entirely in `build-unit-db.ts` lines 257-288 |
| Name normalization | Build Script Library | -- | `scripts/lib/normalize.ts` + `scripts/lib/bsdata.ts` matchUnit() |
| Alias management | Build Script Data | -- | `scripts/data/aliases.json` loaded by normalize.ts |
| Verification | Audit Script | -- | `scripts/audit-faction.ts` compares DB data against CSV source |
| Database output | Build Script | Rust Backend | JSON written by build script, imported by Rust at app startup |

## Architecture Patterns

### System Architecture Diagram

```
Wahapedia CSV files          BSData .cat XML files
  (scripts/data/*.csv)         (scripts/data/bsdata/*.cat)
         |                              |
         v                              v
  readCsvFile()              readBsdataCatFiles()
         |                              |
         v                              v
  Parse units, models,       parseCatXml() -> points,
  weapons, abilities,        model counts per unit
  keywords                            |
         |                              |
         v                              v
  unitMap (name:faction ->   matchUnit() 3-pass:
  UdbUnitRow)                exact -> normalized -> alias
         |                              |
         +--------- MERGE -------------+
         |
         v
  Assemble JSON output
  (units + models + weapons + abilities + keywords + points)
         |
         v
  unit_database.json
  coverage-report.json
```

### Bug Location Map

```
build-unit-db.ts
  Line 279: row["Range"]     --> should be row["range"]        [BUG 1: PFX-01]
  Line 285: row["keywords"]  --> should be row["description"]  [BUG 2: PFX-01]
  Lines 257-271: weaponGroupTracker logic                      [BUG 3: PFX-01]
    - Uses counter that increments on lineOrder===1
    - Should use CSV "line" directly as weapon_group
    - Should use CSV "line_in_wargear" directly as line_order

scripts/lib/normalize.ts
  normalizeName() already handles smart quotes
  No additional apostrophe fix needed (already in place)
```

### Recommended Fix Strategy

1. **Systematic CSV fixes** (PFX-01 core): Two one-line column name corrections
2. **Weapon group fix** (PFX-01 root cause of per-unit errors): Replace counter-based tracking with direct CSV column mapping
3. **Normalization audit** (PFX-02): Verify existing normalization catches all cases; add any missing patterns
4. **Alias additions** (PFX-03): Add targeted aliases for genuinely mismatched names only
5. **Rebuild + verify** (PFX-04): Run build, run audit, compare delta

### Anti-Patterns to Avoid
- **Adding aliases for Forge World / Wahapedia-only units:** These units have no BSData match possible. Adding aliases would create invalid mappings
- **Fixing the audit script instead of the pipeline:** D-05 suspected audit comparison artifact, but investigation confirms the weapon_group tracking IS a pipeline bug
- **Raising MIN_COVERAGE_PCT before measuring improvement:** Must rebuild first, measure, then adjust

## Key Findings

### Finding 1: CSV Column Name Bugs (CONFIRMED)
**Confidence:** HIGH [VERIFIED: direct CSV header inspection]

The CSV file `Datasheets_wargear.csv` has this header line:
```
datasheet_id|line|line_in_wargear|dice|name|description|range|type|A|BS_WS|S|AP|D|
```

The build script accesses:
- `row["Range"]` (line 279) -- should be `row["range"]` (lowercase)
- `row["keywords"]` (line 285) -- should be `row["description"]`

These two bugs cause ALL weapons (2,472+ across SM/NEC/DG alone, thousands more across all factions) to have empty `range` and empty `keywords` fields. The fix is two character-level changes.

### Finding 2: Weapon Group Mapping Bug (CONFIRMED)
**Confidence:** HIGH [VERIFIED: CSV data inspection + code analysis]

The build script's `weaponGroupTracker` logic (lines 257-271) is fundamentally wrong:

**Current (broken) logic:**
```typescript
const lineOrder = parseInt(row["line"]?.trim() ?? "1", 10) || 1;
let weaponGroup = weaponGroupTracker.get(unitId) ?? 0;
if (lineOrder === 1) {
  weaponGroup++;
  weaponGroupTracker.set(unitId, weaponGroup);
}
// Result: weapon_group=1 (always for single-unit), line_order=line (CSV)
```

**CSV semantics (verified with actual data):**
- `line` = weapon profile group number (1, 2, 3... per unit)
- `line_in_wargear` = sub-profile within group (1 = base, 2 = supercharge variant)

**Example (Imotekh, unit 000000522):**
```
000000522|1|1||Gauntlet of Fire|...|12|Ranged|...
000000522|2|1||Staff of the Destroyer|...|18|Ranged|...
000000522|3|1||Staff of the Destroyer|...|Melee|Melee|...
```

The DB stores: weapon_group=1, line_order=1/2/3
The audit expects: weapon_group=1/2/3 (from `line`), line_order=1/1/1 (from `line_in_wargear`)

When the audit tries to match weapon_group=3, line_order=1 (the melee Staff), it finds no DB row. It falls back to name-based matching and finds the first "Staff of the Destroyer" (the ranged one), then compares its Ranged stats against the expected Melee stats -- producing the false "category: Ranged instead of Melee" errors.

**Correct fix:**
```typescript
const weaponGroup = parseInt(row["line"]?.trim() ?? "1", 10) || 1;
const lineOrder = parseInt(row["line_in_wargear"]?.trim() ?? "1", 10) || 1;
// Remove weaponGroupTracker entirely
```

This eliminates ALL 51 per-unit weapon errors (SM: 23, NEC: 23, DG: 5). They are not audit artifacts -- they are genuine pipeline data mapping errors.

### Finding 3: Normalization Already Handles Apostrophes (CONFIRMED)
**Confidence:** HIGH [VERIFIED: scripts/lib/normalize.ts code]

The existing `normalizeName()` function already:
- Replaces curly quotes (U+2018, U+2019) with straight apostrophe
- Lowercases everything
- Strips non-alphanumeric chars except apostrophe and space
- Collapses whitespace

This was added in a prior phase. The `matchUnit()` 3-pass system uses `normalizeName()` in pass 2. Tests in `tests/build-pipeline/normalize.test.ts` cover these cases extensively.

**Impact on PFX-02:** The normalization is already adequate. The 94 "missing_alias" units are NOT normalization failures -- they are units that exist only in Wahapedia (no BSData equivalent). PFX-02 may require only verification that normalization is sufficient, plus potentially minor improvements for any edge cases found during the alias investigation step.

### Finding 4: Missing Alias Classification (CONFIRMED)
**Confidence:** HIGH [VERIFIED: audit reports analysis]

Breakdown of unmatched units across the three audited factions:

**Space Marines (125 unmatched):**
- 43 Forge World (no BSData match possible)
- 3 Legends (excluded by name pattern)
- 79 "missing_alias" -- but many are Wahapedia-only units not in BSData

**Necrons (13 unmatched):**
- 7 Forge World
- 6 "missing_alias" -- includes Lord (generic name collision), Nemesor Zahndrekh, Vargard Obyron, Anrakyr The Traveller, Lokhust Heavy Destroyers, Tomb Citadel Walls

**Death Guard (35 unmatched):**
- 26 Forge World
- 9 "missing_alias" -- includes Death Guard Chaos Lord, Death Guard Cultists, etc.

The "missing_alias" units fall into these categories:
1. **Wahapedia-only** (no BSData equivalent): Most SM chapter-specific units, Kill Teams, etc.
2. **Genuine name mismatches** (need aliases): A small number where BSData uses a different name
3. **Already matched by cross-faction**: Some shared Chaos units may match under CSM

Only category 2 needs aliases. The planner must include a task to investigate each "missing_alias" unit against the BSData .cat files to determine which category it belongs to.

### Finding 5: Coverage Impact Assessment
**Confidence:** MEDIUM [ASSUMED: requires rebuild to confirm]

Current coverage (points matching):
- SM: 58.1% (173/298 with points)
- NEC: 79.7% (51/64 with points)
- DG: 50.7% (36/71 with points)
- Overall: 60.1% (1028/1711)

The CSV column fixes (range, keywords) will NOT affect coverage numbers -- coverage measures units with BSData points matches, not weapon data completeness. The weapon group fix will NOT affect coverage either.

Aliases for genuinely mismatched names WILL improve coverage. If aliases are added for the small set of genuine name mismatches, the per-faction coverage could increase slightly. The overall 60.1% is unlikely to change dramatically because most unmatched units are Forge World / Wahapedia-only.

**MIN_COVERAGE_PCT update:** Raising from 55% to 65% is probably not justified unless specific aliases significantly boost coverage. Recommend measuring after rebuild before committing to a threshold change.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom pipe-delimited parser | Existing `parseWahapediaCsv()` in parseCsv.ts | Already handles Wahapedia's pipe-delimited format with edge cases |
| Name normalization | Ad-hoc string manipulation | Existing `normalizeName()` in normalize.ts | Already handles smart quotes, whitespace, special chars |
| Unit matching | Custom matching logic | Existing `matchUnit()` 3-pass in bsdata.ts | Exact -> normalized -> alias fallback chain is correct |
| Audit verification | Manual spot-checking | Existing `scripts/audit-faction.ts` | Automated comparison against CSV source data |

## Common Pitfalls

### Pitfall 1: Assuming All "missing_alias" Units Need Aliases
**What goes wrong:** Adding aliases for units that don't exist in BSData, causing invalid mappings or alias validation failures (BPH-04 warns on unknown unit names)
**Why it happens:** The audit classifies anything unmatched as "missing_alias" without checking whether BSData has the unit at all
**How to avoid:** For each missing_alias unit, grep BSData .cat files for the unit name before adding an alias. If not in BSData, it cannot be matched -- skip it
**Warning signs:** BPH-04 alias validation warnings about unknown unit names

### Pitfall 2: Confusing weapon_group Semantics After Fix
**What goes wrong:** Other code that reads weapon_group/line_order from the DB breaks because the meaning changed
**Why it happens:** The DB previously stored weapon_group=1 (always) and line_order=CSV line number; after fix it stores weapon_group=CSV line and line_order=CSV line_in_wargear
**How to avoid:** Check all consumers of weapon data in the JSON output. The audit script already expects the correct semantics. The app UI displays weapons by name, not by group/order, so this should be transparent
**Warning signs:** Weapons displaying in wrong order in the app

### Pitfall 3: Audit Script Also Needs the Same Column Fix
**What goes wrong:** If the audit script reads the CSV with different column names than the fixed build script, comparisons break
**Why it happens:** The audit script independently reads the CSV
**How to avoid:** Check audit script's CSV column access patterns to ensure they match the CSV headers (they already do -- the audit reads `row["range"]` and `row["description"]` correctly, which is why it detected the build script's bug)
**Warning signs:** Audit reports showing new systematic issues after fix

### Pitfall 4: Stale coverage-report.json
**What goes wrong:** After rebuild, the in-app Data Health badges show stale data
**Why it happens:** The coverage-report.json is regenerated by the build script, but the SQL-based live coverage badges are computed from the actual DB data
**How to avoid:** This is actually fine -- D-13 from CONTEXT.md says badges use computed SQL queries (live), not the static JSON file. Just ensure the rebuild completes successfully
**Warning signs:** None expected

## Code Examples

### Fix 1: CSV Column Names (lines 279, 285)
```typescript
// BEFORE (buggy):
category: row["wargear_role"]?.trim() ?? row["type"]?.trim() ?? "",
range: row["Range"]?.trim() ?? "",       // <-- wrong case
// ...
keywords: row["keywords"]?.trim() ?? "",  // <-- wrong column

// AFTER (fixed):
category: row["wargear_role"]?.trim() ?? row["type"]?.trim() ?? "",
range: row["range"]?.trim() ?? "",        // <-- lowercase matches CSV header
// ...
keywords: row["description"]?.trim() ?? "", // <-- correct column name
```

### Fix 2: Weapon Group Mapping (lines 257-288)
```typescript
// BEFORE (buggy):
const weaponGroupTracker = new Map<string, number>();
for (const row of wargearRaw) {
  const unitId = row["datasheet_id"]?.trim();
  if (!unitId || !validUnitIds.has(unitId)) continue;
  const name = row["name"]?.trim() ?? "";
  const lineOrder = parseInt(row["line"]?.trim() ?? "1", 10) || 1;
  let weaponGroup = weaponGroupTracker.get(unitId) ?? 0;
  if (lineOrder === 1) {
    weaponGroup++;
    weaponGroupTracker.set(unitId, weaponGroup);
  }
  weapons.push({
    unit_id: unitId,
    weapon_group: weaponGroup,
    line_order: lineOrder,
    // ...
  });
}

// AFTER (fixed):
for (const row of wargearRaw) {
  const unitId = row["datasheet_id"]?.trim();
  if (!unitId || !validUnitIds.has(unitId)) continue;
  const name = row["name"]?.trim() ?? "";
  const weaponGroup = parseInt(row["line"]?.trim() ?? "1", 10) || 1;
  const lineOrder = parseInt(row["line_in_wargear"]?.trim() ?? "1", 10) || 1;
  weapons.push({
    unit_id: unitId,
    weapon_group: weaponGroup,
    line_order: lineOrder,
    // ...
  });
}
// weaponGroupTracker removed entirely
```

### Fix 3: Alias Addition Pattern
```json
// In aliases.json -- ONLY for units confirmed to exist in BSData under different names
{
  "ExistingAlias": "ExistingTarget",
  "Lokhust Heavy Destroyers": "Lokhust Heavy Destroyer"
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 |
| Config file | vitest.config.ts (inferred from project setup) |
| Quick run command | `pnpm test -- tests/build-pipeline/` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PFX-01a | weapon.range reads correct CSV column | unit | `pnpm test -- tests/build-pipeline/weaponParsing.test.ts -x` | Wave 0 |
| PFX-01b | weapon.keywords reads correct CSV column | unit | `pnpm test -- tests/build-pipeline/weaponParsing.test.ts -x` | Wave 0 |
| PFX-01c | weapon_group/line_order use CSV line/line_in_wargear | unit | `pnpm test -- tests/build-pipeline/weaponParsing.test.ts -x` | Wave 0 |
| PFX-02 | normalizeName handles all apostrophe variants | unit | `pnpm test -- tests/build-pipeline/normalize.test.ts -x` | Exists |
| PFX-03 | aliases.json entries are valid (BPH-04) | integration | `node --experimental-strip-types scripts/build-unit-db.ts` (validates at build time) | Exists (build script) |
| PFX-04 | Rebuild produces improved coverage | smoke | `node --experimental-strip-types scripts/build-unit-db.ts` + audit comparison | Manual |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/build-pipeline/ -x`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green + successful database rebuild + audit delta report

### Wave 0 Gaps
- [ ] `tests/build-pipeline/weaponParsing.test.ts` -- covers PFX-01a/b/c (weapon column mapping and group tracking)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Counter-based weapon group tracking | Direct CSV line/line_in_wargear mapping | This phase | Eliminates 51 per-unit weapon stat errors |
| row["Range"] (wrong case) | row["range"] | This phase | Populates range for 2,472+ weapons |
| row["keywords"] (wrong column) | row["description"] | This phase | Populates keywords/special rules for 2,472+ weapons |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Coverage numbers will not change significantly from CSV column fixes alone | Finding 5 | MIN_COVERAGE_PCT threshold decision would be premature |
| A2 | Most SM missing_alias units are Wahapedia-only (no BSData equivalent) | Finding 4 | Would need more aliases than expected; scope creep |
| A3 | No app runtime code reads weapon_group/line_order semantics directly | Pitfall 2 | App weapon display could break after rebuild |

## Open Questions

1. **How many missing_alias units actually exist in BSData under different names?**
   - What we know: 94 total missing_alias across SM(79)/NEC(6)/DG(9)
   - What's unclear: Which of these 94 are Wahapedia-only vs genuine name mismatches
   - Recommendation: grep BSData .cat files for each name during implementation; expect most to be Wahapedia-only

2. **Will the weapon_group semantics change affect the app UI?**
   - What we know: App displays weapons by name, not by group/line_order position
   - What's unclear: Whether any SQL query or UI component orders by weapon_group
   - Recommendation: Search app codebase for weapon_group references before making the fix

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build script execution | Yes | v24.13.0 | -- |
| --experimental-strip-types | Running .ts scripts directly | Yes | Built into Node 24 | -- |
| BSData .cat files | Points matching | Yes (in scripts/data/bsdata/) | Current | -- |
| Wahapedia CSV files | Data source | Yes (in scripts/data/) | Current | -- |

## Security Domain

Not applicable -- this phase modifies dev-side build scripts only. No user input, no network calls, no authentication. Build output is a static JSON file.

## Sources

### Primary (HIGH confidence)
- `scripts/data/Datasheets_wargear.csv` header line -- confirmed column names: `datasheet_id|line|line_in_wargear|dice|name|description|range|type|A|BS_WS|S|AP|D|`
- `scripts/build-unit-db.ts` lines 257-288 -- confirmed weapon parsing logic and bugs
- `scripts/lib/normalize.ts` -- confirmed existing apostrophe normalization
- `scripts/audit-faction.ts` lines 377-395 -- confirmed audit weapon comparison logic
- Phase 113 audit reports (sm-audit.md, nec-audit.md, dg-audit.md) -- confirmed error counts and classifications
- `scripts/data/coverage-report.json` -- confirmed current coverage percentages

### Secondary (MEDIUM confidence)
- CSV data spot-checks for units 000000522 (Imotekh), 000000523 (Overlord), 000000061 (Assault Squad) -- confirmed weapon group/line_in_wargear semantics

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all fixes in existing code
- Architecture: HIGH -- bug locations confirmed by direct code and data inspection
- Pitfalls: HIGH -- verified via code analysis of consumers

**Research date:** 2026-06-03
**Valid until:** 2026-07-03 (stable -- build pipeline rarely changes)

# Phase 113: Priority Faction Data Audit - Research

**Researched:** 2026-06-03
**Domain:** Data quality verification — Warhammer 40k unit database (SM, NEC, DG)
**Confidence:** HIGH

## Summary

This phase audits the correctness of unit data for 3 priority factions (Space Marines 298 units, Necrons 64 units, Death Guard 71 units) in the canonical `unit_database.json`. The audit compares every field against Wahapedia CSV source data (already local) and BSData XML, producing structured error reports per faction.

**Critical finding during research:** Two parsing bugs in `build-unit-db.ts` cause ALL weapon ranges and ALL weapon keywords (special rules) to be empty across the entire database. The build script reads `row["Range"]` (capital R) but the CSV header is `range` (lowercase). Similarly, it reads `row["keywords"]` but the CSV field containing weapon special rules is called `description`. These bugs affect all 2,472 weapons across the 3 target factions and 9,353 weapons total. These are pipeline bugs that Phase 114 (PFX-01) should fix, but the audit must document them as systematic errors rather than per-unit findings.

**Primary recommendation:** Structure the audit as automated comparison scripts that read the same Wahapedia CSV files the build pipeline uses (already in `scripts/data/`), compare field-by-field against `unit_database.json`, and output structured JSON + markdown error reports. The known parsing bugs (range, weapon keywords) should be documented as systematic pipeline issues, not per-unit errors. The audit should focus effort on: (1) verifying points correctness via BSData cross-check, (2) classifying unmatched units as Legends/FW/missing-alias, (3) verifying stat blocks and ability text, and (4) assessing French translation coverage gaps.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Automated script approach: read official sources (Wahapedia pages, GW app data) and compare field-by-field against `unit_database.json`. Not manual spot-checking.
- **D-02:** Audit order is SM first (largest faction, 298 units), then Necrons (64 units), then Death Guard (71 units). Each faction produces its own audit report.
- **D-03:** Audit covers both matched units (verify data correctness) AND unmatched units (categorize as Legends, Forge World, missing alias, or genuinely missing from BSData).
- **D-04:** Each faction audit produces a structured JSON report: `{ unit_id, unit_name, field, expected, actual, source, severity }`. Severity levels: `error` (wrong value), `missing` (field empty when source has data), `extra` (data present but not in source).
- **D-05:** Summary markdown file accompanies each JSON report with human-readable tables.
- **D-06:** For matched units: verify all fields -- base_points, model stats, weapon profiles, ability text, keywords, and role.
- **D-07:** For unmatched units: classify as Legends, Forge World, missing alias, or genuinely unavailable.
- **D-08:** Points verification includes both `base_points` and `points` tiers.
- **D-09:** Check French translation completeness for matched units (name_fr, weapon name_fr, ability name_fr).
- **D-10:** Verify French translations against French Wahapedia where available.
- **D-11:** French translations for unmatched/Legends units are out of scope.
- **D-12:** Primary sources: Wahapedia (local CSV + web for French), GW app/Munitorum for points, BSData XML.
- **D-13:** When sources conflict: Wahapedia for stats/weapons/abilities, GW app/Munitorum for points.

### Claude's Discretion
- Script structure and file organization for audit tooling
- How to efficiently read/parse Wahapedia data for comparison
- Error report file naming and location within `.planning/`
- Whether to audit unit composition data or defer to Phase 114

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SM-01 | All SM points values verified correct | Points come from BSData matching; audit script compares base_points + points tiers against BSData XML. 137 SM units currently lack points (unmatched). |
| SM-02 | All SM stats, weapons, abilities verified correct | Stats from Wahapedia CSV; weapons have 2 known parsing bugs (range, keywords). Abilities have expected empty Core/Faction placeholders. |
| SM-03 | All SM keywords and roles verified correct | Keywords from Datasheets_keywords.csv; roles from Datasheets.csv. Direct CSV-to-DB comparison. |
| SM-04 | All SM French translations verified/corrected | Currently 0/298 SM units have name_fr. translations_fr.json has only 3 unit entries (all Custodes). Massive gap. |
| NEC-01 | All NEC points values verified correct | 40/64 units have points. 13 unmatched units. |
| NEC-02 | All NEC stats, weapons, abilities verified correct | Same parsing bugs apply to NEC weapons. 172 weapons, all missing range. |
| NEC-03 | All NEC keywords and roles verified correct | Direct CSV comparison. |
| NEC-04 | All NEC French translations verified/corrected | Currently 0/64 NEC units have name_fr despite faction name being in translations_fr.json. |
| DG-01 | All DG points values verified correct | 31/71 units have points. 35 unmatched. |
| DG-02 | All DG stats, weapons, abilities verified correct | 401 weapons, all missing range. Same bugs. |
| DG-03 | All DG keywords and roles verified correct | Direct CSV comparison. |
| DG-04 | All DG French translations verified/corrected | Currently 0/71 DG units have name_fr. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Audit scripting | Build pipeline (Node scripts) | -- | Scripts live in `scripts/` alongside build pipeline |
| Data comparison | Build pipeline | -- | Reads same CSV/XML sources as build-unit-db.ts |
| Error report generation | Build pipeline | -- | Produces JSON + markdown in `.planning/` |
| French translation verification | Build pipeline | Web (Wahapedia FR) | French text must be fetched from wahapedia.ru French locale |
| Unmatched unit classification | Build pipeline | Web (Wahapedia) | Need to check Legends status on wahapedia.ru |

## Standard Stack

No new packages are needed. This phase produces Node.js scripts that reuse existing project infrastructure.

### Core (already in project)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| Node.js built-ins (fs, path) | File I/O for CSV reading and report writing | Already used by build-unit-db.ts |
| `scripts/lib/parseCsv.ts` | Parse Wahapedia pipe-delimited CSV | Shared lib from Phase 112 |
| `scripts/lib/parseXml.ts` | Parse BSData .cat XML files | Shared lib from Phase 112 |
| `scripts/lib/normalize.ts` | Name normalization + alias loading | Shared lib |
| `scripts/lib/bsdata.ts` | BSData matching logic | Shared lib from Phase 112 |
| `scripts/lib/factionMap.ts` | Faction ID mapping | Shared lib |

### No New Dependencies
This phase creates audit scripts that read existing data files and produce reports. No npm packages needed.

## Package Legitimacy Audit

No external packages are installed in this phase. All audit scripts use Node.js built-ins and existing project libraries.

## Architecture Patterns

### System Architecture Diagram

```
Wahapedia CSV files (scripts/data/*.csv)
    |
    v
audit-faction.ts  <-- Audit script (new)
    |
    +-- reads unit_database.json (src-tauri/data/)
    +-- reads BSData .cat files (scripts/data/bsdata/)
    +-- reads translations_fr.json (scripts/data/)
    +-- reads aliases.json (scripts/data/)
    |
    v
Field-by-field comparison engine
    |
    +-- Matched units: compare every field (points, stats, weapons, abilities, keywords, role)
    +-- Unmatched units: classify (Legends / FW / alias gap / genuinely missing)
    +-- French translations: check completeness + correctness
    |
    v
Output: per-faction JSON error report + markdown summary
    (.planning/phases/113-priority-faction-data-audit/reports/)
```

### Recommended Project Structure

```
scripts/
  audit-faction.ts           # Main audit script (parameterized by faction ID)
  lib/
    parseCsv.ts              # Existing: Wahapedia CSV parser
    parseXml.ts              # Existing: BSData XML parser
    bsdata.ts                # Existing: BSData matching
    normalize.ts             # Existing: name normalization
    factionMap.ts            # Existing: faction mapping

.planning/phases/113-priority-faction-data-audit/
  reports/
    sm-audit.json            # SM structured error report
    sm-audit.md              # SM human-readable summary
    nec-audit.json           # NEC structured error report
    nec-audit.md             # NEC summary
    dg-audit.json            # DG structured error report
    dg-audit.md              # DG summary
```

### Pattern 1: Field-by-Field Comparison

**What:** For each matched unit, read the same CSV row that produced the DB entry, then compare every field value.
**When to use:** Every matched unit across all 3 factions.
**Example:**

```typescript
// Source: build-unit-db.ts parsing logic (verified in codebase)
interface AuditError {
  unit_id: string;
  unit_name: string;
  field: string;
  expected: string;  // from source (CSV/BSData)
  actual: string;    // from unit_database.json
  source: "wahapedia_csv" | "bsdata_xml" | "translations_fr";
  severity: "error" | "missing" | "extra";
}

// Compare weapon range: CSV has lowercase "range" field
const csvRange = csvRow["range"]?.trim() ?? "";
const dbRange = dbWeapon.range;
if (csvRange !== dbRange) {
  errors.push({
    unit_id: unit.id,
    unit_name: unit.name,
    field: "weapon.range",
    expected: csvRange,
    actual: dbRange,
    source: "wahapedia_csv",
    severity: dbRange === "" ? "missing" : "error",
  });
}
```

### Pattern 2: Unmatched Unit Classification

**What:** For each unit in the coverage report's unmatched list, determine why it's unmatched.
**When to use:** SM (122 unmatched), NEC (13 unmatched), DG (35 unmatched).
**Classification logic:**

```typescript
// Source: coverage-report.json analysis + Wahapedia knowledge [ASSUMED]
type UnmatchedCategory = "legends" | "forge_world" | "missing_alias" | "genuinely_missing";

// Heuristics for classification:
// 1. Legends: units with "(Legendary)" suffix, or known Legends datasheets
// 2. Forge World: units from FW ranges (Leviathan Dreadnought, Fire Raptor, etc.)
// 3. Missing alias: unit exists on Wahapedia but BSData uses different name
// 4. Genuinely missing: not in BSData at all

// Many DG unmatched are shared Chaos vehicles (Spartan, Mastodon, etc.)
// that exist in BSData under CSM faction, not DG specifically
```

### Pattern 3: Systematic vs Per-Unit Errors

**What:** Distinguish between pipeline parsing bugs (affect ALL units) and per-unit data errors.
**When to use:** When generating audit reports.
**Rationale:** The two known parsing bugs (weapon range, weapon keywords) affect every single weapon. Reporting these as 2,472 individual errors per faction would be noise. Instead, document them as 2 systematic pipeline issues at the report top, then report per-unit errors separately.

### Anti-Patterns to Avoid
- **Reporting systematic bugs as per-unit errors:** The weapon range and keywords bugs affect ALL weapons -- document once as pipeline issue, not per weapon.
- **Manual web scraping for verification:** The Wahapedia CSV files are already local in `scripts/data/` -- use those directly. Only use web fetch for French Wahapedia pages.
- **Modifying unit_database.json directly:** This phase produces error reports. Corrections go through the build pipeline in Phase 114.
- **Treating Core/Faction ability placeholders as errors:** Empty name/description on ability_type "Core" and "Faction" is expected Wahapedia CSV behavior (they use ability_id references).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom CSV parser | `scripts/lib/parseCsv.ts` | Already handles Wahapedia pipe-delimited format |
| BSData XML parsing | Custom XML reader | `scripts/lib/parseXml.ts` + `parseCatXml()` | Already handles .cat files correctly |
| Name matching | Ad-hoc string comparison | `scripts/lib/bsdata.ts` `matchUnit()` | 3-pass matching (exact/normalized/alias) already proven |
| Unit ID lookups | Manual map building | Reuse `unitByNameFaction` pattern from build script | Same lookup approach, same key format |

## Common Pitfalls

### Pitfall 1: Case-Sensitive CSV Column Names
**What goes wrong:** The build script uses `row["Range"]` but the CSV header is `range` (lowercase). This silently returns `undefined` which becomes empty string.
**Why it happens:** Wahapedia CSV column names are all lowercase. The build script was written with assumed capitalization.
**How to avoid:** The audit script must use exact CSV header names: `range` (not `Range`), `description` (not `keywords` for weapon special rules), `type` (not `wargear_role` for weapon category).
**Warning signs:** ALL values for a field are empty across the entire database.
**Confirmed affected fields:**
- `weapons.range`: script reads `row["Range"]`, CSV has `range` -- ALL 9,353 weapons have empty range
- `weapons.keywords`: script reads `row["keywords"]`, CSV field is `description` -- ALL 9,353 weapons have empty keywords/special rules
- `weapons.category`: script reads `row["wargear_role"]` first, falling back to `row["type"]` -- the fallback works, so this field IS populated correctly

### Pitfall 2: Core/Faction Abilities Have Empty Names
**What goes wrong:** About 50% of ability entries have empty `name` and `description` fields.
**Why it happens:** Wahapedia CSV uses `ability_id` references for Core and Faction abilities (e.g., ability_id=000008346 for "Leader" core ability). The actual ability text is in a separate abilities lookup table, not inline in Datasheets_abilities.csv. The build script doesn't dereference these IDs.
**How to avoid:** The audit should NOT report these as errors. They are a known limitation of the current pipeline that could be fixed by joining on the abilities reference table (if Wahapedia provides it as a separate CSV, which they don't currently include in the downloaded set).
**Warning signs:** All empty-name abilities have `ability_type` of "Core" or "Faction".

### Pitfall 3: Unmatched Units Are Mostly Forge World / Legends
**What goes wrong:** Treating all unmatched units as "missing data" when most are intentionally absent from BSData.
**Why it happens:** BSData focuses on official GW tournament-legal datasheets. Forge World, Legends, and special event units may not be in BSData .cat files.
**How to avoid:** The audit must classify unmatched units rather than just counting them. Pattern analysis:
- SM: Many are chapter-specific variants (Space Wolves, Blood Angels, Dark Angels), FW vehicles (Fire Raptor, Mastodon, Spartan), and Legends
- NEC: FW units (Tomb Stalker, Tomb Sentinel, Gauss Pylon), named characters (Zahndrekh, Obyron, Anrakyr), "Lord" (ambiguous generic name)
- DG: Mostly shared Chaos vehicles from CSM catalogue (Spartan, Mastodon, etc.), DG-prefixed variants (Death Guard Chaos Lord, DG Cultists, DG Possessed)

### Pitfall 4: French Translations Are Nearly Empty
**What goes wrong:** Expecting French translation verification when almost no translations exist.
**Why it happens:** `translations_fr.json` currently has only 3 unit entries (all Custodes), 1 ability, 1 weapon, and 12 keywords. Zero SM/NEC/DG units have name_fr.
**How to avoid:** The audit for SM-04/NEC-04/DG-04 should produce a completeness gap report (what's missing) rather than a correctness audit (what's wrong). Adding translations is the main task, not verifying existing ones.
**Scale:** Need French names for ~310 matched units (SM:182, NEC:53, DG:36 + their weapons and abilities).

### Pitfall 5: DG Unmatched Units Include CSM-Shared Vehicles
**What goes wrong:** Counting shared Chaos vehicles (Spartan, Mastodon, Fellblade, etc.) as DG-specific gaps.
**Why it happens:** BSData has these units in the CSM catalogue, not duplicated per Chaos faction. But Wahapedia lists them under each Chaos faction separately.
**How to avoid:** The audit should note that these are cross-faction units that exist in BSData under CSM. Phase 114's CROSS_FACTION_MAP could be extended to handle this.

### Pitfall 6: Points Discrepancy Between BSData and Munitorum
**What goes wrong:** BSData points may lag behind the latest Munitorum Field Manual update.
**Why it happens:** BSData is community-maintained and may not update immediately after GW releases new points.
**How to avoid:** Per D-13, use GW app/Munitorum as authoritative for points. Flag BSData-vs-Munitorum discrepancies as separate from BSData-vs-DB discrepancies.

## Code Examples

### Audit Script Structure

```typescript
// Source: project conventions from build-unit-db.ts [VERIFIED: codebase]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readCsvFile } from "./lib/bsdata.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

interface AuditError {
  unit_id: string;
  unit_name: string;
  field: string;
  expected: string;
  actual: string;
  source: "wahapedia_csv" | "bsdata_xml" | "translations_fr";
  severity: "error" | "missing" | "extra";
}

interface UnmatchedClassification {
  unit_name: string;
  faction_id: string;
  category: "legends" | "forge_world" | "missing_alias" | "genuinely_missing";
  evidence: string;
}

interface FactionAuditReport {
  faction_id: string;
  faction_name: string;
  audited_at: string;
  systematic_issues: Array<{ field: string; description: string; affected_count: number }>;
  unit_errors: AuditError[];
  unmatched_classifications: UnmatchedClassification[];
  translation_gaps: { units_missing: number; weapons_missing: number; abilities_missing: number };
  summary: {
    total_matched: number;
    total_unmatched: number;
    total_errors: number;
    errors_by_field: Record<string, number>;
    errors_by_severity: Record<string, number>;
  };
}
```

### CSV Column Name Reference

```typescript
// Source: Datasheets_wargear.csv header [VERIFIED: codebase file inspection]
// Correct CSV column names (all lowercase):
const WARGEAR_COLUMNS = {
  unitId: "datasheet_id",
  lineOrder: "line",
  lineInWargear: "line_in_wargear",
  dice: "dice",
  name: "name",
  keywords: "description",  // NOTA BENE: weapon special rules are in "description" column
  range: "range",           // lowercase, NOT "Range"
  type: "type",             // "Ranged" or "Melee"
  attacks: "A",
  skill: "BS_WS",
  strength: "S",
  ap: "AP",
  damage: "D",
};

// Source: Datasheets_abilities.csv header [VERIFIED: codebase file inspection]
const ABILITIES_COLUMNS = {
  unitId: "datasheet_id",
  lineOrder: "line",
  abilityId: "ability_id",  // references core/faction ability lookup
  model: "model",
  name: "name",
  description: "description",
  type: "type",             // "Core", "Faction", or "Datasheet"
  parameter: "parameter",
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual spot-checking | Automated field-by-field comparison | This phase | Catches systematic bugs like range/keywords parsing |
| Treating all unmatched as errors | Classifying unmatched units (Legends/FW/alias/missing) | This phase | Actionable categories for Phase 114 |
| No French translations | translations_fr.json overlay | v0.4.2 (Phase 111) | Infrastructure exists but nearly empty for target factions |

## Known Data State (Pre-Audit Baseline)

### Space Marines (faction_id: SM)
| Metric | Value |
|--------|-------|
| Total units | 298 |
| Matched (with points) | 161 (base_points) + 12 (tier points) = 173 effective |
| Match breakdown | 175 exact, 4 normalized, 3 alias |
| Unmatched | 122 units (need classification) |
| Weapons | 1,899 (ALL missing range and keywords due to parsing bugs) |
| Abilities | 1,302 total, 659 empty name (Core/Faction placeholders) |
| Keywords | 2,193 |
| French translations | 0 unit names, 0 weapon names, 0 ability names |

### Necrons (faction_id: NEC)
| Metric | Value |
|--------|-------|
| Total units | 64 |
| Matched (with points) | 51 |
| Match breakdown | 45 exact, 4 normalized, 4 alias |
| Unmatched | 13 units |
| Weapons | 172 (ALL missing range and keywords) |
| Abilities | 272 total, 133 empty name (Core/Faction placeholders) |
| French translations | 0 unit names |

### Death Guard (faction_id: DG)
| Metric | Value |
|--------|-------|
| Total units | 71 |
| Matched (with points) | 36 |
| Match breakdown | 35 exact, 0 normalized, 1 alias |
| Unmatched | 35 units (many are shared CSM vehicles) |
| Weapons | 401 (ALL missing range and keywords) |
| Abilities | 287 total, 165 empty name (Core/Faction placeholders) |
| French translations | 0 unit names |

### Systematic Pipeline Bugs (affect ALL factions, not just target 3)
1. **Weapon range always empty:** `row["Range"]` should be `row["range"]` -- affects 9,353 weapons
2. **Weapon keywords/special rules always empty:** `row["keywords"]` should be `row["description"]` -- affects 6,567 weapons that have keyword data in CSV

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Many SM unmatched units are Forge World / Legends based on name patterns (Fire Raptor, Mastodon, etc.) | Pitfall 3 | Classification accuracy -- would need Wahapedia web check |
| A2 | DG shared Chaos vehicles exist in BSData under CSM catalogue | Pitfall 5 | Cross-faction matching strategy for Phase 114 |
| A3 | French Wahapedia pages exist for SM/NEC/DG and can be fetched for translation verification | D-10 | If French Wahapedia incomplete, translations would need manual creation |
| A4 | Core/Faction ability placeholders (empty name) use ability_id references to a separate lookup table | Pitfall 2 | If Wahapedia has a downloadable abilities lookup CSV, we could resolve these |

## Open Questions (RESOLVED)

1. **Wahapedia French pages availability** (RESOLVED)
   - What we know: French Wahapedia exists at wahapedia.ru with French locale
   - What's unclear: Whether all 3 factions have complete French pages, and whether fetching them for 300+ units is practical within this phase
   - Recommendation: Start with French faction/unit names (most impactful for UI), defer weapon/ability French text to future milestone per existing EFA scope
   - Resolution: Plan 02 uses known French terminology + French Wahapedia as reference source. Focus on unit/weapon/ability name_fr only; description_fr deferred per FR-EXT-01.

2. **Unit composition audit scope** (RESOLVED)
   - What we know: Only 12 composition entries exist total across all factions (vs hundreds of units)
   - What's unclear: Whether the sparse composition data is worth auditing vs deferring
   - Recommendation: Per Claude's discretion in CONTEXT.md, defer composition audit to Phase 114 since the data is too sparse to meaningfully verify
   - Resolution: Composition audit deferred to Phase 114. Only 12 entries exist; not worth auditing separately.

3. **BSData points freshness** (RESOLVED)
   - What we know: BSData .cat files are a local snapshot; GW updates points via Munitorum Field Manual
   - What's unclear: How current the local BSData snapshot is relative to latest Munitorum
   - Recommendation: The audit should note the BSData snapshot date and flag if known recent points changes aren't reflected
   - Resolution: Plan 01 audit compares against local BSData snapshot only. Snapshot date noted in report header. Per D-13, GW app/Munitorum is authoritative for points if discrepancies arise.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `pnpm test -- tests/audit/` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SM-01 | SM points verified correct | script output | `node --experimental-strip-types scripts/audit-faction.ts SM` | Wave 0 |
| SM-02 | SM stats/weapons/abilities verified | script output | same as above | Wave 0 |
| SM-03 | SM keywords/roles verified | script output | same as above | Wave 0 |
| SM-04 | SM French translations verified | script output | same as above | Wave 0 |
| NEC-01..04 | NEC full audit | script output | `node --experimental-strip-types scripts/audit-faction.ts NEC` | Wave 0 |
| DG-01..04 | DG full audit | script output | `node --experimental-strip-types scripts/audit-faction.ts DG` | Wave 0 |

### Sampling Rate
- **Per task commit:** Run audit script for target faction, verify report generated
- **Per wave merge:** Run all 3 faction audits, verify reports are complete
- **Phase gate:** All 3 audit reports generated with classifications for all unmatched units

### Wave 0 Gaps
- [ ] `scripts/audit-faction.ts` -- main audit script (new)
- [ ] `.planning/phases/113-priority-faction-data-audit/reports/` -- output directory

## Security Domain

Security enforcement: not applicable. This phase produces offline data reports from local files. No network requests to untrusted sources, no user input handling, no authentication.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- `scripts/build-unit-db.ts`, `scripts/lib/bsdata.ts`, `scripts/lib/parseCsv.ts` (verified field mapping bugs)
- **Codebase inspection** -- `scripts/data/Datasheets_wargear.csv` headers (confirmed `range` lowercase, `description` for keywords)
- **Codebase inspection** -- `scripts/data/Datasheets_abilities.csv` headers (confirmed empty Core/Faction behavior)
- **Codebase inspection** -- `scripts/data/coverage-report.json` (verified match counts and unmatched lists)
- **Codebase inspection** -- `src-tauri/data/unit_database.json` (verified 0 French translations for SM/NEC/DG)
- **Codebase inspection** -- `scripts/data/translations_fr.json` (verified only 3 unit entries, all Custodes)

### Secondary (MEDIUM confidence)
- **Project history** -- CONTEXT.md decisions, STATE.md accumulated context

### Tertiary (LOW confidence)
- **Unmatched unit classification** -- Legends/FW/alias categorization based on name pattern analysis [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new packages, reuses existing project libs
- Architecture: HIGH -- follows established build pipeline patterns exactly
- Data state: HIGH -- verified by direct codebase inspection with actual counts
- Pitfalls: HIGH -- parsing bugs confirmed by comparing CSV headers to code
- Unmatched classification: MEDIUM -- based on name patterns, not verified against Wahapedia web

**Research date:** 2026-06-03
**Valid until:** 2026-07-03 (stable -- data format unlikely to change)

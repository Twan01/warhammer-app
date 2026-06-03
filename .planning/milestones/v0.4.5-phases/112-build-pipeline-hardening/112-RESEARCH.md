# Phase 112: Build Pipeline Hardening - Research

**Researched:** 2026-06-02
**Domain:** Dev-side TypeScript build tooling (Node.js scripts, no app runtime changes)
**Confidence:** HIGH — all findings from direct codebase inspection

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Coverage report refines Step 10: include matched vs unmatched counts AND a match-method column (exact/normalized/alias) per faction.
- **D-02:** Coverage report also prints unmatched unit names per faction (for Phase 113 auditor).
- **D-03:** Extend determinism to ALL array outputs — sort units by id, points by (unit_id, model_count), weapons by (unit_id, weapon_group, line_order), etc. before JSON serialization.
- **D-04:** Extract `matchUnit()`, `readBsdataCatFiles()`, `parseBsdataModelCounts()`, and `readCsv()` into `scripts/lib/`. These are duplicated between the two scripts and have diverged.
- **D-05:** After extraction, `update-unit-database.ts` imports from shared lib and uses the same matching logic (multi-pass + aliases + sub_faction) as `build-unit-db.ts`.
- **D-06:** Keep `loadTranslationsFr()` in `build-unit-db.ts` only — the update script does not need translations.
- **D-07:** Alias validation at build time: warn on unused aliases (BSData name not in any .cat) and unknown targets (Wahapedia name matches no unit). Warnings do NOT fail the build.
- **D-08:** Print summary line "Alias validation: N used, M unused, K unknown target".
- **D-09:** `MIN_COVERAGE_PCT` constant at top of `build-unit-db.ts` (default 90%). Overall coverage below threshold → `process.exit(1)`.
- **D-10:** Threshold is overall (all factions combined), not per-faction.

### Claude's Discretion

- Exact function signatures and module boundaries within `scripts/lib/` — Claude picks cleanest API.
- Sort key choices for deterministic output arrays — use natural ordering (id, then sub-keys).
- Whether to add `--verbose` flag or always print full details.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BPH-01 | Build script prints per-faction coverage report showing matched/unmatched unit counts after BSData matching | Coverage table already exists in Step 10 (lines 586–611); needs match-method column and per-faction unmatched unit listing |
| BPH-02 | Build script uses `files.sort()` on BSData directory reads for deterministic, reproducible builds | `files.sort()` already exists in `readBsdataCatFiles()`; determinism gap is in the output JSON arrays — units, points, weapons not sorted before serialization |
| BPH-03 | Shared BSData parsing logic extracted to `scripts/lib/` module imported by both scripts | Four functions to extract; update script has older, simpler versions that have diverged |
| BPH-04 | Build script validates `aliases.json` entries at build time — warns on unused and unknown | aliases.json has 44 entries; validation logic is entirely missing from both scripts |
| BPH-05 | Build script exits non-zero when overall BSData points coverage drops below configured threshold | `process.exit(1)` pattern already used for CSV missing / unit count < 100; threshold constant missing |

</phase_requirements>

---

## Summary

Phase 112 is a pure dev-tooling hardening pass on `scripts/build-unit-db.ts` and `scripts/update-unit-database.ts`. No app runtime code, no migrations, no UI changes. All five requirements modify one or both of these scripts.

The codebase is already well-structured with a `scripts/lib/` directory containing five shared modules (`types.ts`, `parseCsv.ts`, `parseXml.ts`, `normalize.ts`, `factionMap.ts`). However, four helper functions that belong in shared lib have not yet been extracted: `matchUnit()`, `readBsdataCatFiles()`, `parseBsdataModelCounts()`, and `readCsv()`. The update script (`update-unit-database.ts`) reimplements these locally with a notably simpler, older version — specifically, it lacks multi-pass matching (only does exact key lookup), lacks alias support, lacks sub_faction population, and lacks cross-faction fallback. This divergence is the core problem BPH-03 solves.

The coverage report infrastructure is already 90% complete. The Step 10 table (lines 586–611) prints faction-level stats, but is missing two things required by D-01/D-02: (a) a "match method" breakdown column (exact/normalized/alias) per faction, and (b) the list of unmatched unit names printed per faction. The overall `unmatched_units` array already exists in `CoverageReport` and is written to `coverage-report.json` — the gap is printing it grouped by faction during the build.

Determinism is partially solved: `readBsdataCatFiles()` already sorts the file list. The gap (BPH-02) is that the final output arrays (`units`, `points`, `weapons`, `models`, `abilities`, `keywords`, `composition`) are assembled in parse order rather than sorted before `JSON.stringify`. Since Wahapedia CSVs are stable, this is unlikely to cause issues in practice, but two builds from differently-ordered OS directory traversals would produce different hashes.

**Primary recommendation:** Implement in this order: BPH-03 (lib extraction) first because BPH-01 and BPH-05 both read match-tracking state that currently lives inside the main() loop, and extraction gives a natural place to return it. Then BPH-01 (enhanced coverage table), BPH-02 (sort output arrays), BPH-04 (alias validation), BPH-05 (threshold exit).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Coverage reporting | Build script (build-unit-db.ts) | coverage-report.json (static artifact) | Build-time computation; JSON consumed by app's Data Health SQL queries |
| Deterministic output | Build script serialization | — | JSON.stringify call ordering; sort before stringify |
| Shared parsing logic | scripts/lib/ modules | Both entry-point scripts | Library pattern already established; 5 modules already there |
| Alias validation | Build script (build-unit-db.ts) | — | Requires both BSData names and Wahapedia unit map; both in scope at build time |
| Coverage failure gate | Build script exit code | CI/CD (if any) | process.exit(1) pattern already established for fatal checks |

---

## Detailed Code Findings

### BPH-01: Coverage Report Enhancement

**Current state (build-unit-db.ts lines 530–611):**

The existing Step 10 table prints:
```
Faction                                 Units  Points  Coverage
Space Marines                             298     173     58.1%  [!]
```

What's missing per D-01/D-02:
1. A "Matched" column broken down by method (exact/normalized/alias) per faction — currently only global totals are tracked (lines 394–421: `exactMatches`, `normalizedMatches`, `aliasMatches` are global counters, not per-faction)
2. Per-faction listing of unmatched unit names — `unmatchedUnits` array is built per faction (lines 562–566) but only the total count is printed (line 610); the names are written to coverage-report.json but not printed to stdout

**What needs changing:**

The match tracking loop (lines 396–447) increments three global counters. To support per-faction breakdown, these counters need to become per-faction maps (keyed by `factionId`). The match detection logic currently uses a heuristic that has a subtle bug: it checks `unitByNameFaction.has(exactKey)` AFTER `matchUnit()` has already returned, meaning it re-derives the match method rather than tracking it during matching. A cleaner approach is to have `matchUnit()` return `{ unit, method: "exact" | "normalized" | "alias" | null }` instead of `UdbUnitRow | undefined`.

**FactionCoverage type extension needed:**

```typescript
// Add to existing FactionCoverage in scripts/lib/types.ts
export interface FactionCoverage {
  faction_id: string;
  faction_name: string;
  total_units: number;
  units_with_points: number;
  coverage_pct: number;
  // New fields for BPH-01:
  matched_exact: number;
  matched_normalized: number;
  matched_alias: number;
  unmatched_names: string[];   // For D-02: printed per faction to stdout
}
```

**CoverageReport update:**

The existing `unmatched_units: Array<{name: string; faction_id: string}>` at the report level can be kept for the JSON (app compatibility), but per-faction `unmatched_names` should live inside `FactionCoverage` for the new stdout table.

**Console table format for D-02:**

After the summary table, for each faction with unmatched units, print:
```
  Space Marines (125 unmatched):
    - Bladeguard Ancient (exact name not in BSData)
    - Captain in Gravis Armour
    ...
```

This allows Phase 113 auditor to see exactly which units are missing without consulting the JSON file.

---

### BPH-02: Deterministic Builds

**Current determinism status:**

- BSData file iteration: SOLVED — `files.sort()` at line 117 in `readBsdataCatFiles()`.
- Wahapedia CSV parsing: STABLE — CSV files have stable row order; same input = same output.
- Output JSON arrays: NOT SORTED — assembled in parse order.

**Arrays that must be sorted before `JSON.stringify` (line 690 area):**

| Array | Sort Key | Current Order |
|-------|----------|---------------|
| `units` | `unit.id` (string sort) | Wahapedia CSV parse order |
| `points` | `(unit_id, model_count)` | BSData file + parse order |
| `weapons` | `(unit_id, weapon_group, line_order)` | Wahapedia CSV parse order |
| `models` | `(unit_id, line_order)` | Wahapedia CSV parse order |
| `abilities` | `(unit_id, line_order)` | Wahapedia CSV parse order |
| `keywords` | `(unit_id, keyword)` | Wahapedia CSV parse order |
| `composition` | `unit_id` | BSData file parse order |
| `factions` | `faction.id` | Wahapedia CSV parse order |

**Implementation:** Add sort calls immediately before the `output` object assembly (currently around line 693). Sorting mutates the arrays in place, which is fine since they're about to be serialized.

**Content hash:** The hash on line 690 is computed BEFORE the sort. After implementing BPH-02, the hash should be computed on the SORTED data to ensure the hash itself is deterministic. Currently:
```typescript
const hash = createHash("sha256").update(JSON.stringify({ factions, units, weapons, points, abilities, keywords, composition })).digest("hex").slice(0, 8);
```
This needs to run after the sort calls.

**Why this matters for Phase 113:** The audit phase will be running `build:udb` repeatedly as it fixes data. Byte-identical output from identical inputs means the content hash won't change spuriously, making `git diff` on `unit_database.json` meaningful.

---

### BPH-03: Shared Library Extraction

**Functions to extract to `scripts/lib/`:**

#### 1. `readCsv()` — currently duplicated verbatim

build-unit-db.ts lines 78–82:
```typescript
function readCsv(filename: string): Record<string, string>[] {
  const filepath = join(DATA_DIR, filename);
  const raw = readFileSync(filepath, "utf-8");
  return parseWahapediaCsv(raw);
}
```

update-unit-database.ts lines 97–101: **Identical copy.**

**Proposed shared signature:**
```typescript
// scripts/lib/parseCsv.ts — add alongside parseWahapediaCsv
export function readCsvFile(dataDir: string, filename: string): Record<string, string>[] {
  const filepath = join(dataDir, filename);
  const raw = readFileSync(filepath, "utf-8");
  return parseWahapediaCsv(raw);
}
```

Note: `DATA_DIR` is a script-level constant, so the shared function must accept `dataDir` as a parameter.

#### 2. `readBsdataCatFiles()` — diverged

build-unit-db.ts lines 104–139: Full version with:
- Warning logs when directory/files missing
- `FACTION_MAP[catalogueName] ?? null` lookup
- Returns `{ xml, factionId, catalogueName }[]`

update-unit-database.ts lines 103–125: Simpler version with:
- Silent return `[]` on missing dir/files (no warnings)
- Same `FACTION_MAP` lookup
- Same return type

**Resolution:** The build script's version (with warnings) is correct for a build tool. The update script should use the same function. The difference in warning verbosity is intentional for the build script — consolidate to the verbose version and have both scripts use it.

**Proposed shared signature:**
```typescript
// scripts/lib/parseXml.ts or scripts/lib/bsdata.ts (new file)
export function readBsdataCatFiles(
  bsdataDir: string,
  options?: { silent?: boolean }
): Array<{ xml: string; factionId: string | null; catalogueName: string }>
```

#### 3. `parseBsdataModelCounts()` — nearly identical

Both scripts have the same implementation. Extract directly.

**Proposed shared signature:**
```typescript
export function parseBsdataModelCounts(
  catFiles: Array<{ xml: string; factionId: string | null; catalogueName: string }>
): BsdataModelCount[]
```

Note: This function creates a `new DOMParser()` internally. The DOMParser polyfill (`globalThis.DOMParser = DOMParser`) must be set by the entry-point script BEFORE calling this function. The existing `parseXml.ts` module already has this same constraint (documented in its header comment). Add the same warning to any new home for this function.

#### 4. `matchUnit()` — significant divergence

build-unit-db.ts lines 157–184: **3-pass matching** (exact → normalized → alias), returns `UdbUnitRow | undefined`.

update-unit-database.ts: **No `matchUnit()` function at all.** The update script's `buildUnitDatabase()` does only a single direct `unitByNameFaction.get(key)` lookup at line 291:
```typescript
const key = bsdataUnit.datasheet_name.toLowerCase() + ":" + bsdataUnit.faction_id;
const unit = unitByNameFaction.get(key);
if (!unit) continue;
```

This means `update-unit-database.ts` has been silently undermatching — it finds fewer units than `build-unit-db.ts` because it skips the normalized and alias passes.

**For BPH-01, `matchUnit()` should return the match method:**
```typescript
export type MatchMethod = "exact" | "normalized" | "alias";
export interface MatchResult {
  unit: UdbUnitRow;
  method: MatchMethod;
}
export function matchUnit(
  bsdataName: string,
  factionId: string,
  aliases: Record<string, string>,
  unitMap: Map<string, UdbUnitRow>
): MatchResult | undefined
```

This signature change is the cleanest way to return both the unit and the method without re-deriving it post-hoc.

**Where to put the shared functions:**

Option A: New file `scripts/lib/bsdata.ts` — houses `readBsdataCatFiles`, `parseBsdataModelCounts`, `matchUnit`, and `readCsvFile`. This keeps parseXml.ts focused on pure XML parsing and avoids mixing filesystem concerns with parse concerns.

Option B: Extend `scripts/lib/parseXml.ts` with the filesystem-level functions.

Recommendation (Claude's discretion): **Option A** — create `scripts/lib/bsdata.ts`. The filesystem reading functions (`readBsdataCatFiles`, `readCsvFile`) have different concerns from the XML parsing functions in `parseXml.ts`. `matchUnit` is a matching algorithm that depends on `normalize.ts`. A dedicated `bsdata.ts` is the cleanest boundary.

**Impact on update-unit-database.ts:**

After extraction, `buildUnitDatabase()` in the update script needs to:
1. Import `matchUnit`, `readBsdataCatFiles`, `parseBsdataModelCounts` from `scripts/lib/bsdata.ts`
2. Import `loadAliases` from `scripts/lib/normalize.ts` (not currently imported)
3. Import `SUB_FACTION_MAP`, `CROSS_FACTION_MAP` from `scripts/lib/factionMap.ts` (not currently imported)
4. Replace the simple `unitByNameFaction.get(key)` with `matchUnit()` calls
5. Add cross-faction fallback logic (same as build script lines 407–410)
6. Add sub_faction population (same as build script lines 425–427)

The update script's `UdbUnitWeaponRow` and `UdbUnitAbilityRow` types in its local return objects are also missing `name_fr`/`description_fr`/`keyword_fr` fields compared to the type definitions. These become visible once the shared types are enforced — minor TypeScript fix but worth noting.

---

### BPH-04: Alias Validation

**Current aliases.json state:** 44 entries mapping BSData names → Wahapedia names.

**Format:** `{ "BSData name": "Wahapedia name" }` — keys are BSData names, values are Wahapedia names.

**What validation needs to check:**

1. **Unused aliases** — BSData name (key) does not appear as `datasheet_name` in any parsed `.cat` file. This means the alias was added for a unit that has since been renamed or removed from BSData. The alias is dead weight.

2. **Unknown targets** — Wahapedia name (value) does not match any unit in `unitByNameFaction`. This means the alias is pointing to a unit that doesn't exist in Wahapedia data.

**When to run validation:** After all data is parsed (after Step 8, before Step 9 or as a new Step 8c). The required inputs are:
- `aliases` — already loaded at line 375
- BSData names from all parsed cat files — need to collect `bsdataUnit.datasheet_name` across all catFiles
- `unitByNameFaction` — already built at line 262

**Implementation approach:**

```typescript
// Step 8c: Alias validation (BPH-04)
function validateAliases(
  aliases: Record<string, string>,
  allBsdataNames: Set<string>,
  unitByNameFaction: Map<string, UdbUnitRow>
): { used: number; unused: string[]; unknownTargets: string[] } {
  const unused: string[] = [];
  const unknownTargets: string[] = [];
  let used = 0;

  for (const [bsdataName, wahapediaName] of Object.entries(aliases)) {
    const isInBsdata = allBsdataNames.has(bsdataName);
    // Check if target exists in any faction
    const targetExists = [...unitByNameFaction.keys()]
      .some(key => key.startsWith(wahapediaName.toLowerCase() + ":"));

    if (!isInBsdata) {
      unused.push(bsdataName);
    } else {
      used++;
    }
    if (!targetExists) {
      unknownTargets.push(`"${bsdataName}" -> "${wahapediaName}"`);
    }
  }

  return { used, unused, unknownTargets };
}
```

**Collecting `allBsdataNames`:** Requires a pass over all `parseCatXml()` results to gather unique `datasheet_name` values. The parsing already happens in Step 8a — the set just needs to be accumulated alongside the points loop.

**Warning output format** (per D-08):
```
Alias validation: 38 used, 3 unused, 2 unknown target
  UNUSED (BSData name not found in any .cat file):
    - "Shadow Spectre Exarch" (target: "Shadow Spectres")
  UNKNOWN TARGET (Wahapedia name not found):
    - "Old Name" -> "New Wahapedia Name"
```

Warnings to `console.warn`, summary to `console.log`. Neither fails the build.

---

### BPH-05: Coverage Failure Threshold

**Current exit behavior in build-unit-db.ts:**

Two `process.exit(1)` calls exist:
1. Line 209: Missing required CSV file
2. Line 521: `units.length < 100`

**New threshold check:**

Add a `MIN_COVERAGE_PCT` constant at the top of the file (after imports, before DATA_DIR definitions):

```typescript
/** Minimum overall BSData points coverage required for a successful build. */
const MIN_COVERAGE_PCT = 90;
```

**Where to add the check:** After Step 10 computes `overallCoveragePct` and prints the table. Specifically, after line 611 (the unmatched units count line). The exact location:

```typescript
// BPH-05: Fail build if coverage below threshold
if (overallCoveragePct < MIN_COVERAGE_PCT) {
  console.error(
    `ERROR: Overall coverage ${overallCoveragePct.toFixed(1)}% is below minimum threshold of ${MIN_COVERAGE_PCT}%`
  );
  console.error(
    `This indicates a regression. Check BSData .cat files or Wahapedia CSV freshness.`
  );
  process.exit(1);
}
```

**Important: Current coverage is 60.1%** (from coverage-report.json). The constant is 90% per the user decision, but this will cause the build to fail immediately at current data state. This is intentional — the threshold is aspirational and is expected to be calibrated after Phase 113/114 audit and pipeline fixes improve coverage. The CONTEXT.md sets 90% as the default; the developer can lower it temporarily while pipeline work is ongoing.

The plan should document this explicitly: the threshold should be set to the CURRENT overall coverage level initially (or to 55% as a safe floor below current 60.1%), then raised as Phase 113/114 work improves coverage. The constant is in one place so it's trivial to adjust.

**Recommendation for planner:** Set `MIN_COVERAGE_PCT = 55` as the initial value (safely below current 60.1%), with a comment explaining it should be raised after pipeline improvements. The user can override in review.

---

## Current State of Output Arrays (Determinism Analysis)

The output JSON written at line 714 serializes arrays in this order (from `UnitDatabaseJson`):
```
factions, units, models, weapons, abilities, keywords, points, composition
```

Currently, Wahapedia CSV row order drives `units`, `models`, `weapons`, `abilities`, `keywords`. BSData `.cat` file + XML parse order drives `points` and `composition`. Since `.cat` files are sorted (BPH-02 is partially done), BSData order is already stable. The gap is Wahapedia CSV row order vs. a canonical sorted order.

In practice, Wahapedia CSVs are consistent between runs (they're static files in `scripts/data/`), so non-determinism only manifests if CSVs are updated or if the OS returns directory entries in different order. The hash (content-addressed version) already handles "did the data change?" detection — but byte-identity is still valuable for `git diff` readability.

**Sort implementation (before output object assembly):**

```typescript
// BPH-02: Sort all output arrays for deterministic byte-identical output
factions.sort((a, b) => a.id.localeCompare(b.id));
units.sort((a, b) => a.id.localeCompare(b.id));
models.sort((a, b) => a.unit_id.localeCompare(b.unit_id) || a.line_order - b.line_order);
weapons.sort((a, b) =>
  a.unit_id.localeCompare(b.unit_id) || a.weapon_group - b.weapon_group || a.line_order - b.line_order
);
abilities.sort((a, b) => a.unit_id.localeCompare(b.unit_id) || a.line_order - b.line_order);
keywords.sort((a, b) => a.unit_id.localeCompare(b.unit_id) || a.keyword.localeCompare(b.keyword));
points.sort((a, b) => a.unit_id.localeCompare(b.unit_id) || a.model_count - b.model_count);
composition.sort((a, b) => a.unit_id.localeCompare(b.unit_id));
```

Then recompute the hash AFTER sorting.

---

## Architecture Patterns

### Standard Pattern: Shared Library Module

The existing `scripts/lib/` pattern is:
- No default exports — named exports only
- No filesystem side effects at import time
- Pure functions where possible; filesystem functions accept paths as parameters
- Type definitions in `types.ts` — imported by all other modules
- DOMParser polyfill documented in module header; must be set by entry-point before use

New `scripts/lib/bsdata.ts` should follow the same pattern.

### Standard Pattern: Graceful Degrade

Established by `loadAliases()` and `loadTranslationsFr()`:
- Missing optional file → return empty/null + `console.warn`
- Malformed file → return empty/null + `console.warn`
- Never throw for optional inputs

`readBsdataCatFiles()` already follows this for the directory. The shared version should maintain the warning behavior from the build script version (not the silent version from the update script).

### Standard Pattern: process.exit(1) for Fatal Conditions

Only for truly fatal conditions: missing required input, corrupt data that makes the output meaningless. The pattern is always:
1. `console.error("ERROR: ...")` — specific message
2. `console.error("...")` — remediation hint
3. `process.exit(1)`

Coverage threshold failure fits this pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| String sorting | Custom comparator | `Array.sort()` + `String.localeCompare()` |
| Composite key sort | Manual hash | Chained `||` in comparator |
| JSON determinism | JSON canonicalization library | Sort arrays before `JSON.stringify` |
| CSV parsing | Custom regex parser | Already using `parseWahapediaCsv` from `parseCsv.ts` |
| XML parsing | Custom XML parser | Already using `parseCatXml` from `parseXml.ts` |

**Key insight:** This phase is about reorganization and instrumentation, not new algorithms. Every capability needed already exists in the codebase — the work is wiring it together correctly.

---

## Common Pitfalls

### Pitfall 1: Hash Computed Before Sort

**What goes wrong:** BPH-02 adds sort calls before JSON assembly, but the hash computation (line 690) computes BEFORE the sort. The resulting hash is still non-deterministic.

**How to avoid:** Move the sort calls to BEFORE the hash computation. Verify by running the build twice from identical inputs and checking that `version` fields match.

**Warning sign:** Two builds from identical input produce different version hashes.

---

### Pitfall 2: matchUnit Return Type Change Breaks Callers

**What goes wrong:** Changing `matchUnit()` to return `MatchResult | undefined` (instead of `UdbUnitRow | undefined`) breaks all call sites in both scripts. There are two call sites in `build-unit-db.ts` (lines 405 and 409 for cross-faction fallback) and the update script's `buildUnitDatabase()` after BPH-03.

**How to avoid:** Update all call sites in the same task as the function signature change. The pattern becomes:
```typescript
const result = matchUnit(...);
if (!result) continue;
const { unit, method } = result;
```

**Warning sign:** TypeScript compilation error — `unit` is not a property of `UdbUnitRow`.

---

### Pitfall 3: update-unit-database.ts Missing Type Fields

**What goes wrong:** The update script's local weapon/ability objects omit `name_fr`, `description_fr`, `keyword_fr` fields (lines 234–248, 258–263). After BPH-03, when it imports from shared types, TypeScript will flag these as missing required properties.

**How to avoid:** Add the missing fields (set to `null`) when constructing the objects in the update script, or note that the update script intentionally omits translation fields (D-06: no French overlay in update script) and cast appropriately.

---

### Pitfall 4: Alias Validation Needs All BSData Names, Not Just Matched Names

**What goes wrong:** Collecting "all BSData names seen" only from units that successfully matched to Wahapedia units. An unused alias is one whose BSData name doesn't appear in BSData at all — regardless of whether it matched.

**How to avoid:** Collect BSData names from ALL `parseCatXml()` results (all `bsdataUnit.datasheet_name` values), before the matching filter. The name collection loop must run even if `matchUnit()` returns undefined.

---

### Pitfall 5: Current Coverage is 60.1% — 90% Threshold Will Fail Immediately

**What goes wrong:** Setting `MIN_COVERAGE_PCT = 90` means the build fails on first run, before any Phase 113 audit work is done.

**How to avoid:** Set `MIN_COVERAGE_PCT = 55` (safely below current 60.1%) as the initial value. Add a comment:
```typescript
// Current coverage: ~60%. Raise this threshold as Phase 113/114 audit work improves coverage.
// Target: 90% after all faction audits complete.
const MIN_COVERAGE_PCT = 55;
```

The planner should document this explicitly so the developer knows to raise it after pipeline improvements.

---

### Pitfall 6: update-unit-database.ts buildUnitDatabase() Produces Non-deterministic Output

**What goes wrong:** After BPH-03 makes the update script use shared `matchUnit()`, it gains more matches — but its output arrays are also unsorted. If BPH-02 is applied only to `build-unit-db.ts`, the two scripts produce differently-ordered JSON, which defeats the diff comparison.

**How to avoid:** Apply the same sort calls to the update script's output assembly in `buildUnitDatabase()`. The diff comparison works on unit IDs and names, not raw array order, but the content hash will differ.

---

## Code Examples

### Proposed `scripts/lib/bsdata.ts` interface

```typescript
// Source: direct codebase analysis — new file to create

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseWahapediaCsv } from "./parseCsv.ts";
import { parseCatXml, extractModelCounts } from "./parseXml.ts";
import { normalizeName } from "./normalize.ts";
import { FACTION_MAP } from "./factionMap.ts";
import type { BsdataModelCount, UdbUnitRow } from "./types.ts";

export type MatchMethod = "exact" | "normalized" | "alias";

export interface MatchResult {
  unit: UdbUnitRow;
  method: MatchMethod;
}

export function readCsvFile(dataDir: string, filename: string): Record<string, string>[] { ... }

export function readBsdataCatFiles(
  bsdataDir: string
): Array<{ xml: string; factionId: string | null; catalogueName: string }> { ... }

export function parseBsdataModelCounts(
  catFiles: Array<{ xml: string; factionId: string | null; catalogueName: string }>
): BsdataModelCount[] { ... }

export function matchUnit(
  bsdataName: string,
  factionId: string,
  aliases: Record<string, string>,
  unitMap: Map<string, UdbUnitRow>
): MatchResult | undefined { ... }
```

### Coverage table with match method column (BPH-01)

```typescript
// Extended per-faction table format:
// Faction                              Units  Matched  Exact  Norm  Alias  Coverage
// Space Marines                          298      173    140    25      8     58.1% [!]

console.log(
  "  " +
  "Faction".padEnd(40) +
  "Units".padStart(7) +
  "Matched".padStart(9) +
  "Exact".padStart(7) +
  "Norm".padStart(6) +
  "Alias".padStart(7) +
  "Coverage".padStart(10)
);
```

### Alias validation summary (BPH-04)

```typescript
const validation = validateAliases(aliases, allBsdataNames, unitByNameFaction);
if (validation.unused.length > 0 || validation.unknownTargets.length > 0) {
  if (validation.unused.length > 0) {
    console.warn("  UNUSED aliases (BSData name not in any .cat file):");
    for (const name of validation.unused) console.warn("    - " + name);
  }
  if (validation.unknownTargets.length > 0) {
    console.warn("  UNKNOWN TARGET aliases (Wahapedia name not found):");
    for (const entry of validation.unknownTargets) console.warn("    - " + entry);
  }
}
console.log(`  Alias validation: ${validation.used} used, ${validation.unused.length} unused, ${validation.unknownTargets.length} unknown target`);
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest section) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| BPH-01 | Coverage table includes match method breakdown | Manual / stdout inspection | Build script output; no unit test needed |
| BPH-02 | Two builds from identical inputs produce byte-identical JSON | Manual | Run `pnpm build:udb` twice; compare hashes |
| BPH-03 | Shared lib functions importable by both scripts | TypeScript compilation | `pnpm build` (tsc check) catches type errors |
| BPH-04 | Alias validation prints warnings for unused/unknown | Manual / stdout inspection | Introduce a known-bad alias entry, run build |
| BPH-05 | Exit code 1 when coverage below threshold | Manual | Temporarily set `MIN_COVERAGE_PCT = 100`, verify exit code 1 |

**Note:** This phase is dev-tooling only (build scripts). Runtime tests (`pnpm test`) test the app codebase, not the build scripts. Verification is by running `pnpm build:udb` and inspecting stdout/exit code. The `pnpm build` (TypeScript check) will catch any type errors introduced by the refactor.

### Wave 0 Gaps

None — no new test files needed. Verification is manual inspection of script output.

---

## Environment Availability

This phase is code-only changes to TypeScript scripts. No external tools beyond what's already used.

| Dependency | Required By | Available | Notes |
|------------|-------------|-----------|-------|
| Node.js `--experimental-strip-types` | Running scripts | Available | Already in use via `pnpm build:udb` |
| `scripts/data/*.csv` (Wahapedia) | Build script | Present | Confirmed by `ls scripts/data/` |
| `scripts/data/bsdata/*.cat` | BPH-05 coverage check | Present | `bsdata/` dir exists |
| `scripts/data/aliases.json` | BPH-04 | Present | 44 entries confirmed |

---

## Security Domain

Not applicable — this phase is a local dev tooling script with no network access, no user input, no auth, and no runtime app code changes.

---

## Open Questions

1. **Should `MIN_COVERAGE_PCT` be in CONTEXT.md as 90% but initialized to 55%?**
   - What we know: Current coverage is 60.1% (from coverage-report.json). 90% is the user's stated target. The build will immediately fail at 90%.
   - Recommendation: Initialize to 55% with an explanatory comment; document in the plan that Phase 113/114 should raise it after audit.

2. **Should the unmatched unit list per faction be gated behind a `--verbose` flag?**
   - What we know: D-02 says print unmatched unit names per faction. With 683 unmatched units across 25 factions, this is substantial stdout output.
   - Recommendation: Always print, no flag needed. The Phase 113 auditor needs this output for every build. The faction table shows counts; names follow in a compact list. Developers who don't need it can pipe through `grep`.

3. **Should `readCsvFile()` live in `parseCsv.ts` or in new `bsdata.ts`?**
   - What we know: It wraps `parseWahapediaCsv` + filesystem read. It's a filesystem concern, not a pure parse concern.
   - Recommendation: Put in `bsdata.ts` alongside the other filesystem-reading functions. `parseCsv.ts` stays pure (string in → parsed rows out).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Current overall coverage is 60.1% (from coverage-report.json built 2026-06-01) | BPH-05 | If coverage has changed since that build, initial `MIN_COVERAGE_PCT` floor may need adjustment |
| A2 | `pnpm build` runs TypeScript type checking (`tsc`) before Vite build | Validation Architecture | If tsc is not strict, type errors from refactor may not be caught at build time |

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `scripts/build-unit-db.ts` — complete read, 726 lines; all line references verified
- `scripts/update-unit-database.ts` — complete read, 655 lines; divergence fully catalogued
- `scripts/lib/types.ts` — current type definitions for `FactionCoverage`, `CoverageReport`
- `scripts/lib/normalize.ts` — `normalizeName()` and `loadAliases()` signatures
- `scripts/lib/parseXml.ts` — `parseCatXml()`, `extractModelCounts()` signatures
- `scripts/lib/factionMap.ts` — `FACTION_MAP`, `SUB_FACTION_MAP`, `CROSS_FACTION_MAP`
- `scripts/data/aliases.json` — 44 entries confirmed
- `scripts/data/coverage-report.json` — current coverage state: 60.1% overall
- `package.json` — `build:udb` script confirmed

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — TypeScript/Node.js, no new dependencies
- Architecture: HIGH — all findings from direct code inspection, no assumptions about external systems
- Pitfalls: HIGH — all pitfalls identified from reading actual code, not hypothetical

**Research date:** 2026-06-02
**Valid until:** This research is valid until either script file is modified; re-read before implementing if > 7 days pass.

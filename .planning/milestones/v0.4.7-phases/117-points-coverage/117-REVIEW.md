---
phase: 117-points-coverage
reviewed: 2026-06-09T12:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - scripts/lib/parseCsv.ts
  - scripts/lib/types.ts
  - scripts/build-unit-db.ts
  - scripts/update-unit-database.ts
  - scripts/audit-faction.ts
findings:
  critical: 3
  warning: 5
  info: 2
  total: 10
status: issues_found
---

# Phase 117: Code Review Report

**Reviewed:** 2026-06-09T12:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the five pipeline scripts for Phase 117 (Points Coverage). The core parsing and type definitions are solid. However, `update-unit-database.ts` duplicates the entire build pipeline from `build-unit-db.ts` (~300 lines) and diverges in two correctness-critical ways: it omits deterministic sorting and French translation overlay. This means `--write` mode produces output that differs from `build-unit-db.ts` even with identical source data. Additionally, `extractModelCount` is fragile against descriptions containing non-count numbers, and the version hash excludes model stat profiles.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: update-unit-database.ts produces different output than build-unit-db.ts (missing sort)

**File:** `scripts/update-unit-database.ts:412-435`
**Issue:** `build-unit-db.ts` deterministically sorts all output arrays (factions, units, models, weapons, abilities, keywords, points, composition) at lines 699-723 before computing the content hash and writing JSON. `update-unit-database.ts` skips all sorting. Since the hash is computed over unsorted data, running `update-unit-database.ts --write` produces a different `version` hash and different JSON ordering than `build-unit-db.ts` for the exact same source CSVs. This breaks the stated invariant that the version hash detects data changes -- it will show a false diff on every comparison between the two scripts' outputs.
**Fix:** Extract the sorting logic into a shared function in `scripts/lib/` and call it from both scripts before hash computation. At minimum, add the same sort calls from `build-unit-db.ts` lines 699-723 into `buildUnitDatabase()` before the hash line.

### CR-02: update-unit-database.ts omits French translation overlay

**File:** `scripts/update-unit-database.ts:97-436`
**Issue:** `build-unit-db.ts` applies the French translation overlay (lines 527-572), populating `name_fr`, `description_fr`, and `keyword_fr` fields across factions, units, abilities, weapons, and keywords. `update-unit-database.ts` never calls `loadTranslationsFr()` or applies any overlay. When the update script writes output via `--write`, all `_fr` fields are `null`, silently regressing bilingual support. The diff comparison will also report false positives for every translated field.
**Fix:** Import and call `loadTranslationsFr()` in `buildUnitDatabase()` within `update-unit-database.ts`, applying the same overlay logic as `build-unit-db.ts` lines 534-571. Better yet, extract the entire build pipeline into a shared module to eliminate the duplication (see WR-01).

### CR-03: Version hash excludes model stat profiles

**File:** `scripts/build-unit-db.ts:730`
**File:** `scripts/update-unit-database.ts:414`
**Issue:** The SHA-256 content hash includes `factions, units, weapons, points, abilities, keywords, composition, detachments, detachmentAbilities, stratagems, enhancements` but omits `models`. If Wahapedia updates model stat lines (M, T, Sv, W, Ld, OC, inv_sv) without changing any other data, the version hash stays the same. The app's re-import detection will not trigger, leaving stale model profiles in the database.
**Fix:** Add `models` to the hash input object:
```typescript
const hash = createHash("sha256").update(JSON.stringify({
  factions, units, models, weapons, points, abilities, keywords,
  composition, detachments, detachmentAbilities, stratagems, enhancements
})).digest("hex").slice(0, 8);
```

## Warnings

### WR-01: ~300 lines of duplicated build pipeline between build-unit-db.ts and update-unit-database.ts

**File:** `scripts/update-unit-database.ts:97-436`
**Issue:** `buildUnitDatabase()` in `update-unit-database.ts` is a near-verbatim copy of the main pipeline in `build-unit-db.ts`. The two copies have already diverged (missing sort, missing French overlay, missing coverage report, missing validation checks). Every future pipeline change must be applied in both files or they drift further apart. This is a maintenance time bomb.
**Fix:** Extract the shared build pipeline into `scripts/lib/buildPipeline.ts` exporting a `buildUnitDatabase()` function. Both scripts import and call it, with `build-unit-db.ts` adding its coverage reporting/validation wrapper and `update-unit-database.ts` adding its diff/write logic.

### WR-02: extractModelCount sums ALL numbers in description, including non-count values

**File:** `scripts/lib/parseCsv.ts:50-56`
**Issue:** `extractModelCount` uses `/\d+/g` to find all numbers and sums them. Descriptions like "2 Annihilation Barge" would correctly return 2, but a description like "1 unit with 2+ save" would return 3 (1+2). While current Wahapedia cost descriptions appear to use a consistent "N models" pattern, any description containing ordinal numbers, stat references, or edition markers (e.g., "Mk X") will produce incorrect model counts. The fallback to `line` (tier index) for descriptions with no numbers is also suspect -- tier index 0 would mean 0 models.
**Fix:** Use a more targeted regex that matches the Wahapedia pattern of "N ModelName":
```typescript
export function extractModelCount(description: string, line: number): number {
  const numbers = description.match(/\b(\d+)\s+\w/g);
  if (numbers && numbers.length > 0) {
    return numbers.reduce((sum, match) => {
      const n = parseInt(match, 10);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }
  return Math.max(line, 1); // Ensure at least 1 model
}
```

### WR-03: Units with empty faction_id bypass faction validation

**File:** `scripts/build-unit-db.ts:165`
**File:** `scripts/update-unit-database.ts:139`
**Issue:** The guard `if (factionId && !factionIds.has(factionId))` short-circuits when `factionId` is falsy (empty string or undefined). A unit row with an empty `faction_id` column passes validation and is added with `faction_id: ""`. This creates orphan units that don't belong to any faction, won't appear in faction coverage reports, and may cause FK violations or UI errors downstream.
**Fix:** Treat empty `faction_id` as invalid:
```typescript
if (!factionId || !factionIds.has(factionId)) {
  console.warn(`WARNING: Skipping unit "${name}" — missing or unknown faction_id "${factionId}"`);
  continue;
}
```

### WR-04: Zero-cost tiers silently filtered out

**File:** `scripts/build-unit-db.ts:303`
**File:** `scripts/update-unit-database.ts:259`
**Issue:** `if (cost <= 0) continue;` filters out any cost row where `parseInt` returns 0 or NaN (via `|| 0`). If Wahapedia legitimately lists a 0-cost unit tier (e.g., free upgrade tiers or special formations), it would be silently dropped. More critically, if the `cost` CSV column contains non-numeric text, `parseInt` returns `NaN`, `|| 0` converts to 0, and the row is skipped without warning.
**Fix:** Log a warning for unparseable cost values and only skip truly empty/missing rows:
```typescript
const costRaw = row["cost"]?.trim() ?? "";
if (!costRaw) continue;
const cost = parseInt(costRaw, 10);
if (isNaN(cost)) {
  console.warn(`WARNING: Non-numeric cost "${costRaw}" for unit ${id}`);
  continue;
}
if (cost < 0) continue;
```

### WR-05: SUB_FACTION_MAP values are BSData catalogue labels, matched against Wahapedia keywords

**File:** `scripts/build-unit-db.ts:348-359`
**Issue:** `SUB_FACTION_MAP` was designed to map BSData catalogue names to sub-faction labels. The values (e.g., "Blood Angels", "Death Guard") are matched against Wahapedia keyword strings. This works only because Wahapedia keywords happen to include faction-name keywords matching these exact strings. If Wahapedia ever uses different keyword casing or a different label (e.g., "BLOOD ANGELS" in uppercase), the match silently fails and `sub_faction` remains null. The mapping is also incomplete for non-SM factions -- only SM chapters, Chaos warbands, and Aeldari sub-factions are covered.
**Fix:** Add a comment documenting this implicit dependency. Consider adding a validation step that logs a warning if any `SUB_FACTION_MAP` value doesn't appear in any keyword across the dataset, to catch silent breakage.

## Info

### IN-01: Duplicate comment line in loadTranslationsFr

**File:** `scripts/build-unit-db.ts:85-86`
**Issue:** The JSDoc comment "Returns null and emits a console.warn if the file is missing or malformed." is duplicated on consecutive lines.
**Fix:** Remove the duplicate line 86.

### IN-02: audit-faction.ts hardcoded to 3 factions only

**File:** `scripts/audit-faction.ts:204`
**Issue:** The script restricts input to `["SM", "NEC", "DG"]` and the `FACTION_NAMES` map only has entries for these three. This limits the audit tool's utility for other factions in the dataset. While this was intentional for Phase 113, it remains a limitation now that the pipeline handles all factions.
**Fix:** Either expand the allowed list or remove the restriction and fall back to `factionId` when a human-readable name isn't mapped.

---

_Reviewed: 2026-06-09T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

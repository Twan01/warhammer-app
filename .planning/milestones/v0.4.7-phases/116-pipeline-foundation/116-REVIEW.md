---
phase: 116-pipeline-foundation
reviewed: 2026-06-09T14:30:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - scripts/download-wahapedia.ts
  - scripts/lib/parseCsv.ts
  - scripts/build-unit-db.ts
  - scripts/update-unit-database.ts
  - tests/build-pipeline/parseCsv.test.ts
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 116: Code Review Report

**Reviewed:** 2026-06-09T14:30:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 116 introduced BOM-safe CSV parsing, a Wahapedia download script, Legends filtering, and name+faction deduplication. The core parser (`parseCsv.ts`) is well-tested and correct. However, `update-unit-database.ts` duplicates the entire build pipeline from `build-unit-db.ts` with **critical behavioral divergences** that produce incorrect diffs and non-deterministic hashes. The download script has a missing directory creation that will crash on first use on a fresh clone.

## Critical Issues

### CR-01: update-unit-database.ts omits sorting before hash -- non-deterministic version strings

**File:** `scripts/update-unit-database.ts:414`
**Issue:** `build-unit-db.ts` sorts all entity arrays (factions, units, models, weapons, abilities, keywords, points, composition) at lines 699-723 before computing the SHA-256 content hash at line 730. `update-unit-database.ts` computes the hash at line 414 WITHOUT any sorting. Since JavaScript `Map` iteration order depends on insertion order, and CSV row order may vary between downloads, the same logical data set produces different hashes from each script. This means:
1. `update-unit-database.ts --write` produces a version string that differs from `build-unit-db.ts` for identical data, making the "no changes detected" path unreachable when comparing against a `build-unit-db.ts`-produced file.
2. The diff report will always show spurious version changes, undermining trust in the update tool.

**Fix:** Add the same sorting block from `build-unit-db.ts` (lines 699-723) before the hash computation in `update-unit-database.ts`:
```typescript
// Before line 412 in update-unit-database.ts:
filteredFactions.sort((a, b) => a.id.localeCompare(b.id));
units.sort((a, b) => a.id.localeCompare(b.id));
models.sort((a, b) => {
  const c = a.unit_id.localeCompare(b.unit_id);
  return c !== 0 ? c : a.line_order - b.line_order;
});
weapons.sort((a, b) => {
  const c = a.unit_id.localeCompare(b.unit_id);
  if (c !== 0) return c;
  const g = a.weapon_group - b.weapon_group;
  return g !== 0 ? g : a.line_order - b.line_order;
});
abilities.sort((a, b) => {
  const c = a.unit_id.localeCompare(b.unit_id);
  return c !== 0 ? c : a.line_order - b.line_order;
});
keywords.sort((a, b) => {
  const c = a.unit_id.localeCompare(b.unit_id);
  return c !== 0 ? c : a.keyword.localeCompare(b.keyword);
});
points.sort((a, b) => {
  const c = a.unit_id.localeCompare(b.unit_id);
  return c !== 0 ? c : a.model_count - b.model_count;
});
composition.sort((a, b) => a.unit_id.localeCompare(b.unit_id));
```

### CR-02: update-unit-database.ts omits French translation overlay -- produces incorrect diffs

**File:** `scripts/update-unit-database.ts:97-436`
**Issue:** `build-unit-db.ts` loads and applies the French translation overlay (lines 527-572), populating `name_fr`, `keyword_fr`, `description_fr`, etc. on factions, units, abilities, weapons, and keywords. `update-unit-database.ts` never calls `loadTranslationsFr()` and never applies translations -- all `_fr` fields remain `null`. When the user runs `update-unit-database.ts` to compare against an existing `unit_database.json` built by `build-unit-db.ts`, every translated entity shows as "changed" in the diff, and writing with `--write` would regress all French translations to `null`.

**Fix:** Either extract `buildUnitDatabase()` into a shared module used by both scripts (preferred -- eliminates the entire duplication class of bugs), or add the French overlay logic to `update-unit-database.ts:buildUnitDatabase()`. The shared-module approach is strongly recommended given the magnitude of duplication.

## Warnings

### WR-01: download-wahapedia.ts does not create DATA_DIR if missing

**File:** `scripts/download-wahapedia.ts:24`
**Issue:** `DATA_DIR` is set to `scripts/data/` and the script calls `writeFileSync(dest, buffer)` at line 77 without checking or creating the directory. On a fresh clone (before any manual directory creation), every download will fail with `ENOENT`. The script prints a misleading `[error]` per file and exits with code 1, giving no hint that the directory simply doesn't exist.

**Fix:**
```typescript
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
// ...
// After line 24:
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}
```

### WR-02: extractModelCount matches digits inside non-count text

**File:** `scripts/lib/parseCsv.ts:51`
**Issue:** `extractModelCount` uses `/\d+/g` to find ALL digit sequences in the description and sums them. Wahapedia descriptions can contain non-count numbers -- e.g., `"2 Gravis-armoured models (T5)"` would extract `2 + 5 = 7` instead of the correct `2`. Any description referencing stat values, marks, or edition numbers will inflate the model count. This silently produces wrong `min_models`/`max_models` in the composition table and wrong `model_count` in points tiers.

**Fix:** Use a more targeted regex that only matches digit sequences preceding a word boundary (model name or "models"):
```typescript
export function extractModelCount(description: string, line: number): number {
  // Match numbers followed by a word (model name) or "model(s)"
  const numbers = description.match(/\b(\d+)\s+[A-Za-z]/g);
  if (numbers && numbers.length > 0) {
    return numbers.reduce((sum, match) => {
      const n = match.match(/\d+/);
      return sum + (n ? parseInt(n[0], 10) : 0);
    }, 0);
  }
  return line;
}
```
Alternatively, validate against actual Wahapedia descriptions to confirm the naive regex doesn't misfire on real data -- if parenthetical stats never appear in cost descriptions, the current approach may be safe in practice, but it remains fragile.

### WR-03: Massive code duplication between build-unit-db.ts and update-unit-database.ts

**File:** `scripts/update-unit-database.ts:97-436`
**Issue:** `update-unit-database.ts` contains a full copy of the build pipeline from `build-unit-db.ts` (~340 lines). The two copies have already drifted: the update script is missing sorting (CR-01), French overlay (CR-02), coverage report generation, and the `MIN_COVERAGE_PCT` validation gate. Any future change to the build pipeline must be applied to both files or they will silently diverge further. This is the root cause of CR-01 and CR-02.

**Fix:** Extract the shared build pipeline into a common function in a new `scripts/lib/buildPipeline.ts` module. Both `build-unit-db.ts` and `update-unit-database.ts` should import and call this shared function. The build script would add coverage reporting and validation on top; the update script would add diff computation and optional write.

### WR-04: Dedup pass silently discards units with potentially important differences

**File:** `scripts/build-unit-db.ts:186-202` and `scripts/update-unit-database.ts:159-176`
**Issue:** The dedup pass uses `name.toLowerCase() + ":" + faction_id` as the key and keeps only the first occurrence. When two units share a name and faction but have different Wahapedia IDs (e.g., different datasheets for the same unit name at different points costs), the "first" one wins based on CSV row order. The discarded unit's ID is logged as a warning but:
1. The choice of which to keep is arbitrary (depends on CSV ordering from Wahapedia).
2. Related data (models, weapons, abilities, keywords, points) keyed by the discarded unit's ID is silently orphaned -- it passes the `validUnitIds` filter since the ID was added before dedup, but the unit itself is removed.

Actually, the code rebuilds `validUnitIds` at lines 201-202 after dedup, so orphaned child data IS excluded. But the arbitrary winner selection remains a concern -- a newer/corrected datasheet could be discarded in favor of an older one.

**Fix:** Log the IDs of both the kept and discarded unit so operators can audit. Consider preferring the unit with more associated data (points, models) or the one with the higher/newer ID, rather than relying on CSV row order.

## Info

### IN-01: Duplicate comment line in build-unit-db.ts

**File:** `scripts/build-unit-db.ts:85`
**Issue:** Line 85 is an exact duplicate of line 84: `* Returns null and emits a console.warn if the file is missing or malformed.`

**Fix:** Remove line 85.

### IN-02: Unused variable `unitByNameFaction` in update-unit-database.ts

**File:** `scripts/update-unit-database.ts:180-183`
**Issue:** `unitByNameFaction` is constructed at lines 180-183 but never referenced anywhere in the file. It builds a Map that duplicates the `dedupMap` logic and consumes memory for no purpose.

**Fix:** Remove lines 180-183.

---

_Reviewed: 2026-06-09T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

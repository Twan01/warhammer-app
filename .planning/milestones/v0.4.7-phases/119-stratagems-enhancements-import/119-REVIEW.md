---
phase: 119-stratagems-enhancements-import
reviewed: 2026-06-09T12:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src-tauri/migrations/043_udb_stratagems_enhancements.sql
  - scripts/lib/types.ts
  - scripts/build-unit-db.ts
  - scripts/update-unit-database.ts
  - src-tauri/src/lib.rs
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 119: Code Review Report

**Reviewed:** 2026-06-09T12:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 119 adds `udb_stratagems` and `udb_enhancements` tables via migration 043, extends both TypeScript build scripts to parse Stratagems.csv and Enhancements.csv, adds shared type interfaces, and extends the Rust importer with INSERT blocks for both new entity types. The migration DDL is well-structured with appropriate indexes. The Rust importer correctly handles nullable FKs via `str_val()` which maps empty/missing values to `Option::None` (SQL NULL). The TypeScript types accurately model the nullable FK semantics.

The primary data integrity gap is that the build pipeline does not validate `faction_id` or `detachment_id` FK references for stratagems and enhancements against known entities, unlike all other entity types which are validated. The deterministic output sorting (BPH-02) was not extended to cover the new arrays, and the update-tool diff report has no visibility into stratagem/enhancement changes.

## Critical Issues

### CR-01: Stratagem and enhancement FK references (faction_id, detachment_id) are not validated against known entities

**File:** `scripts/build-unit-db.ts:625-643` and `scripts/build-unit-db.ts:652-674`
**Issue:** The build pipeline validates `faction_id` references for units (line 165-166) and detachment abilities (line 594) against the `factionIds` set, skipping rows with unknown factions. However, the stratagem parsing (step 12) and enhancement parsing (step 13) perform no equivalent validation. A stratagem or enhancement that references a faction pruned as "empty" (line 384), or a `detachment_id` not present in the `seenDetachmentIds` set, will be written to the JSON with orphaned FK references.

The Rust importer runs with `PRAGMA foreign_keys = OFF` during the transaction (line 590), so these orphaned references are silently inserted. After commit, FK enforcement is restored (line 903), but the invalid data is already persisted. Any subsequent `PRAGMA foreign_key_check` will report violations, and JOIN queries against `udb_factions` or `udb_detachments` will silently drop these rows.

The same gap exists in `update-unit-database.ts:354-399` which duplicates the parsing logic.
**Fix:**
```typescript
// In the stratagems loop (build-unit-db.ts ~line 631), after Legends filter:
const fid = row["faction_id"]?.trim() || null;
const did = row["detachment_id"]?.trim() || null;

if (fid && !factionIds.has(fid)) {
  console.warn(`  WARNING: Skipping stratagem "${name}" — unknown faction_id "${fid}"`);
  continue;
}
if (did && !seenDetachmentIds.has(did)) {
  console.warn(`  WARNING: Stratagem "${name}" has unknown detachment_id "${did}" — nullifying`);
  // Set to null to avoid FK violation
}

stratagems.push({
  id,
  faction_id: fid,
  detachment_id: did && seenDetachmentIds.has(did) ? did : null,
  // ...
});
```
Apply the identical pattern to the enhancements loop and to both loops in `update-unit-database.ts`.

## Warnings

### WR-01: Stratagems and enhancements arrays are not sorted before output -- breaks deterministic output guarantee

**File:** `scripts/build-unit-db.ts:699-723`
**Issue:** All existing entity arrays are sorted deterministically before the content hash is computed (BPH-02, lines 699-723). The new `stratagems` and `enhancements` arrays are included in the hash computation (line 730) but are NOT sorted. This means the content hash and JSON output order depend on the CSV row ordering from Wahapedia. If Wahapedia reorders rows without changing data, the hash changes, triggering an unnecessary re-import on every app launch (the version check at `lib.rs:579` will see a different version string).
**Fix:**
```typescript
// Add after composition sort (line 723):
stratagems.sort((a, b) => a.id.localeCompare(b.id));
enhancements.sort((a, b) => a.id.localeCompare(b.id));
```

### WR-02: update-unit-database.ts diff report has no coverage for stratagems or enhancements

**File:** `scripts/update-unit-database.ts:441-566`
**Issue:** The `computeDiff` function compares units, points, abilities, and keywords between old and new databases. There is no logic to detect added, removed, or changed stratagems or enhancements. The `totalChanges` counter (line 583-588) will report 0 changes and the tool will print "No changes detected" even when stratagem CP costs changed or enhancements were added/removed. This defeats the purpose of the update tool for the newly imported data types.
**Fix:** Extend `DiffReport` with `stratagemChanges` and `enhancementChanges` fields. Add comparison logic following the existing keyword/ability pattern. Include the new counts in `totalChanges` and add formatted sections in `formatReport`.

### WR-03: Massive code duplication between build-unit-db.ts and update-unit-database.ts

**File:** `scripts/update-unit-database.ts:97-436`
**Issue:** `buildUnitDatabase()` in `update-unit-database.ts` is a near-complete copy of `main()` in `build-unit-db.ts` (~340 lines of duplicated parsing logic). Phase 119 extended this duplication by copy-pasting the new stratagem/enhancement blocks into both files. Any future bug fix (including the fixes for CR-01 and WR-01 above) must be applied in both places. The scripts have already diverged: `build-unit-db.ts` applies a French translation overlay (lines 527-572) and runs coverage validation, while `update-unit-database.ts` does neither.
**Fix:** Extract the shared CSV-to-JSON build pipeline into a common module (e.g., `scripts/lib/buildPipeline.ts`) that both scripts import and extend.

## Info

### IN-01: Duplicate JSDoc comment line in loadTranslationsFr

**File:** `scripts/build-unit-db.ts:85-86`
**Issue:** The JSDoc comment for `loadTranslationsFr` has line 85 and line 86 both reading: "Returns null and emits a console.warn if the file is missing or malformed." This is a copy-paste artifact.
**Fix:** Remove the duplicated line 86.

---

_Reviewed: 2026-06-09T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

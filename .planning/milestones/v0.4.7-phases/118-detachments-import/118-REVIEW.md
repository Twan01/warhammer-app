---
phase: 118-detachments-import
reviewed: 2026-06-09T12:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src-tauri/migrations/042_udb_detachments.sql
  - scripts/lib/types.ts
  - scripts/build-unit-db.ts
  - scripts/update-unit-database.ts
  - src-tauri/src/lib.rs
findings:
  critical: 2
  warning: 3
  info: 1
  total: 6
status: issues_found
---

# Phase 118: Code Review Report

**Reviewed:** 2026-06-09T12:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 118 adds detachment and detachment ability import to the Wahapedia pipeline: a new migration (042), TypeScript types, CSV parsing in both build scripts, and Rust INSERT/DELETE blocks. The migration DDL and Rust importer are structurally sound. However, there are two critical issues: (1) the migration schema defines `description` as nullable but the TypeScript type declares it as non-nullable `string`, creating a type-schema mismatch that silently drops empty descriptions into NULLs via `str_val`; (2) the `detachments` and `detachment_abilities` arrays are not sorted before the deterministic hash computation, breaking the stated determinism guarantee that other entity arrays already satisfy.

## Critical Issues

### CR-01: Detachments and detachment_abilities not sorted before hash computation

**File:** `scripts/build-unit-db.ts:696-730`
**Issue:** Lines 699-723 explicitly sort `factions`, `units`, `models`, `weapons`, `abilities`, `keywords`, `points`, and `composition` for deterministic output (comment says "Sort BEFORE hash computation so the hash itself is deterministic"). However, `detachments`, `detachmentAbilities`, `stratagems`, and `enhancements` are NOT sorted. Since the hash at line 730 includes all of these arrays, the version hash is non-deterministic -- it depends on CSV row ordering, which Wahapedia does not guarantee. This means identical data can produce different version hashes, causing unnecessary full re-imports on every app launch (the version-skip check at lib.rs:579 will fail when the hash differs).
**Fix:**
```typescript
// Add after line 723 (after composition sort):
detachments.sort((a, b) => a.id.localeCompare(b.id));
detachmentAbilities.sort((a, b) => a.id.localeCompare(b.id));
stratagems.sort((a, b) => a.id.localeCompare(b.id));
enhancements.sort((a, b) => a.id.localeCompare(b.id));
```

### CR-02: Same missing sort in update-unit-database.ts

**File:** `scripts/update-unit-database.ts:412-414`
**Issue:** The `buildUnitDatabase()` function in `update-unit-database.ts` does not sort ANY arrays before computing the content hash (line 414). While `build-unit-db.ts` at least sorts the original 8 arrays, this script sorts none. This means the version hash from `update-unit-database.ts` will differ from `build-unit-db.ts` for identical data, and the diff report will always show "version changed" even when data is identical.
**Fix:**
Add the same sorting block (all 12 arrays) before the `crypto.createHash` call at line 414 in `update-unit-database.ts`, matching the sorting from `build-unit-db.ts`.

## Warnings

### WR-01: Type/schema mismatch -- UdbDetachmentAbilityRow.description is non-nullable but DB column is nullable

**File:** `scripts/lib/types.ts:100` and `src-tauri/migrations/042_udb_detachments.sql:16`
**Issue:** The migration defines `description TEXT` (nullable -- no NOT NULL constraint) on `udb_detachment_abilities`. The TypeScript type `UdbDetachmentAbilityRow` declares `description: string` (non-nullable). In the Rust importer (lib.rs:814), `str_val(row, "description")` returns `Option<String>` -- if description is empty string, `str_val` filters it to `None` and inserts NULL. This is inconsistent: the TypeScript pipeline guarantees a string (defaulting to `""` via `?? ""`), but the Rust importer can insert NULL. Any downstream queries expecting non-null description will get unexpected NULLs.
**Fix:** Either add `NOT NULL` to the migration column (matching the stratagems/enhancements pattern in migration 043 which has `description TEXT NOT NULL`), or change the Rust INSERT to use `str_val(row, "description").unwrap_or_default()` like it does for `name`.

### WR-02: Detachment name derived from "first occurrence wins" may be inconsistent

**File:** `scripts/build-unit-db.ts:599-602`
**Issue:** Detachments are derived from the `Detachment_abilities.csv` by collecting unique `detachment_id` values, taking the `detachment` column name from the first row encountered. If the CSV is unordered and different rows for the same detachment_id have different values in the `detachment` column (e.g., due to typos or encoding differences in Wahapedia data), the name stored depends on CSV row order. The same concern exists in `update-unit-database.ts:331-334`.
**Fix:** Consider logging a warning when a detachment_id is seen again with a different `detachment` name value, so data inconsistencies are surfaced during build.

### WR-03: Redundant factionId truthiness check after non-empty guard

**File:** `scripts/build-unit-db.ts:594`
**Issue:** Line 592 already checks `if (!detachmentId || !factionId || !abilityId || !abilityName) continue;` which ensures `factionId` is truthy. Line 594 then checks `if (factionId && !factionIds.has(factionId))` -- the `factionId &&` guard is redundant since we already `continue`d when it was falsy. This is not a bug but is misleading dead logic that could confuse future maintainers. Same pattern at line 326 in `update-unit-database.ts`.
**Fix:** Simplify to `if (!factionIds.has(factionId))`.

## Info

### IN-01: Duplicated comment line in loadTranslationsFr docstring

**File:** `scripts/build-unit-db.ts:85-86`
**Issue:** The docstring for `loadTranslationsFr()` contains a duplicated line: "Returns null and emits a console.warn if the file is missing or malformed." appears twice.
**Fix:** Remove line 86.

---

_Reviewed: 2026-06-09T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
